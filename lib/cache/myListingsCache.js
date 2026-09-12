const TTL_MS = 3 * 60 * 1000; // 3 minutes

let cache = {}; // { [page]: { data: { listings, pagination }, timestamp } }

export function getCachedPage(page) {
  return cache[page] ?? null;
}

export function isCacheFresh(entry) {
  return !!entry && Date.now() - entry.timestamp < TTL_MS;
}

export function setCachedPage(page, data) {
  cache[page] = { data, timestamp: Date.now() };
}

/**
 * Call this on sign-out/sign-in and immediately after a new listing is
 * successfully created (from whatever component handles listing creation —
 * not this file). Forces the next mount of ListingsPanel to do a full
 * fetch with skeleton instead of serving stale/cached data.
 */
export function invalidateMyListingsCache() {
  cache = {};
}
