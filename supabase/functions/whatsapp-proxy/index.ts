import { serve } from "https://deno.land/std@0.201.0/http/server.ts";

const META_ACCESS_TOKEN = Deno.env.get("META_ACCESS_TOKEN") || "";
const META_WABA_ID = Deno.env.get("META_WABA_ID") || "";
const META_PHONE_NUMBER_ID = Deno.env.get("META_PHONE_NUMBER_ID") || "";
const WHATSAPP_API_KEY = Deno.env.get("WHATSAPP_API_KEY") || ""; // simple auth header check
// Optional: allow the project's publishable key for short-lived verification/testing.
// Read publishable key from either SUPABASE_PUBLISHABLE_KEY, VITE_SUPABASE_PUBLISHABLE_KEY, or fallback to PUBLISHABLE_KEY
const SUPABASE_PUBLISHABLE_KEY = Deno.env.get("SUPABASE_PUBLISHABLE_KEY") || Deno.env.get("VITE_SUPABASE_PUBLISHABLE_KEY") || Deno.env.get("PUBLISHABLE_KEY") || "";
const SUPABASE_URL = (Deno.env.get("SUPABASE_URL") || Deno.env.get("VITE_SUPABASE_URL") || "").replace(/\/$/, "");
const WHATSAPP_ALLOWED_ORIGIN = Deno.env.get("WHATSAPP_ALLOWED_ORIGIN") || "*";

// Rate limiting (simple in-memory, best-effort for serverless cold starts)
const RATE_LIMIT_WINDOW_MS = Number(Deno.env.get("RATE_LIMIT_WINDOW_MS") || "60000");
const RATE_LIMIT_MAX = Number(Deno.env.get("RATE_LIMIT_MAX") || "60");
const rateMap = new Map<string, { count: number; resetAt: number }>();
const DRY_RUN = (Deno.env.get("DRY_RUN") || "false").toLowerCase() === "true";

function now() { return Date.now(); }

function log(level: string, msg: string, meta: Record<string, unknown> = {}) {
  const entry = Object.assign({ ts: new Date().toISOString(), level, msg }, meta);
  console.log(JSON.stringify(entry));
}

function jsonResponse(data: unknown, status = 200, extraHeaders: Record<string, string> = {}) {
  const headers: Record<string, string> = Object.assign({
    "content-type": "application/json",
    "Access-Control-Allow-Origin": WHATSAPP_ALLOWED_ORIGIN,
    "Vary": "Origin",
    "Access-Control-Expose-Headers": "X-RateLimit-Limit, X-RateLimit-Remaining"
  }, extraHeaders);
  return new Response(JSON.stringify(data), { status, headers });
}

async function fetchGraph(path: string, opts?: RequestInit) {
  const url = `https://graph.facebook.com/v24.0/${path}`;
  const headers = Object.assign({}, opts?.headers || {});
  if (!headers["Authorization"]) headers["Authorization"] = `Bearer ${META_ACCESS_TOKEN}`;
  const r = await fetch(url, Object.assign({}, opts, { headers }));
  const text = await r.text();
  try { return { ok: r.ok, status: r.status, body: JSON.parse(text) }; } catch (_) { return { ok: r.ok, status: r.status, body: text }; }
}

async function fetchGraphWithRetry(path: string, opts?: RequestInit, maxAttempts = 3) {
  let attempt = 0;
  let lastErr: any = null;
  while (attempt < maxAttempts) {
    attempt++;
    try {
      const res = await fetchGraph(path, opts);
      if (res.ok) {
        log("info", "graph api success", { path, status: res.status });
        return res;
      }
      // retry on 429 or 5xx
      if (res.status === 429 || (res.status >= 500 && res.status < 600)) {
        const backoff = Math.pow(2, attempt) * 100 + Math.floor(Math.random() * 100);
        log("warn", "graph api retry", { path, status: res.status, attempt, backoff });
        await new Promise((r) => setTimeout(r, backoff));
        continue;
      }
      return res;
    } catch (err) {
      lastErr = err;
      const backoff = Math.pow(2, attempt) * 100 + Math.floor(Math.random() * 100);
      log("error", "fetchGraph error, retrying", { err: String(err), attempt, backoff });
      await new Promise((r) => setTimeout(r, backoff));
    }
  }
  return { ok: false, status: 500, body: { error: "fetch failed", detail: String(lastErr) } };
}

serve(async (req: Request) => {
  try {
    const url = new URL(req.url);
    let path = url.pathname.replace(/\/+/g, "/").replace(/^\//, "");

    // Normalize when the platform includes the function name in the path (e.g. "whatsapp-proxy/templates")
    const FN_PREFIX = "whatsapp-proxy";
    if (path === FN_PREFIX) path = "";
    if (path.startsWith(`${FN_PREFIX}/`)) path = path.replace(new RegExp(`^${FN_PREFIX}/`), "");

    // (removed dev-only debug endpoints and pre-authorization)

    // Map common local/proxy paths to function routes (client expects /api/whatsapp/*)
    if (path === "api/whatsapp" || path === "api/whatsapp/") path = "";
    if (path.startsWith("api/whatsapp/")) path = path.replace(/^api\/whatsapp\//, "");

    // Handle CORS preflight quickly before auth so browsers can call the function
    if (req.method === "OPTIONS") {
      // Allow any headers requested by the browser in preflight, while ensuring
      // the core headers we require are always allowed. This prevents failures
      // when `supabase-js` or other clients send additional headers like
      // `x-client-info`.
      const requested = req.headers.get('access-control-request-headers') || '';
      const defaults = 'Content-Type, Authorization, apikey, x-api-key';
      const allowHeaders = requested ? `${defaults}, ${requested}` : defaults;
      const preflightHeaders: Record<string, string> = {
        "Access-Control-Allow-Origin": WHATSAPP_ALLOWED_ORIGIN,
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": allowHeaders,
        "Access-Control-Max-Age": "86400",
        "Vary": "Origin"
      };
      return new Response(null, { status: 204, headers: preflightHeaders });
    }

    // Simple API key protection: check header `x-api-key` OR verify Supabase access token
    const incomingKey = req.headers.get("x-api-key") || "";
    const authHeader = req.headers.get("authorization") || "";
    let authorized = false;
    let authUser: any = null;
    let authErrorDetail: any = null;
    if (WHATSAPP_API_KEY && incomingKey === WHATSAPP_API_KEY) {
      authorized = true;
    } else {
      // No dev fallbacks here; verify incoming API key or JWT below.
      if (!authorized && authHeader && SUPABASE_PUBLISHABLE_KEY && SUPABASE_URL) {
      try {
        const tokenVal = authHeader.replace(/^Bearer\s+/i, "");
        const u = `${SUPABASE_URL}/auth/v1/user`;
        const headers = new Headers();
        headers.set('Authorization', authHeader);
        headers.set('authorization', authHeader);
        headers.set('apikey', SUPABASE_PUBLISHABLE_KEY);
        log("debug", "supabase verify request prepared", { url: u, auth_preview: authHeader ? `${authHeader.slice(0,10)}...${authHeader.slice(-6)}` : null });
        let r = await fetch(u, { headers });
        let text = await r.text().catch(() => null);
        let parsed = null;
        try { parsed = text ? JSON.parse(text) : null; } catch (_) { parsed = text; }
        // If Supabase complains about missing authorization header, retry with access_token query param
        if (!r.ok && parsed && typeof parsed === 'object' && (parsed.message === 'Missing authorization header' || (parsed.error && parsed.error === 'missing authorization header'))) {
          const retryUrl = `${SUPABASE_URL}/auth/v1/user?access_token=${encodeURIComponent(tokenVal)}`;
          log("warn", "supabase verify retry with access_token query param", { retryUrl });
          const retryHeaders = new Headers();
          retryHeaders.set('apikey', SUPABASE_PUBLISHABLE_KEY);
          r = await fetch(retryUrl, { headers: retryHeaders });
          text = await r.text().catch(() => null);
          try { parsed = text ? JSON.parse(text) : null; } catch (_) { parsed = text; }
        }
        if (r.ok) {
          authorized = true;
          authUser = parsed;
        } else {
          authErrorDetail = { status: r.status, body: parsed };
          log("warn", "supabase jwt verify failed", { status: r.status, body: parsed });
        }
      } catch (e) {
        log("warn", "supabase auth verify failed", { err: String(e) });
      }
      }
    }
    if (!authorized) {
      log("warn", "unauthorized access attempt", { incomingKey, path, authErrorDetail });
      const debugInfo: Record<string, unknown> = {
        publishable_key_set: !!SUPABASE_PUBLISHABLE_KEY,
        supabase_url: SUPABASE_URL || null,
      };
      if (authHeader) {
        const preview = authHeader.length > 20 ? `${authHeader.slice(0, 10)}...${authHeader.slice(-6)}` : authHeader;
        debugInfo.auth_header_preview = preview;
      }
      const body = authErrorDetail
        ? { code: authErrorDetail.status, message: authErrorDetail.body, debug: debugInfo }
        : { error: "unauthorized", debug: debugInfo };
      return jsonResponse(body, 401);
    }

    // Rate limiting: scoped by API key + (forwarded) IP
    const ip = req.headers.get("x-forwarded-for") || req.headers.get("cf-connecting-ip") || "unknown";
    const rateKey = (authUser?.id ? `user:${authUser.id}` : incomingKey) + `|${ip}`;
    const entry = rateMap.get(rateKey);
    const nowTs = now();
    let remaining = RATE_LIMIT_MAX;
    if (!entry || entry.resetAt <= nowTs) {
      rateMap.set(rateKey, { count: 1, resetAt: nowTs + RATE_LIMIT_WINDOW_MS });
      remaining = RATE_LIMIT_MAX - 1;
    } else {
      entry.count++;
      remaining = Math.max(0, RATE_LIMIT_MAX - entry.count);
      rateMap.set(rateKey, entry);
      if (entry.count > RATE_LIMIT_MAX) {
        log("warn", "rate limit exceeded", { rateKey, count: entry.count });
        return jsonResponse({ error: "rate_limit_exceeded" }, 429, { "X-RateLimit-Limit": String(RATE_LIMIT_MAX), "X-RateLimit-Remaining": "0" });
      }
    }

    // Health
    if (req.method === "GET" && path === "health") {
      log("info", "health check", { path, dry_run: DRY_RUN });
      return jsonResponse({ status: "ok", now: new Date().toISOString(), dry_run: DRY_RUN }, 200, { "X-RateLimit-Limit": String(RATE_LIMIT_MAX), "X-RateLimit-Remaining": String(remaining) });
    }

    if (req.method === "GET" && path === "templates") {
      if (!META_WABA_ID) return jsonResponse({ error: "META_WABA_ID not set" }, 500);
      const q = url.searchParams.toString();
      const listPath = `${META_WABA_ID}/message_templates${q ? `?${q}` : ""}`;
      log("info", "templates requested", { listPath, dry_run: DRY_RUN });
      if (DRY_RUN) {
        return jsonResponse({ data: [], dry_run: true }, 200, { "X-RateLimit-Limit": String(RATE_LIMIT_MAX), "X-RateLimit-Remaining": String(remaining) });
      }
      const res = await fetchGraphWithRetry(listPath, { method: "GET" });
      return jsonResponse(res.body, res.status, { "X-RateLimit-Limit": String(RATE_LIMIT_MAX), "X-RateLimit-Remaining": String(remaining) });
    }

    if (req.method === "GET" && path.startsWith("templates/")) {
      if (!META_WABA_ID) return jsonResponse({ error: "META_WABA_ID not set" }, 500);
      const name = decodeURIComponent(path.replace(/^templates\//, ""));
      const language = url.searchParams.get("language") || "en_US";
      const listPath = `${META_WABA_ID}/message_templates?name=${encodeURIComponent(name)}&language=${encodeURIComponent(language)}`;
      const res = await fetchGraphWithRetry(listPath, { method: "GET" });
      return jsonResponse(res.body, res.status, { "X-RateLimit-Limit": String(RATE_LIMIT_MAX), "X-RateLimit-Remaining": String(remaining) });
    }

    if (req.method === "POST" && path === "send") {
      const body = await req.json().catch(() => null);
      if (!body) return jsonResponse({ error: "invalid json" }, 400);

      const { to, template, language, components } = body;
      // Basic input validation
      const phoneRE = /^\+\d{7,15}$/; // E.164 approx
      const templateRE = /^[a-zA-Z0-9_\-\.]+$/;
      if (!to || !template) return jsonResponse({ error: "missing to/template" }, 400);
      if (!phoneRE.test(to)) return jsonResponse({ error: "invalid phone format, expect E.164" }, 400);
      if (!templateRE.test(template)) return jsonResponse({ error: "invalid template name" }, 400);
      if (!META_PHONE_NUMBER_ID || !META_ACCESS_TOKEN) return jsonResponse({ error: "server misconfigured" }, 500);

      // Build template payload (components should be supplied as needed by the caller)
      const payload: any = {
        messaging_product: "whatsapp",
        to,
        type: "template",
        template: {
          name: template,
          language: { code: language || "en_US" },
          components: components || []
        }
      };

      log("info", "sending template", { to, template, apiKey: incomingKey });
      if (DRY_RUN) {
        log("info", "dry-run: not sending to Meta", { to, template, payload });
        return jsonResponse({ ok: true, dry_run: true, payload }, 200, { "X-RateLimit-Limit": String(RATE_LIMIT_MAX), "X-RateLimit-Remaining": String(remaining) });
      }

      const res = await fetchGraphWithRetry(`${META_PHONE_NUMBER_ID}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      return jsonResponse(res.body, res.status, { "X-RateLimit-Limit": String(RATE_LIMIT_MAX), "X-RateLimit-Remaining": String(remaining) });
    }

    return jsonResponse({ ok: true, message: "whatsapp-proxy edge: alive" }, 200, { "X-RateLimit-Limit": String(RATE_LIMIT_MAX), "X-RateLimit-Remaining": String(remaining) });
  } catch (err) {
    log("error", "edge error", { err: String(err) });
    return jsonResponse({ error: "internal" }, 500);
  }
});
