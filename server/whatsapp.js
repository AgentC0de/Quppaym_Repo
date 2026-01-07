import express from "express";
import fetch from "node-fetch";
import dotenv from "dotenv";
import cors from "cors";
import fs from "fs";

dotenv.config();

const app = express();
app.use(express.json());

// CORS configuration:
// - In production, restrict origin via `VITE_WA_ALLOWED_ORIGIN`.
// - In development, allow all origins to simplify testing (preflight allowed).
if (process.env.NODE_ENV === "production") {
  const allowedOrigin = process.env.VITE_WA_ALLOWED_ORIGIN || "http://localhost:8080";
  app.use(cors({ origin: allowedOrigin, methods: ["GET", "POST", "OPTIONS"], credentials: true }));
} else {
  app.use(cors());
}

const PHONE_ID = process.env.META_PHONE_NUMBER_ID;
const ACCESS_TOKEN = process.env.META_ACCESS_TOKEN;

// Optional: proxy to Supabase Edge Function instead of calling Meta directly.
const USE_SERVERLESS_PROXY = (process.env.USE_SERVERLESS_PROXY || "false").toLowerCase() === "true";
const WA_FUNCTION_URL = process.env.WA_FUNCTION_URL || process.env.VITE_WA_PROXY_URL || "";
const WHATSAPP_API_KEY = process.env.WHATSAPP_API_KEY || process.env.WA_PROXY_API_KEY || "";

if (!PHONE_ID || !ACCESS_TOKEN) {
  console.warn("META_PHONE_NUMBER_ID or META_ACCESS_TOKEN not set");
}

app.post("/api/whatsapp/send", async (req, res) => {
  try {
    const { to, template, language, components } = req.body;
    // Log incoming request for debugging
    try {
      fs.appendFileSync("server/wa-proxy.log", `REQUEST ${new Date().toISOString()} ${JSON.stringify(req.body)}\n`);
    } catch (e) {
      console.error("Failed to write proxy log request:", e);
    }

    if (!to || !template) {
      try { fs.appendFileSync("server/wa-proxy.log", `BAD_REQUEST ${new Date().toISOString()} missing to/template ${JSON.stringify(req.body)}\n`); } catch (e) { /* noop */ }
      return res.status(400).json({ error: "Missing 'to' or 'template'" });
    }

    const body = {
      messaging_product: "whatsapp",
      to,
      type: "template",
      template: {
        name: template,
        language: { code: language || process.env.VITE_META_DEFAULT_TEMPLATE_LANG || "en" },
        components: components || []
      }
    };

    // If configured, forward the request to the Supabase Edge Function (serverless) instead
    if (USE_SERVERLESS_PROXY && WA_FUNCTION_URL) {
      try {
        fs.appendFileSync("server/wa-proxy.log", `FORWARD ${new Date().toISOString()} forward_to=${WA_FUNCTION_URL}/send body=${JSON.stringify(body)}\n`);
      } catch (e) { /* noop */ }

      // Forward to the serverless proxy
      let forwardUrl = `${WA_FUNCTION_URL}/send`;

      const r = await fetch(forwardUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(body)
      });

      const text = await r.text();
      let data;
      try { data = JSON.parse(text); } catch (err) { data = { raw: text }; }

      try { fs.appendFileSync("server/wa-proxy.log", `FORWARD_RESPONSE ${new Date().toISOString()} status=${r.status} body=${JSON.stringify(data)}\n`); } catch (e) { /* noop */ }

      if (!r.ok) return res.status(r.status).json(data);
      return res.json(data);
    }

    // Fallback: call Meta Graph API directly (existing behavior)
    const url = `https://graph.facebook.com/v24.0/${PHONE_ID}/messages`;
    const r = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${ACCESS_TOKEN}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(body)
    });

    const text = await r.text();
    let data;
    try { data = JSON.parse(text); } catch (err) { data = { raw: text }; }

    // Log Graph API response
    try { fs.appendFileSync("server/wa-proxy.log", `GRAPH_RESPONSE ${new Date().toISOString()} status=${r.status} body=${JSON.stringify(data)}\n`); } catch (e) { /* noop */ }

    if (!r.ok) return res.status(r.status).json(data);
    return res.json(data);
  } catch (err) {
    console.error(err);
    try { fs.appendFileSync("server/wa-proxy.log", `PROXY_ERROR ${new Date().toISOString()} ${err && err.stack ? err.stack : String(err)}\n`); } catch (e) { /* noop */ }
    return res.status(500).json({ error: "Internal error" });
  }
});

// Fetch list of templates for the WhatsApp Business Account
app.get("/api/whatsapp/templates", async (req, res) => {
  try {
    const WABA = process.env.META_WABA_ID;
    if (!WABA) return res.status(500).json({ error: "META_WABA_ID not set" });

    const url = `https://graph.facebook.com/v24.0/${WABA}/message_templates?limit=200&access_token=${ACCESS_TOKEN}`;
    const r = await fetch(url);
    const data = await r.json();
    if (!r.ok) return res.status(r.status).json(data);
    return res.json(data);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal error" });
  }
});

// Fetch a single template's detail (components) by name and optional language
app.get("/api/whatsapp/templates/:name", async (req, res) => {
  try {
    const WABA = process.env.META_WABA_ID;
    const name = req.params.name;
    const language = req.query.language || process.env.VITE_META_DEFAULT_TEMPLATE_LANG || "en_US";
    if (!WABA) return res.status(500).json({ error: "META_WABA_ID not set" });

    const url = `https://graph.facebook.com/v24.0/${WABA}/message_templates?name=${encodeURIComponent(name)}&language=${encodeURIComponent(language)}&access_token=${ACCESS_TOKEN}`;
    const r = await fetch(url);
    const data = await r.json();
    if (!r.ok) return res.status(r.status).json(data);
    return res.json(data);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal error" });
  }
});

const PORT = process.env.WA_PORT || 4001;
app.listen(PORT, () => console.log(`WhatsApp proxy listening on ${PORT}`));
