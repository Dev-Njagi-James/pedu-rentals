const DARAJA_BASE_URL = process.env.DARAJA_BASE_URL ?? 'https://sandbox.safaricom.co.ke';
const DARAJA_CONSUMER_KEY = process.env.DARAJA_CONSUMER_KEY ?? '';
const DARAJA_CONSUMER_SECRET = process.env.DARAJA_CONSUMER_SECRET ?? '';
const DARAJA_SHORTCODE = process.env.DARAJA_SHORTCODE ?? '';
const DARAJA_PASSKEY = process.env.DARAJA_PASSKEY ?? '';

function getDarajaTimestamp() {
  const now = new Date();
  const eatOffsetMs = 3 * 60 * 60 * 1000;
  const eat = new Date(now.getTime() + eatOffsetMs);
  return eat.toISOString().replace(/[-T:.Z]/g, '').slice(0, 14);
}

function getDarajaPassword(timestamp) {
  return Buffer.from(`${DARAJA_SHORTCODE}${DARAJA_PASSKEY}${timestamp}`).toString('base64');
}

async function getDarajaToken() {
  const credentials = Buffer.from(`${DARAJA_CONSUMER_KEY}:${DARAJA_CONSUMER_SECRET}`).toString('base64');
  const res = await fetch(`${DARAJA_BASE_URL}/oauth/v1/generate?grant_type=client_credentials`, {
    headers: { Authorization: `Basic ${credentials}` },
  });
  const json = await res.json();
  if (!json.access_token) throw new Error('Failed to obtain Daraja token.');
  return json.access_token;
}

export { getDarajaTimestamp, getDarajaPassword, getDarajaToken };
