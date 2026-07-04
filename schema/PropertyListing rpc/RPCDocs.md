# Properties RPC & Algorithm Documentation

## Overview

The system uses a single PostgreSQL RPC function `get_listings_paginated` as the data layer for all public-facing listing queries. It powers two surfaces: the properties page (filtered, paginated) and the home page trending section (cross-category, top-scored). Both surfaces are driven by the same scoring algorithm built into the RPC.

---

## Database Tables

### Property_Listing (Relevant Columns)

| Column              | Type      | Default  | Role                                          |
| ------------------- | --------- | -------- | --------------------------------------------- |
| `listing_id`        | bigint    | identity | Primary key                                   |
| `created_at`        | timestamp | now()    | Drives time decay                             |
| `views`             | bigint    | 0        | Primary scoring signal (70% weight)           |
| `call_logs`         | bigint    | 0        | Tracked, deferred as scoring signal           |
| `rating`            | bigint    | 0        | Dormant column, superseded by listing_reviews |
| `category_id`       | bigint    | —        | Filter param                                  |
| `ward_id`           | bigint    | —        | Filter param                                  |
| `property_type_id`  | bigint    | —        | Filter param                                  |
| `rent_duration`     | text      | —        | Filter param                                  |
| `property_interior` | text      | —        | Filter param                                  |
| `property_price`    | text      | —        | Filter param (range)                          |

### listing_reviews

Stores anonymous user reviews tied to listings. One review per device per listing enforced at DB level.

| Column        | Type        | Constraints                              |
| ------------- | ----------- | ---------------------------------------- |
| `review_id`   | bigint      | Primary key, identity                    |
| `listing_id`  | bigint      | FK → Property_Listing, ON DELETE CASCADE |
| `fingerprint` | text        | Anonymous device identity                |
| `rating`      | smallint    | NOT NULL, CHECK 1–5                      |
| `review_text` | text        | Nullable — optional                      |
| `created_at`  | timestamptz | Default now()                            |

**Indexes:**

- `listing_reviews_one_per_device` — UNIQUE on `(listing_id, fingerprint)` — one review per device per listing
- `listing_reviews_listing_id_idx` — index on `listing_id` — keeps RPC join fast

---

## The Algorithm

The algorithm runs entirely inside the RPC as a chain of CTEs. It determines the order listings appear on both the properties page and the trending section. The core principle: a listing's position is determined by how much attention it has received (views + ratings), weighted against how recently it was listed.

### Step 1 — Approximate Count (`approx_count` CTE)

```sql
SELECT reltuples::bigint AS total
FROM pg_class
WHERE relname = 'Property_Listing'
```

Reads `pg_class.reltuples` — a row count estimate Postgres maintains automatically via autovacuum. Zero cost — no table scan. Accurate enough for the coarse tier thresholds in Step 2.

### Step 2 — Decay Factor (`decay_config` CTE)

```sql
CASE
  WHEN total < 50  THEN 0.3
  WHEN total < 200 THEN 0.5
  WHEN total < 500 THEN 0.7
  ELSE                  1.0
END AS decay_factor
```

Controls how aggressively time penalises older listings. Self-tunes as the platform grows:

| Listings | Decay Factor | Behaviour                                       |
| -------- | ------------ | ----------------------------------------------- |
| < 50     | 0.3          | Gentle — older listings stay competitive longer |
| < 200    | 0.5          | Moderate                                        |
| < 500    | 0.7          | Faster decay                                    |
| 500+     | 1.0          | Aggressive — fresh listings surface quickly     |

### Step 3 — Review Aggregation (`review_stats` CTE)

```sql
SELECT
  listing_id,
  ROUND(AVG(rating)::numeric, 2) AS avg_rating,
  COUNT(*)::bigint               AS review_count
FROM listing_reviews
GROUP BY listing_id
```

Aggregates `avg_rating` and `review_count` per listing from `listing_reviews`. Listings with no reviews get `COALESCE` defaults of 0 — they score on views alone until reviews arrive.

### Step 4 — Scoring (`scored` CTE)

```sql
(
  0.7 * pl.views + 0.3 * COALESCE(rs.avg_rating, 0) * COALESCE(rs.review_count, 0)
) / POWER(
  1 + EXTRACT(EPOCH FROM (NOW() - pl.created_at)) / 3600.0,
  decay_factor
) AS score
```

Broken down:

- `0.7 * views` — views carry 70% of the signal weight
- `0.3 * avg_rating * review_count` — ratings carry 30%. Multiplying by `review_count` prevents a single 5-star review from outranking a listing with many views and a solid average
- `COALESCE` on both rating fields — listings with no reviews score 0 on the rating term, not null
- `1 + hours_elapsed` — prevents division by zero for brand new listings
- `POWER(denominator, decay_factor)` — exponential decay; higher factor = score drops faster with age

Practical examples at decay factor 0.5, no reviews:

| Views | Age      | Score |
| ----- | -------- | ----- |
| 100   | 1 hour   | 50.0  |
| 100   | 24 hours | 20.0  |
| 100   | 7 days   | 11.1  |
| 0     | any age  | 0.0   |

With reviews (avg 4.5, 10 reviews, decay 0.5):

| Views | Age      | Score                  |
| ----- | -------- | ---------------------- |
| 100   | 1 hour   | (70 + 13.5) / 1 = 83.5 |
| 100   | 24 hours | 83.5 / 5 = 16.7        |

### Step 5 — Tier Assignment (`tiered` CTE)

```sql
NTILE(10) OVER (ORDER BY score DESC) AS decile
```

Splits the scored result set into 10 equal buckets. Decile 1 = top 10% by score.

| Deciles | Tier | Share      |
| ------- | ---- | ---------- |
| 1–2     | Hot  | Top 20%    |
| 3–5     | Warm | Next 30%   |
| 6–10    | Cold | Bottom 50% |

Tier assignment is relative to the active filtered set — filtering by `category_id=1` means hot/warm/cold are computed only among rental apartments.

### Step 6 — Final Ordering

```sql
ORDER BY
  CASE
    WHEN decile <= 2 THEN 1
    WHEN decile <= 5 THEN 2
    ELSE                  3
  END,
  random()
```

- Hot always before warm; warm always before cold
- `random()` shuffles within each tier on every request
- Two users on the same filtered page see different orderings within each tier
- Same user gets a new shuffle after React Query's 5-minute stale time expires

---

## RPC Function Signature

```sql
get_listings_paginated(
  p_limit             integer,
  p_offset            integer,
  p_ward_id           bigint   DEFAULT NULL,
  p_category_id       bigint   DEFAULT NULL,
  p_type_ids          bigint[] DEFAULT NULL,
  p_price_range       text     DEFAULT NULL,
  p_rent_duration     text     DEFAULT NULL,
  p_property_interior text     DEFAULT NULL,
  p_listing_id        bigint   DEFAULT NULL
)
```

### Return Columns

| Column            | Type        |
| ----------------- | ----------- |
| listing_id        | bigint      |
| property_name     | text        |
| property_price    | text        |
| rent_duration     | text        |
| property_interior | text        |
| description       | text        |
| phone_number      | bigint      |
| category_name     | text        |
| type_name         | text        |
| ward_name         | text        |
| ward_id           | bigint      |
| ward_location     | text        |
| property_location | text        |
| created_at        | timestamptz |
| views             | bigint      |
| avg_rating        | numeric     |
| review_count      | bigint      |
| media             | json        |

### Price Range Filter Values

| Parameter value | Range           |
| --------------- | --------------- |
| `below_2000`    | ≤ 2,000         |
| `2000_4000`     | 2,001 – 4,000   |
| `5000_8000`     | 5,001 – 8,000   |
| `9000_12000`    | 9,001 – 12,000  |
| `13000_20000`   | 13,001 – 20,000 |
| `above_20000`   | > 20,000        |

---

## API Routes

### Public Properties Route

**`GET /api/listings`**

Powers the properties page. Accepts all filter params as query string. Calls `get_listings_paginated` with those filters. Separate count query for pagination metadata. No auth guard.

Query params: `page`, `prefetch`, `ward_id`, `category_id`, `type_ids`, `price_range`, `rent_duration`, `property_interior`

Page size: 20 (40 on prefetch)

### Trending Route

**`GET /api/listings/trending`**

Powers the home page trending section. No filters — cross-category. Calls `get_listings_paginated` with all filter params null and `p_limit: 10`. Returns top 10 scored listings across the entire catalog. No auth guard. `revalidate = 0`.

### Reviews Route

**`POST /api/listings/[id]/reviews`**

Accepts anonymous review submissions. No auth guard.

Request body:

```json
{
  "fingerprint": "uuid-string",
  "rating": 4,
  "review_text": "Optional text"
}
```

Responses:

- `200` — inserted successfully
- `400` — missing or invalid fields
- `409` — duplicate review, unique constraint violation (Postgres error `23505`)
- `500` — server error

### Call Tracking Route

**`POST /api/listings/[id]/calls`**

Increments `call_logs` on the listing. Fires before tel redirect on every call button tap.

### Admin Listing Route

**`GET /api/Listing`** (capital L)

Owner-only dashboard route. Auth-gated via `user_id`. Not affected by the algorithm.

---

## Frontend

### Properties Page (`/properties`)

- Default filter: `category_id=1` (Rental Apartments) if no params present
- React Query: `staleTime: 5min`, `gcTime: 10min`
- Cache key: `['listings', filters, currentPage]`
- Grid: 5 → 4 → 3 → 2 → 1 columns at breakpoints
- Ward button opens map modal via `property_location` iframe
- `ReviewPrompt` mounted — detects `pending_review` on load

### Home Page Trending Section (`TrendingListingsSection`)

- Above Browse By Category
- Fetches from `/api/listings/trending`
- React Query cache key: `['trending-listings']`, `staleTime: 5min`
- 10 cards maximum, 5-column grid matching properties page breakpoints
- "More Listings →" in last grid cell → `/properties`
- Ward popup — full map modal
- Skeleton shimmer on load (10 placeholders)

### PropertyCard

Shared component on all listing surfaces. Call button handler:

1. Generates or retrieves `cr_fingerprint` from localStorage
2. Writes `pending_review: { listing_id, listing_name, timestamp }` to localStorage if not already reviewed
3. POSTs to `/api/listings/{id}/calls`
4. Redirects to `tel:`

### PropertyHero (Details Page)

Same call handler logic as PropertyCard. `ReviewPrompt` mounted in `detailsHero.jsx`.

---

## Review System

### Anonymous Identity

On first call button tap, `crypto.randomUUID()` generates a `cr_fingerprint` stored in localStorage. Persists across sessions. Submitted with every review to identify the device.

### Review Flow

```
Call button fires
  → fingerprint generated/retrieved from localStorage
  → pending_review written to localStorage (if not already reviewed)
  → call POST fires → tel redirect fires
User returns to site
  → ReviewPrompt mounts, reads pending_review
  → checks timestamp < 24 hours
  → checks reviewed:{listing_id} not set in localStorage
  → shows modal: listing name, star rating (1–5 required), optional text
  → on submit → POST /api/listings/{id}/reviews
  → on success → sets reviewed:{listing_id} in localStorage
  → clears pending_review, auto-closes after 2 seconds
  → on dismiss → clears pending_review, no prompt again for this call
```

### Duplicate Prevention

Two layers:

- **Client** — `reviewed:{listing_id}` in localStorage suppresses the prompt before it shows
- **DB** — unique index on `(listing_id, fingerprint)` rejects duplicate inserts; API returns 409 which the prompt handles silently as success

### Effect on Algorithm

`avg_rating` and `review_count` from `listing_reviews` feed into the score formula at 30% weight. A listing with no reviews scores on views alone. As reviews accumulate the rating term grows and influences tier placement.

---

## Call Tracking

Every call button tap POSTs to `/api/listings/{id}/calls`, incrementing `call_logs`. A database trigger `on_call_log_increment` fires after each update. `call_logs` is collected but not yet in the score formula — deferred.

---

## Deferred / Future Work

| Item                                | Status      | Notes                                                                                           |
| ----------------------------------- | ----------- | ----------------------------------------------------------------------------------------------- |
| `call_logs` as scoring signal       | Deferred    | Data collecting. Formula weight TBD.                                                            |
| `rating` column on Property_Listing | Superseded  | Replaced by listing_reviews aggregate. Column retained but dormant.                             |
| Paid boost (`boosted_until` column) | Not started | Schema change needed. Boosted listings pin to top of hot tier until expiry. Monetisation lever. |

---

## Local Schema Files

`/schema/rpc/` — source-controlled copies only. No connection to the live database. Always apply in Supabase SQL editor first, then update local files.

| File                | Contents                               |
| ------------------- | -------------------------------------- |
| `propertiesRpc.sql` | Full `get_listings_paginated` function |
| `RPCDocs.md`        | This document                          |
