// Module-scope cache for the lister's own /api/v1/users/me profile.
// Persists for the page's lifetime (resets on hard reload / new tab).
// First caller triggers the network request; every other caller reads
// the resolved cache or awaits the same in-flight promise.

let cachedProfile; // undefined = not fetched, null = fetched/no row, object = loaded
let inFlightRequest = null;
const listeners = new Set();

const REQUIRED_FIELDS = ["username", "lister_organization", "phone_number"];

export function computeMissingFields(profile) {
  if (!profile) return [...REQUIRED_FIELDS];
  return REQUIRED_FIELDS.filter(
    (field) => !profile[field] || String(profile[field]).trim() === "",
  );
}

export function getCachedListerProfileSync() {
  return cachedProfile;
}

export async function getListerProfile() {
  if (cachedProfile !== undefined) return cachedProfile;
  if (inFlightRequest) return inFlightRequest;

  inFlightRequest = (async () => {
    try {
      const res = await fetch("/api/v1/users/me");
      if (res.status === 200) {
        const json = await res.json();
        cachedProfile = json.data ?? null;
      } else if (res.status === 404) {
        cachedProfile = null;
      } else {
        console.error("GET /api/v1/users/me failed:", res.status);
        cachedProfile = null;
      }
    } catch (err) {
      console.error("GET /api/v1/users/me failed:", err);
      cachedProfile = null;
    } finally {
      inFlightRequest = null;
    }
    listeners.forEach((fn) => fn(cachedProfile));
    return cachedProfile;
  })();

  return inFlightRequest;
}

// Call with a PATCH response. Updates cache, notifies subscribers. No refetch.
export function setListerProfile(profile) {
  cachedProfile = profile;
  listeners.forEach((fn) => fn(cachedProfile));
}

export function subscribeListerProfile(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

// Call on logout so the next login re-fetches instead of serving stale data.
export function clearListerProfileCache() {
  cachedProfile = undefined;
  inFlightRequest = null;
}
