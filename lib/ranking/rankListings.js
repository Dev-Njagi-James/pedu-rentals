// Listing ranking algorithm — plan tier only, for now.
// Additional factors (rating, clicks, search frequency, review score, recency
// decay) get added here as separate weighted terms later. Route code never
// needs to change when this file's internals change — it only calls rankListings().

const PLAN_PRIORITY = {
  Enterprise: 1,
  Premium: 2,
  Regular: 3,
};

const UNKNOWN_PLAN_PRIORITY = Number.MAX_SAFE_INTEGER;

// Sorts listings by plan tier (ascending priority_rank), then by recency,
// then by listing_id. The listing_id tiebreak is mandatory, not cosmetic —
// it guarantees a fully deterministic order so repeated calls with the same
// filters never reorder items relative to each other. That determinism is
// what prevents duplicate/skipped listings across paginated buffers.
export function rankListings(listings) {
  return [...listings].sort((a, b) => {
    const rankA = PLAN_PRIORITY[a.plan_name] ?? UNKNOWN_PLAN_PRIORITY;
    const rankB = PLAN_PRIORITY[b.plan_name] ?? UNKNOWN_PLAN_PRIORITY;
    if (rankA !== rankB) return rankA - rankB;

    const timeA = new Date(a.created_at ?? 0).getTime();
    const timeB = new Date(b.created_at ?? 0).getTime();
    if (timeB !== timeA) return timeB - timeA;

    return (b.listing_id ?? 0) - (a.listing_id ?? 0);
  });
}