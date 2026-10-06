const TTL_OK_MS = 5 * 60 * 1000;
const TTL_FORBIDDEN_MS = 60 * 1000;
const cache = new Map();
const inflight = new Map();

export function getCachedContact(listingId) {
  const hit = cache.get(listingId);
  if (!hit) return null;
  const ttl = hit.result.status === "ok" ? TTL_OK_MS : TTL_FORBIDDEN_MS;
  if (Date.now() - hit.at > ttl) {
    cache.delete(listingId);
    return null;
  }
  return hit.result;
}

export function clearContactCache() {
  cache.clear();
  inflight.clear();
}

export function fetchContact(listingId) {
  const cached = getCachedContact(listingId);
  if (cached) return Promise.resolve(cached);
  if (inflight.has(listingId)) return inflight.get(listingId);

  const p = requestContact(listingId)
    .then((result) => {
      if (result.status === "ok" || result.status === "forbidden") {
        cache.set(listingId, { at: Date.now(), result });
      }
      return result;
    })
    .finally(() => inflight.delete(listingId));

  inflight.set(listingId, p);
  return p;
}

async function requestContact(listingId) {
  try {
    const res = await fetch(`/api/v1/listings/${listingId}/contact`, {
      cache: "no-store",
    });
    if (res.status === 401) return { status: "signed_out" };
    if (res.status === 403) return { status: "forbidden" };
    if (res.status === 409) return { status: "syncing" };
    if (!res.ok) return { status: "error" };
    const json = await res.json();
    return { status: "ok", data: json.data };
  } catch {
    return { status: "error" };
  }
}
