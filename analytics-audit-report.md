# Analytics Blast-Radius Audit — Manual-Trigger Analytics (views / calls / review counts)

- **Repo root:** `c:\Users\m8978\Documents\Stravon Tech Labs\Company Projects\Pedu Rentals\System\golden_rentals`
- **Branch:** `MPESA-INTEGRATION` · Commit: `2549e459314ba92b36a65f9c947c2daf625273c1`
- **Date:** 2026-09-09
- **Audit type:** READ-ONLY (no files modified, no deletions, no TODOs added). Pre-PostHog blast-radius map.
- **Project attribution key:**
  - `legacy` = primary Supabase project (`Property_Listing`, `listing_reviews`, `Listers_Info`, `page_visits`, `call_events`, `Payment_Ledger`) via `createServerSupabaseClient` / `createBrowserSupabaseClient` / `createAdminClient`.
  - `payments` = payments Supabase project (`listings_table`, `reviews_table`, `review_reactions`, `users_table`) via `paymentsSupabase`.
  - `neither` = not tied to a DB project (wire/shape/marketing/docs only), or out-of-band object with no DDL in repo.
- **Scope searched:** `app/`, `lib/`, `schema/`, `scripts/`, repo root docs (`.md`, `.js`, `.jsx`, `.sql`).

---

## WRITE SITES

### 1a. Server-side API routes that write counters / event rows

| # | File path | Line(s) | Description | Supabase project |
|---|-----------|---------|-------------|------------------|
| 1 | `app/api/listings/[id]/view/route.js` | 9 | `supabase.rpc('increment_views', { listing_id_input })` — increments `Property_Listing.views`. Uses the **browser (anon) client** in a server route (`createBrowserSupabaseClient` lines 2/4). | legacy |
| 2 | `app/api/listings/[id]/calls/route.js` | 8 | `supabase.rpc('increment_call_logs', { listing_id_input })` — increments `Property_Listing.call_logs`. | legacy |
| 3 | `app/api/listings/[id]/reviews/route.js` | 56–63 | POST inserts into `listing_reviews` (drives every `review_count`/`avg_rating` aggregate). | legacy |
| 4 | `app/api/listings/[id]/feedback/route.js` | 22–29 | POST inserts into the **same** `listing_reviews` table under a random UUID fingerprint (duplicate of reviews POST). | legacy |
| 5 | `app/api/v1/listings/reviews/route.js` | 53–61 | POST inserts into `reviews_table` (payments), then calls `recalculateListingRating` (line 73). | payments |
| 6 | `app/api/v1/listings/reviews/[review_id]/react/route.js` | 12–16 | POST inserts into `review_reactions` (review like/dislike counters; no DDL in repo). | payments |
| 7 | `lib/reviews/sync.js` | 17–20 | `recalculateListingRating` — writes `avg_rating` + `review_count` (aggregate counters) back onto `listings_table`. | payments |
| 8 | `app/api/adminRo/analytics/route.js` | 11–13 | POST inserts a page-visit row into `page_visits` (feed for admin "Total Visits"). | legacy |

### 1b. Client trigger sites (onClick / useEffect / hook that fire the increment calls)

| # | File path | Line(s) | Description | Supabase project |
|---|-----------|---------|-------------|------------------|
| 1 | `app/(user)/properties/[id]/components/ViewTracker.jsx` | 9–11 | `useEffect` fires `fetch('/api/listings/${listingId}/view', { method: 'POST' })` on every detail-page mount (dep `[listingId]`). Mounted from `app/(user)/properties/[id]/page.jsx:99`. | legacy |
| 2 | `app/(user)/properties/[id]/components/ViewTracker.jsx` | 7 | Calls `useTrackVisit()` → page-visit POST (see #5). | legacy |
| 3 | `app/(user)/properties/components/PropertyCard.jsx` | 137–159 | `onClick` on call (tel) button — `fetch('/api/listings/${listing_id}/calls', { method: 'POST' })` at **line 156** before `tel:` redirect. | legacy |
| 4 | `app/(user)/properties/components/PropertyCardV1.jsx` | 230–258 | `onClick` on call (tel) button — `fetch('/api/listings/${listing_id}/calls', { method: 'POST' })` at **line 254**. NOTE: card renders v1 `listings_table` data but increments the **legacy** `Property_Listing.call_logs`. | legacy (write) / payments (row) |
| 5 | `app/hooks/useTrackVisit.js` | 7–18 | `useEffect` POSTs `{ path }` to `/api/adminRo/analytics` (page-visit counter), sessionStorage-deduped. | legacy |
| 6 | `app/(user)/properties/PropertiesClient.jsx` | 48 | `useTrackVisit()` call site — properties browse page visit counter. | legacy |
| 7 | `app/(user)/properties/[id]/components/detailsHero.jsx` | 139–163 | `handleSubmitReview` — `fetch('/api/v1/listings/reviews', { method: 'POST' })` at **line 154** (payments review write); submit button `onClick={handleSubmitReview}` at **line 555**. | payments |
| 8 | `app/(user)/properties/components/ReviewPrompt.jsx` | 50–58 | `handleSubmit` — `fetch('/api/listings/${pending.listing_id}/reviews', { method: 'POST' })` at **line 50** (legacy review write). | legacy |
| 9 | `app/(user)/properties/[id]/components/reviewPrompt.jsx` | 33–41 | `handleSubmit` — `fetch('/api/listings/${listing_id}/feedback', { method: 'POST' })` at **line 33** (legacy feedback write). Component not currently rendered (`app/(user)/properties/[id]/page.jsx:119` commented) but remains wired. | legacy |

---

## READ SITES

### 2a. API routes that read / aggregate the counters

| # | File path | Line(s) | Description | Supabase project |
|---|-----------|---------|-------------|------------------|
| 1 | `app/api/analytics/listings/route.js` | 17 | RPC `get_analytics_listings` — per-listing `views`, `call_logs`, `avg_rating`, `review_count`. | legacy |
| 2 | `app/api/analytics/summary/route.js` | 16 | RPC `get_lister_analytics` — `totalViews`, `totalCalls`, `totalReviews`. | legacy |
| 3 | `app/api/adminRo/analytics/route.js` | 35–53 | GET — reads `page_visits` by date range, groups into `{date, visits}`. | legacy |
| 4 | `app/api/adminRo/revenue/route.js` | 26–28, 46–48 | GET — `totalCalls` = exact count of `call_events` rows (no write site for `call_events` exists in this repo). | legacy |
| 5 | `app/api/adminRo/verification/route.js` | 22, 84–85 | GET — selects `views` column (line 22); builds `review_count` (84) and `avg_rating` (85) from `listing_reviews`. | legacy |
| 6 | `app/api/Admin/route.js` | 18–23 | GET — admin dashboard counts; `totalVisits` hardcoded `0` (line 22). | legacy |
| 7 | `app/api/listings/route.js` | 54–63 | Public paginated fetch via `get_listings_paginated` RPC — rows include `views`, `avg_rating`, `review_count`. | legacy |
| 8 | `app/api/listings/trending/route.js` | 13–23 | Public top-10 via same RPC — the "most viewed" feed (score is 70% views). | legacy |
| 9 | `app/api/listings/[id]/route.js` | 21–25, 187–191 | GET/PATCH single listing via same RPC — public payload includes `views`, `avg_rating`, `review_count` (not `call_logs`). | legacy |
| 10 | `app/api/v1/listings/public/route.js` | 132–141, 175–176, 236 | Merged public endpoint — legacy branch via `get_listings_paginated`; legacy rows remapped to expose `avg_rating` (175) + `review_count` (176); final ordering via `rankListings` (236). `views` not carried into merged payload. | legacy + payments |
| 11 | `app/api/v1/listings/[id]/route.js` | 27–36 | Single v1 listing — select omits all analytics columns (no counters exposed). | payments |
| 12 | `app/api/search/route.js` | 58 | Fuzzy RPC `search_listings_fuzzy` — returns **no** analytics columns (verified: `schema/RPC/fuzzy_listing.sql:1–49`). Listed for completeness. | legacy |
| 13 | `app/api/v1/listings/reviews/route.js` | 13–24 (GET) | GET reviews from `reviews_table` (read side of review surface). | payments |

### 2b. Client components rendering views / call_logs / review_count

| # | File path | Line(s) | Description | Supabase project |
|---|-----------|---------|-------------|------------------|
| 1 | `app/(lister)/Lister/components/Analytics.jsx` | 264–278 | Fetches `/api/analytics/summary` (265) and `/api/analytics/listings` (273). | legacy |
| 2 | `app/(lister)/Lister/components/Analytics.jsx` | 219–233 | Listing row renders `views` (221), `call_logs` (225), `avg_rating` (229), `review_count` (232). | legacy |
| 3 | `app/(lister)/Lister/components/Analytics.jsx` | 295–297 | Summary cards `totalViews`, `totalCalls`, `totalReviews`. | legacy |
| 4 | `app/(lister)/Lister/components/Analytics.jsx` | 76–82, 129–133 | Reviews modal fetches `/api/listings/{id}/reviews` (77), renders `avg_rating` (129) + `review_count` (133); row `onClick` opens modal at 185. | legacy |
| 5 | `app/(lister)/Lister/components/ListingsSummary.jsx` | 33, 41–42, 84–98 | Fetches `/api/analytics/summary`; renders `totalViews` (88) and `totalCalls` (96). | legacy |
| 6 | `app/(lister)/Lister/components/TopPerfomer.jsx` | 54–57 | Browser-client select of `views, call_logs` from `Property_Listing` (line 56). | legacy |
| 7 | `app/(lister)/Lister/components/TopPerfomer.jsx` | 81–96 | `score = (views + call_logs + reviewCount)/3` (83); totals (92–96) — powers "Most Performed Property" (187). | legacy |
| 8 | `app/(lister)/Lister/components/TopPerfomer.jsx` | 220–223, 244–251 | Renders Views/Calls/Reviews `MetricBar`s and second-place `call_logs`/`views`. | legacy |
| 9 | `app/(lister)/Lister/components/TopPerfomer.jsx` | 67–70 | Lists `listing_reviews` ratings for the same score. | legacy |
| 10 | `app/(admin)/Admin/components/VerificationList.jsx` | 132, 138, 141 | Renders listing `views`, `avg_rating`, `review_count` (data from `/api/adminRo/verification`). | legacy |
| 11 | `app/(admin)/Admin/components/VerificationDetail.jsx` | 179 | Renders `listing.review_count` Reviews. | legacy |
| 12 | `app/(admin)/Admin/components/dashboard.jsx` | 12, 39, 54, 76–86 | Admin "Total Visits" card — backed by `GET /api/adminRo/analytics?start=...&end=...` (80) summing `row.visits` (83); also consumes `/api/Admin` (51) and `/api/adminRo/revenue` (67, `totalCalls` 72). | legacy |
| 13 | `app/(admin)/Admin/components/GrowthMetricsChart.jsx` | 28–34, 72 | Platform-growth visits chart — `/api/adminRo/analytics`, plots `dataKey="visits"`. | legacy |
| 14 | `app/(admin)/Admin/components/Analytics.jsx` | 40–124 | Admin revenue + lister-growth charts — does **not** read views/calls/reviews (listed to disambiguate from lister `Analytics.jsx`). | neither |
| 15 | `app/(user)/properties/[id]/components/detailsHero.jsx` | 70, 377–384 | Public detail page destructures `review_count` (70) and renders `avg_rating`/`review_count` (377–384). | legacy (row) / payments (`?src=v1` lacks these) |
| 16 | `app/(user)/home/components/TrendingListingsSection.jsx` | 10, 24–26, 39 | Consumes `/api/listings/trending` (10) — spec copy "most viewed and highest rated listings" (39). | legacy |

### 2c. Ranking / sorting logic that consumes the counters (cross-reference)

| # | File path | Line(s) | Description | Supabase project |
|---|-----------|---------|-------------|------------------|
| 1 | `lib/ranking/rankListings.js` | 26–49 | Bayesian weighted rating — consumes `review_count` + `avg_rating` (NOT views / call_logs). Used by merged public route (`app/api/v1/listings/public/route.js:236`). | payments + legacy |
| 2 | `schema/RPC/property-listing.sql` | 136–147, 164–170, 190–195 | `score = (0.7*views + 0.3*avg_rating*review_count) / (1+hours)^decay` → deciles → hot/warm/cold ordering. The "most viewed" ranking behind `/api/listings`, `/api/listings/[id]`, `/api/listings/trending`, legacy branch of `/api/v1/listings/public`. | legacy |
| 3 | `app/(lister)/Lister/components/TopPerfomer.jsx` | 83, 87 | Client-side "Most Performed Property" — `score = (views + call_logs + reviewCount)/3`, sort at line 87. | legacy |

### 2d. Public listing-response exposure of the counters (cross-reference)

| # | File path | Line(s) | Description | Supabase project |
|---|-----------|---------|-------------|------------------|
| 1 | `app/api/listings/route.js` | 54–63 | Public list responses include `views`, `avg_rating`, `review_count`. | legacy |
| 2 | `app/api/listings/[id]/route.js` | 21–25, 187–191 | Public detail responses include `views`, `avg_rating`, `review_count`. | legacy |
| 3 | `app/api/v1/listings/public/route.js` | 175–176 | Merged public responses expose `avg_rating` + `review_count` for legacy-sourced rows. | legacy (rows) |
| 4 | `app/api/v1/listings/[id]/route.js` | 27–36 | No counter fields on `?src=v1` detail pages. | payments |
| 5 | `app/(user)/properties/[id]/page.jsx` | 99 | Renders `<ViewTracker>` on every public detail page — the public trigger that inflates `views` and `page_visits`. | legacy |

---

## SCHEMA SURFACE

### 3a. Legacy Supabase project (primary — `Property_Listing`)

| # | File path | Line(s) | Description | Supabase project |
|---|-----------|---------|-------------|------------------|
| 1 | `schema/RPC/get-analytics-listing.sql` | 1–45 | `get_analytics_listings(uuid)` — returns `views`, `call_logs`, `avg_rating`, `review_count` (output table 4–14; aggregation 20–42). | legacy |
| 2 | `schema/RPC/get-lister-analytics.sql` | 1–21 | `get_lister_analytics(uuid)` — sums `totalViews` (8), `totalCalls` (9), `totalReviews` (10) over `Property_Listing` + `listing_reviews`. | legacy |
| 3 | `schema/RPC/property-listing.sql` | 1–197 | `get_listings_paginated(...)` — the ranking RPC. Reads `views` (116/185), aggregates `avg_rating`/`review_count` (90–99, 117–118), score formula 137, deciles 164–170, ordering 190–195. | legacy |
| 4 | `schema/reviews table/reviews.sql` | 1–21 | `listing_reviews` table DDL — the row store behind every `review_count`/`avg_rating` aggregate; unique `(listing_id, fingerprint)` index line 18. | legacy |
| 5 | `schema/webhooks/schma.sql` | 1–87 | DB trigger functions (`notify_new_listing`, `notify_listing_deleted`, `notify_new_account`, `notify_account_deleted`) POST to `/api/webhooks/notifications`. **No view/call/review event webhook exists** — lifecycle only. Receiver: `app/api/webhooks/notifications/route.js`. | legacy |
| 6 | `schema/PropertyListing rpc/RPCDocs.md` | 15–20 | Documentation record that `Property_Listing` has `views bigint default 0`, `call_logs bigint default 0`, dormant `rating bigint`. **Table DDL NOT versioned in repo.** | legacy |
| 7 | `schema/PropertyListing rpc/RPCDocs.md` | 107–109, 200, 340, 354–356 | Documents score formula (`0.7*views + 0.3*avg_rating*review_count`), RPC output columns, deferred `call_logs` scoring. | legacy |
| 8 | `schema/PropertyListing rpc/RPCDocs.md` | 346 | Documents DB trigger `on_call_log_increment` firing after every `call_logs` update. **Trigger DDL NOT versioned anywhere in repo.** | legacy |
| 9 | `schema/PropertyListing rpc/RPCDocs.md` | 198–200 | Documents `get_listings_paginated` output including `views`, `avg_rating`, `review_count`. | legacy |
| 10 | — (no file) | — | `increment_views` RPC — called at `app/api/listings/[id]/view/route.js:9`; **no `.sql` in repo** (live/out-of-band). | legacy |
| 11 | — (no file) | — | `increment_call_logs` RPC — called at `app/api/listings/[id]/calls/route.js:8`; **no `.sql` in repo**. | legacy |
| 12 | — (no file) | — | `page_visits` table — written/read at `app/api/adminRo/analytics/route.js:12,36`; **no DDL in repo**. | legacy |
| 13 | — (no file) | — | `call_events` table — counted at `app/api/adminRo/revenue/route.js:27`; **no DDL in repo and no write site in this repo** (dead or externally written). | legacy |

### 3b. Payments Supabase project (v1 / `listings_table`)

| # | File path | Line(s) | Description | Supabase project |
|---|-----------|---------|-------------|------------------|
| 1 | `schema/project_schemas/schemas.sql` | 29–54 | `listings_table` DDL — versioned columns have **no** `views`/`call_logs`/`review_count`/`avg_rating`; only counter-adjacent column is `payment_status`. | payments |
| 2 | `lib/reviews/sync.js` | 17–20 | Writes `avg_rating` + `review_count` onto `listings_table` — these two columns **were added live but are absent from versioned `schemas.sql`** (out-of-band schema drift). | payments |
| 3 | `app/api/v1/listings/reviews/route.js` | 13–18, 40–63 | Reads/writes `reviews_table` (payments). **`reviews_table` DDL not in repo.** | payments |
| 4 | `app/api/v1/listings/reviews/[review_id]/react/route.js` | 12–16 | Writes `review_reactions` (payments). **DDL not in repo.** | payments |
| 5 | `schema/project_schemas/schemas.sql` | 57–116 | `payments_table`, `subscriptions_table`, `images_table`, `users_table`, `listing_abandon_log` — none store view/call counters (included for completeness). | payments |

### 3c. Unrelated schema touched for completeness

| # | File path | Line(s) | Description | Supabase project |
|---|-----------|---------|-------------|------------------|
| 1 | `schema/pg_trgm/schma.sql` | 1–3 | pg_trgm extension + trigram index on `Property_Listing.property_name`. No counters. | legacy |
| 2 | `schema/tables_rpc/wards.sql`, `schema/tables_rpc/mapping.sql` | 1–9, 1–9 | `wards_table` / `ward_id_mapping` — ward-name resolution only. No counters. | payments (wards) / legacy (mapping) |

---

## Key gaps an engineer must know before the PostHog swap

- **No write path for `call_events` exists in this repo**, yet admin `totalCalls` reads it — replacing the manual system will orphan/desync this counter. (`app/api/adminRo/revenue/route.js:26–28`)
- **Two parallel review counters on two projects:** legacy `listing_reviews` (via `reviews` + duplicate `feedback` routes) and payments `reviews_table` → `listings_table.avg_rating/review_count` (`lib/reviews/sync.js`). A PostHog event replaces neither stored aggregate automatically.
- **`Property_Listing` counter columns (`views`, `call_logs`, `rating`) have no versioned DDL**, and `increment_views`, `increment_call_logs`, and the `on_call_log_increment` trigger exist only live / in prose (`schema/PropertyListing rpc/RPCDocs.md:346`). Removal must be coordinated against the live DB.
- **`GET /api/listings` and `GET /api/listings/[id]` still expose `views`/`avg_rating`/`review_count` to public callers**, and the public properties grid is ordered by the views-weighted score (`schema/RPC/property-listing.sql:137`). PostHog-as-source-of-truth changes both the RPC score and the response shape.
- **`Golden_Rentals_System_Documentation`** (per task brief) is **not present in this repo** (searched). Its "most viewed / most contacted" admin specs map, in-repo, to `TopPerfomer.jsx` ("Most Performed Property", `app/(lister)/Lister/components/TopPerfomer.jsx:83,187`) and the trending feed label (`app/(user)/home/components/TrendingListingsSection.jsx:39`).