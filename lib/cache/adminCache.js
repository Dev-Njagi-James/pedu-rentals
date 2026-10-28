const TTL_MS = 2 * 60 * 1000;

let cache = new Map(); // key -> { data, timestamp }

export function getAdminCache(key) {
  return cache.get(key) ?? null;
}

export function isAdminCacheFresh(entry, ttl = TTL_MS) {
  return !!entry && Date.now() - entry.timestamp < ttl;
}

export function setAdminCache(key, data) {
  cache.set(key, { data, timestamp: Date.now() });
}

export function invalidateAdminCache() {
  cache = new Map();
}
