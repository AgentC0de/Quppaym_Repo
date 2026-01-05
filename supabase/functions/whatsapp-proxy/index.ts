import { serve } from "https://deno.land/std@0.201.0/http/server.ts";

const META_ACCESS_TOKEN = Deno.env.get("META_ACCESS_TOKEN") || "";
const META_WABA_ID = Deno.env.get("META_WABA_ID") || "";
const META_PHONE_NUMBER_ID = Deno.env.get("META_PHONE_NUMBER_ID") || "";
const WHATSAPP_API_KEY = Deno.env.get("WHATSAPP_API_KEY") || ""; // simple auth header check
const WHATSAPP_ALLOWED_ORIGIN = Deno.env.get("WHATSAPP_ALLOWED_ORIGIN") || "*";

// Rate limiting (simple in-memory, best-effort for serverless cold starts)
const RATE_LIMIT_WINDOW_MS = Number(Deno.env.get("RATE_LIMIT_WINDOW_MS") || "60000");
const RATE_LIMIT_MAX = Number(Deno.env.get("RATE_LIMIT_MAX") || "60");
const rateMap = new Map<string, { count: number; resetAt: number }>();

function now() { return Date.now(); }

function log(level: string, msg: string, meta: Record<string, unknown> = {}) {
  const entry = Object.assign({ ts: new Date().toISOString(), level, msg }, meta);
  console.log(JSON.stringify(entry));
}

function jsonResponse(data: unknown, status = 200, extraHeaders: Record<string, string> = {}) {
  const headers: Record<string, string> = Object.assign({ "content-type": "application/json", "Access-Control-Allow-Origin": WHATSAPP_ALLOWED_ORIGIN }, extraHeaders);
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
      if (res.ok) return res;
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
    const path = url.pathname.replace(/\/+/g, "/").replace(/^\//, "");

    // Simple API key protection: check header `x-api-key`
    const incomingKey = req.headers.get("x-api-key") || "";
    if (!WHATSAPP_API_KEY || incomingKey !== WHATSAPP_API_KEY) {
      log("warn", "unauthorized access attempt", { incomingKey, path });
      return jsonResponse({ error: "unauthorized" }, 401);
    }

    // Rate limiting: scoped by API key + (forwarded) IP
    const ip = req.headers.get("x-forwarded-for") || req.headers.get("cf-connecting-ip") || "unknown";
    const rateKey = `${incomingKey}|${ip}`;
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
      return jsonResponse({ status: "ok", now: new Date().toISOString() }, 200, { "X-RateLimit-Limit": String(RATE_LIMIT_MAX), "X-RateLimit-Remaining": String(remaining) });
    }

    if (req.method === "GET" && path === "templates") {
      if (!META_WABA_ID) return jsonResponse({ error: "META_WABA_ID not set" }, 500);
      const q = url.searchParams.toString();
      const listPath = `${META_WABA_ID}/message_templates${q ? `?${q}` : ""}`;
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
