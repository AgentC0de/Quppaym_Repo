import { supabase } from "@/integrations/supabase/client";

export async function waFetch(input: string, init?: RequestInit) {
  const headers: Record<string, string> = Object.assign({}, init?.headers || {});
  try {
    const sessionRes = await supabase.auth.getSession();
    const token = sessionRes?.data?.session?.access_token;
    if (token) headers["Authorization"] = `Bearer ${token}`;
  } catch (e) {
    // ignore: we'll call without auth if session not available
  }
  try {
    if (import.meta.env.DEV && typeof window !== 'undefined') {
      const host = window.location.hostname;
      if (host === 'localhost' || host === '127.0.0.1') {
        const pub = (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string) || (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string);
        if (pub) headers['x-api-key'] = pub;
      }
    }
  } catch (e) {
    // ignore
  }

  try {
    const pub = (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string) || "";
    if (pub) {
      if (!headers["apikey"]) headers["apikey"] = pub;
      if (!headers["x-api-key"]) headers["x-api-key"] = pub;
    }
  } catch (e) {
    // ignore
  }

  if (!headers["Content-Type"]) headers["Content-Type"] = "application/json";

  try {
    const fnUrl = (import.meta.env.VITE_SUPABASE_URL as string) || '';
    const invokedPath = '/functions/v1/whatsapp-proxy';
    if (typeof input === 'string' && (input.includes(invokedPath) || (fnUrl && input.includes(fnUrl) && input.includes(invokedPath)))) {
      const isSubpath = typeof input === 'string' && input.includes(`${invokedPath}/api/whatsapp`);
      if (!isSubpath) {
        try {
          const method = (init && init.method) || 'POST';
          const body = init && init.body ? init.body : undefined;
          const invokeRes: any = await supabase.functions.invoke('whatsapp-proxy', { method, body });
          if (invokeRes instanceof Response) return invokeRes;
          if (invokeRes && invokeRes.error) {
            const txt = JSON.stringify(invokeRes.error);
            return new Response(txt, { status: invokeRes.error.status || 500, headers: { 'Content-Type': 'application/json' } });
          }
          const txt = invokeRes && invokeRes.data ? JSON.stringify(invokeRes.data) : JSON.stringify(invokeRes);
          return new Response(txt, { status: 200, headers: { 'Content-Type': 'application/json' } });
        } catch (e) {
          return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { 'Content-Type': 'application/json' } });
        }
      }
    }
  } catch (e) {
    // fall through to normal fetch
  }

  const res = await fetch(input, Object.assign({}, init, { headers }));
  return res;
}

export default waFetch;
