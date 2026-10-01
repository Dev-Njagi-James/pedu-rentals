// lib/payments/pesapal/client.js
// Config, auth-token cache, and a single request helper for Pesapal API 3.0.
// Env is read lazily (inside functions), so `next build` never needs the keys.

const HOSTS = {
  sandbox: "https://cybqa.pesapal.com/pesapalv3",
  live: "https://pay.pesapal.com/v3",
};

const TOKEN_MARGIN_MS = 30_000; // refresh 30s before Pesapal's 5-minute expiry
const TOKEN_FALLBACK_TTL_MS = 4 * 60_000;

export class PesapalError extends Error {
  constructor(message, { code = null, type = null, httpStatus = null } = {}) {
    super(message);
    this.name = "PesapalError";
    this.code = code;
    this.type = type;
    this.httpStatus = httpStatus;
  }
}

export function getPesapalConfig() {
  // Anything other than the exact string "live" resolves to sandbox, so a
  // missing or mistyped PESAPAL_ENV can never hit the live gateway.
  const env = process.env.PESAPAL_ENV === "live" ? "live" : "sandbox";
  const consumerKey = process.env.PESAPAL_CONSUMER_KEY;
  const consumerSecret = process.env.PESAPAL_CONSUMER_SECRET;
  if (!consumerKey || !consumerSecret) {
    throw new PesapalError("Pesapal credentials are not configured.");
  }
  return {
    env,
    baseUrl: HOSTS[env],
    consumerKey,
    consumerSecret,
    ipnId: process.env.PESAPAL_IPN_ID ?? null,
  };
}

// Pesapal returns an `error` object even on success, with every field null.
// Only treat it as an error when it actually carries something.
function extractError(data) {
  const e = data?.error;
  if (!e) return null;
  if (e.message || e.code || e.error_type) return e;
  return null;
}

let cachedToken = null; // { token, expiresAt }
let inflight = null;

async function fetchToken() {
  const { baseUrl, consumerKey, consumerSecret } = getPesapalConfig();
  const res = await fetch(`${baseUrl}/api/Auth/RequestToken`, {
    method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    body: JSON.stringify({
      consumer_key: consumerKey,
      consumer_secret: consumerSecret,
    }),
    cache: "no-store",
  });
  const data = await res.json().catch(() => null);
  const err = extractError(data);
  if (!res.ok || !data?.token || err) {
    throw new PesapalError(err?.message ?? "Pesapal authentication failed.", {
      code: err?.code ?? null,
      type: err?.error_type ?? null,
      httpStatus: res.status,
    });
  }
  const parsed = data.expiryDate ? Date.parse(data.expiryDate) : NaN;
  cachedToken = {
    token: data.token,
    expiresAt: Number.isNaN(parsed)
      ? Date.now() + TOKEN_FALLBACK_TTL_MS
      : parsed,
  };
  return cachedToken.token;
}

async function getToken() {
  if (cachedToken && cachedToken.expiresAt - TOKEN_MARGIN_MS > Date.now()) {
    return cachedToken.token;
  }
  if (!inflight) {
    inflight = fetchToken().finally(() => {
      inflight = null;
    });
  }
  return inflight;
}

export async function pesapalRequest(path, { method = "GET", body } = {}) {
  const { baseUrl } = getPesapalConfig();

  const send = async () => {
    const token = await getToken();
    return fetch(`${baseUrl}${path}`, {
      method,
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: body ? JSON.stringify(body) : undefined,
      cache: "no-store",
    });
  };

  let res = await send();
  if (res.status === 401) {
    // Token rejected early: drop the cache and retry once.
    cachedToken = null;
    res = await send();
  }

  const data = await res.json().catch(() => null);
  const err = extractError(data);
  if (!res.ok || !data || err) {
    throw new PesapalError(
      err?.message ?? `Pesapal request failed (${res.status}).`,
      {
        code: err?.code ?? null,
        type: err?.error_type ?? null,
        httpStatus: res.status,
      },
    );
  }
  return data;
}
