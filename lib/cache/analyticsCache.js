const TTL_MS = 60 * 1000; // 1 minute

let cache = {
  summary: null, // { data, timestamp }
  listings: null, // { data, timestamp }
};

export function getCached(key) {
  return cache[key] ?? null;
}

export function isCacheFresh(entry) {
  return !!entry && Date.now() - entry.timestamp < TTL_MS;
}

export function setCached(key, data) {
  cache[key] = { data, timestamp: Date.now() };
}

/**
 * Call on sign-in/sign-up completion (same call site as
 * invalidateMyListingsCache). Forces next Analytics mount to do a full
 * fetch with loading state instead of serving stale data.
 */
export function invalidateAnalyticsCache() {
  cache = { summary: null, listings: null };
}
