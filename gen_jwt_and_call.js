import crypto from 'crypto';
import { execSync } from 'child_process';

const secret = process.argv[2];
if (!secret) { console.error('Usage: node gen_jwt_and_call.js <sb_secret>'); process.exit(2); }
const projectRef = 'szburzfibchvdyxksokr';
function base64url(input) {
  return Buffer.from(input).toString('base64').replace(/=/g,'').replace(/\+/g,'-').replace(/\//g,'_');
}
const header = { alg: 'HS256', typ: 'JWT' };
const now = Math.floor(Date.now()/1000);
const payload = { iss: 'supabase', iat: now, exp: now + 300, role: 'service_role', ref: projectRef };
const signingInput = base64url(JSON.stringify(header)) + '.' + base64url(JSON.stringify(payload));
const signature = crypto.createHmac('sha256', secret).update(signingInput).digest('base64').replace(/=/g,'').replace(/\+/g,'-').replace(/\//g,'_');
const token = signingInput + '.' + signature;
console.error('Generated token (truncated):', token.slice(0,40)+'...');

// call via curl
try {
  const cmd = `curl -i -X GET -H "Authorization: Bearer ${token}" -H "x-api-key: local_test_key_2026" "https://${projectRef}.supabase.co/functions/v1/whatsapp-proxy/health"`;
  const out = execSync(cmd, { encoding: 'utf8', stdio: 'pipe' });
  console.log(out);
} catch (e) {
  if (e.stdout) console.log(e.stdout.toString());
  if (e.stderr) console.error(e.stderr.toString());
  console.error('curl exited with', e.status || e.message);
  process.exit(1);
}
