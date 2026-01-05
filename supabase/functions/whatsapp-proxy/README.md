# whatsapp-proxy (Supabase Edge Function)

This Supabase Edge Function provides a serverless proxy to the WhatsApp Cloud API.

Endpoints (relative to the function URL):
- `GET /` — health / alive check
- `GET /templates` — list templates (for your WABA)
- `GET /templates/:name` — fetch template detail by name (use `?language=...`)
- `POST /send` — send a template message. JSON body: `{ to, template, language, components }`

Security: the function expects an `x-api-key` header that matches the `WHATSAPP_API_KEY` secret in Supabase.

Additional protections and behavior:
- Rate limiting: a simple in-memory rate-limiter is enabled (window default 60s, default 60 requests). Configure with `RATE_LIMIT_WINDOW_MS` and `RATE_LIMIT_MAX` environment variables. Note: in-memory rate limiting is best-effort in serverless environments and may reset on cold starts.
- Retries/backoff: Graph API calls use an exponential retry/backoff for 429 and 5xx responses.
- Health endpoint: `GET /health` returns service status.
- CORS: set `WHATSAPP_ALLOWED_ORIGIN` to your frontend origin (defaults to `*`).

Required environment variables (set as Supabase project secrets or env):
- `META_ACCESS_TOKEN` — WhatsApp Graph API token
- `META_WABA_ID` — WhatsApp Business Account ID
- `META_PHONE_NUMBER_ID` — Meta phone number id (for sending messages)
- `WHATSAPP_API_KEY` — shared API key to protect the endpoint

Deployment (recommended):
1. Add these secrets to your Supabase project or via the CLI.
2. Deploy the function using `supabase functions deploy whatsapp-proxy`.

GitHub Actions workflow in this repo will attempt to deploy the function and optionally set secrets from repository secrets. Configure the repo secrets before enabling the workflow.

Notes and caveats:
- For robust rate-limiting use a shared store (Redis) or platform-level protections.
- For production observability, connect logs to a log sink and add monitoring/alerts on function errors and high 429 rates.

Local deploy (quick test)
1. Install and login the Supabase CLI locally: `npm install -g supabase` and `supabase login`.
2. Export required env for the CLI deploy temporarily (PowerShell example):

```powershell
$env:SUPABASE_TOKEN = '<YOUR_SUPABASE_SERVICE_ROLE_OR_CLI_TOKEN>'
$env:SUPABASE_PROJECT_REF = '<YOUR_PROJECT_REF>'
supabase functions deploy whatsapp-proxy --project-ref $env:SUPABASE_PROJECT_REF --token $env:SUPABASE_TOKEN
```

Repository secrets for GitHub Actions
- `SUPABASE_TOKEN` — token with rights to deploy functions
- `SUPABASE_PROJECT_REF` — Supabase project ref
- `META_ACCESS_TOKEN` — Meta Graph API token
- `META_WABA_ID` — WhatsApp Business Account ID
- `META_PHONE_NUMBER_ID` — Meta phone number ID
- `WHATSAPP_API_KEY` — shared API key used by the frontend
- Optional: `WHATSAPP_ALLOWED_ORIGIN`, `RATE_LIMIT_WINDOW_MS`, `RATE_LIMIT_MAX`

Automatic deploy options
- There is a push-based workflow on `main` and a `workflow_dispatch` manual workflow at `.github/workflows/deploy-whatsapp-proxy-dispatch.yml` that can be used once secrets are present.

