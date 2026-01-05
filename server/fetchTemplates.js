import fetch from 'node-fetch';
import dotenv from 'dotenv';

dotenv.config();

const WABA = process.env.META_WABA_ID;
const ACCESS_TOKEN = process.env.META_ACCESS_TOKEN;

if (!WABA || !ACCESS_TOKEN) {
  console.error('META_WABA_ID or META_ACCESS_TOKEN not set in .env');
  process.exit(1);
}

const url = `https://graph.facebook.com/v24.0/${WABA}/message_templates?limit=200&access_token=${ACCESS_TOKEN}`;

(async () => {
  try {
    const r = await fetch(url);
    const data = await r.json();
    console.log(JSON.stringify({ status: r.status, ok: r.ok, body: data }, null, 2));
  } catch (err) {
    console.error('fetch error', err);
    process.exit(2);
  }
})();
