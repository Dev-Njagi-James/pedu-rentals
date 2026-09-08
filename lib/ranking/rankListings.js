// Listing ranking algorithm.
// Sort order: plan tier (hard partition) -> weighted rating (tiebreak within
// tier) -> recency (tiebreak within same tier+rating) -> listing_id (final,
// guarantees a fully deterministic order with zero ties, which is what
// prevents duplicate/skipped listings across paginated buffers).
//
// Additional factors (clicks, search frequency, review-type score) get
// inserted into this same chain later, between rating and recency. Route
// code never needs to change when this file's internals change.

const PLAN_PRIORITY = {
  Enterprise: 1,
  Premium: 2,
  Regular: 3,
};

const UNKNOWN_PLAN_PRIORITY = Number.MAX_SAFE_INTEGER;

// Bayesian weighted rating — prevents a single 5-star review on a new
// listing from outranking established listings, and prevents 0-review
// listings from all tying at the bottom with no differentiation logic.
// With review_count = 0, this reduces exactly to BASELINE_RATING.
const BASELINE_RATING = 3.0;   // C — assumed "average" for unrated listings
const CONFIDENCE_COUNT = 5;    // m — reviews needed before real rating dominates

function weightedRating(avgRating, reviewCount) {
  const v = reviewCount ?? 0;
  const R = avgRating ?? 0;
  const m = CONFIDENCE_COUNT;
  const C = BASELINE_RATING;
  return (v / (v + m)) * R + (m / (v + m)) * C;
}

export function rankListings(listings) {
  return [...listings].sort((a, b) => {
    const rankA = PLAN_PRIORITY[a.plan_name] ?? UNKNOWN_PLAN_PRIORITY;
    const rankB = PLAN_PRIORITY[b.plan_name] ?? UNKNOWN_PLAN_PRIORITY;
    if (rankA !== rankB) return rankA - rankB;

    const scoreA = weightedRating(a.avg_rating, a.review_count);
    const scoreB = weightedRating(b.avg_rating, b.review_count);
    if (scoreB !== scoreA) return scoreB - scoreA;

    const timeA = new Date(a.created_at ?? 0).getTime();
    const timeB = new Date(b.created_at ?? 0).getTime();
    if (timeB !== timeA) return timeB - timeA;

    return (b.listing_id ?? 0) - (a.listing_id ?? 0);
  });
}