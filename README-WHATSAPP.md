WhatsApp Integration (Meta)

Quick start

1. Ensure the following env vars are set in your `.env`:

- `META_PHONE_NUMBER_ID`
- `META_ACCESS_TOKEN`
- `VITE_META_DEFAULT_TEMPLATE_LANG` (optional)

2. Install dependencies (the project already uses node):

```bash
npm install node-fetch dotenv express
```

3. Start the proxy server:

```bash
npm run wa:start
```

4. Send a POST request to the local endpoint to send a template message:

POST `http://localhost:4001/api/whatsapp/send`

Body (JSON):

```json
{
  "to": "whatsapp:+919876543210",
  "template": "wa_order_confirmation_no_reading",
  "language": "en",
  "components": []
}
```

Notes
- This server is a minimal proxy that uses your Meta WhatsApp Business API token. Keep tokens secret.
- Use this from your backend; do NOT call Meta directly from client-side code.
