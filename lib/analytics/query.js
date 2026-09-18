import "server-only";

const POSTHOG_HOST =
  process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://us.i.posthog.com";
const PROJECT_ID = process.env.POSTHOG_PROJECT_ID;
const PERSONAL_API_KEY = process.env.POSTHOG_PERSONAL_API_KEY;

/**
 * Returns { [listing_id]: call_count } for all listings with at least one
 * property_call_clicked event, or null if the query could not be answered
 * (missing config, network failure, non-2xx response). null is distinct
 * from {} (a real zero-events project) — callers must not coerce null to 0.
 */
export async function getCallCountsByListing() {
  if (!PROJECT_ID || !PERSONAL_API_KEY) {
    console.error(
      "PostHog query API not configured: missing POSTHOG_PROJECT_ID or POSTHOG_PERSONAL_API_KEY",
    );
    return null;
  }

  try {
    const res = await fetch(
      `${POSTHOG_HOST}/api/projects/${PROJECT_ID}/query/`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${PERSONAL_API_KEY}`,
        },
        body: JSON.stringify({
          query: {
            kind: "HogQLQuery",
            query: `
              SELECT
                properties.listing_id AS listing_id,
                count() AS call_count
              FROM events
              WHERE event = 'property_call_clicked'
              GROUP BY listing_id
            `,
          },
        }),
      },
    );

    if (!res.ok) {
      console.error("PostHog query API error:", res.status, await res.text());
      return null;
    }

    const json = await res.json();
    const rows = json.results ?? [];

    const counts = {};
    for (const [listingId, count] of rows) {
      if (listingId != null) counts[String(listingId)] = Number(count);
    }
    return counts;
  } catch (err) {
    console.error("PostHog query API request failed:", err);
    return null;
  }
}
