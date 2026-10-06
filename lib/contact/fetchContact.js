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

export async function prefetchContacts(ids) {
  const missing = [
    ...new Set(ids.filter((id) => !getCachedContact(id) && !inflight.has(id))),
  ];
  if (missing.length === 0) return;

  const chunks = [];
  for (let i = 0; i < missing.length; i = 50) {
    chunks.push(missing.slice(i, i + 50));
  }

  await Promise.all(
    chunks.map(async (chunk) => {
      const p = requestBatch(chunk);
      chunk.forEach((id) =>
        inflight.set(
          id,
          p.then((map) => map[id] ?? { status: "error" }),
        ),
      );
      try {
        const map = await p;
        for (const id of chunk) {
          const r = map[id];
          if (r && (r.status === "ok" || r.status === "forbidden")) {
            cache.set(id, { at: Date.now(), result: r });
          }
        }
      } finally {
        chunk.forEach((id) => inflight.delete(id));
      }
    }),
  );
}

async function requestBatch(ids) {
  const fail = (status) => Object.fromEntries(ids.map((id) => [id, { status }]));
  try {
    const res = await fetch(`/api/v1/listings/contact?ids=${ids.join(",")}`, {
      cache: "no-store",
    });
    if (res.status === 401) return fail("signed_out");
    if (res.status === 409) return fail("syncing");
    if (!res.ok) return fail("error");
    const json = await res.json();
    return json.data ?? fail("error");
  } catch {
    return fail("error");
  }
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
