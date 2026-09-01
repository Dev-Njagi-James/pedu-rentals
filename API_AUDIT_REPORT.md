# Pedu Rentals Backend — Current-State Audit for Modular Migration

Scope: `golden_rentals` repo (single backend serving Pedu Rentals). Read-only audit. No code changes.

---

## Step 1 — Inventory of Current API Surface

All routes live under `app/api/`. No versioning prefix exists anywhere (confirmed — no `/api/v1/*` paths). Two Supabase projects are referenced: **primary** `vpxntpbxqmfwavhagovz` and **payments** `rwkrqtirepchzaquiubi`.

| # | Path | Method(s) | Supabase Project | Client | Notes |
|---|------|-----------|------------------|--------|-------|
| 1 | `/api/listings` | GET | primary | createServerSupabaseClient | Public, paginated + filtered listing fetch via `get_listings_paginated` RPC; ward names resolved via payments `wards_table` |
| 2 | `/api/listings/trending` | GET | primary | createServerSupabaseClient | Public, top-10 scored listings |
| 3 | `/api/listings/[id]` | GET, PATCH | primary | createServerSupabaseClient | GET = single listing; PATCH = owner edit (2-day window), image replacement via Supabase Storage bucket `listing-images` |
| 4 | `/api/listings/[id]/reviews` | GET, POST | primary | createServerSupabaseClient | GET = fetch reviews; POST = submit review (fingerprint-based) |
| 5 | `/api/listings/[id]/feedback` | POST | primary | createServerSupabaseClient | **Duplicate** of reviews POST — inserts into same `listing_reviews` table with a random UUID fingerprint |
| 6 | `/api/listings/[id]/calls` | POST | primary | createServerSupabaseClient | Increments `call_logs` via `increment_call_logs` RPC |
| 7 | `/api/listings/[id]/view` | POST | primary | createBrowserSupabaseClient (anon) | Increments `views` via `increment_views` RPC; uses browser client in a server route |
| 8 | `/api/listings/[id]/listerInfo` | GET | primary | createClient (service role, inline) | Returns lister username + org for a listing |
| 9 | `/api/Listing` (capital L) | GET, DELETE | primary | createServerSupabaseClient | Owner dashboard: GET = own listings w/ media; DELETE = delete listing + Cloudinary assets |
| 10 | `/api/AddListing` | POST | primary | createServerSupabaseClient | Creates `Property_Listing` row (text fields only) |
| 11 | `/api/AddListing/media` | POST | primary | createServerSupabaseClient | Inserts `images_table` rows from Cloudinary URLs; rollback deletes Cloudinary assets + listing |
| 12 | `/api/auth` | POST | primary | createAdminClient | Signup (creates auth user + `Listers_Info`) and login (username lookup → returns email + role) |
| 13 | `/api/account` | GET | primary | createServerSupabaseClient | Fetch own lister profile |
| 14 | `/api/account/profile` | PATCH | primary | createServerSupabaseClient | Update own lister profile fields |
| 15 | `/api/account/auth` | PATCH | primary | createServerSupabaseClient | Update own email/password |
| 16 | `/api/account/sync-email` | POST | primary | createServerSupabaseClient | Sync `Listers_Info.lister_email` to auth email |
| 17 | `/api/analytics/listings` | GET | primary | createServerSupabaseClient | Per-listing analytics via `get_analytics_listings` RPC |
| 18 | `/api/analytics/summary` | GET | primary | createServerSupabaseClient | Aggregate analytics via `get_lister_analytics` RPC (totalViews, totalCalls, totalReviews) |
| 19 | `/api/Admin` | GET | primary | createServerSupabaseClient | Admin dashboard counts (activeListings, registeredListers; suspendedListings & totalVisits hardcoded 0) |
| 20 | `/api/adminRo/account` | GET, PATCH | primary | createServerSupabaseClient | Admin profile fetch/update (username, email, password) |
| 21 | `/api/adminRo/analytics` | GET, POST | primary | createServerSupabaseClient | POST = record page visit; GET = aggregated visits by date range |
| 22 | `/api/adminRo/listerGrowth` | GET | primary | createServerSupabaseClient | Lister signups by date range |
| 23 | `/api/adminRo/notifications` | GET, PATCH | primary | createServerSupabaseClient | Fetch notifications; mark read (all or by ids) |
| 24 | `/api/adminRo/revenue` | GET | primary | createServerSupabaseClient | Total revenue + transactions (from `Payment_Ledger`) + total calls (from `call_events`) |
| 25 | `/api/adminRo/revenueChart` | GET | primary | createServerSupabaseClient | Revenue by date from `Payment_Ledger` |
| 26 | `/api/adminRo/settings` | GET, PATCH | primary | createServerSupabaseClient | Read/update `system_settings` (mpesa_enabled, edit_window_days) |
| 27 | `/api/adminRo/verification` | GET | primary | createServerSupabaseClient + createAdminClient | Admin listing verification list w/ review stats + lister status |
| 28 | `/api/adminRo/verification/[id]` | GET | primary | createServerSupabaseClient + createAdminClient | Single listing verification detail w/ reviews + other listings |
| 29 | `/api/payments` | GET, POST | primary | createServerSupabaseClient + createAdminClient | **Legacy Buni** M-Pesa: add_slots, buni_callback; GET = slots/status. Writes `Pending_Payments`/`Payment_Ledger` on **primary** project |
| 30 | `/api/subscription` | GET, POST | primary + **payments** | createServerSupabaseClient + createAdminClient + paymentsSupabase | **Daraja** M-Pesa: add_slots, mpesa_callback; GET = slots/status. Writes `Pending_Payments`/`Payment_Ledger` on **payments** project |
| 31 | `/api/search` | GET | primary | createServerSupabaseClient | Search: exact (ilike) + fuzzy (`search_listings_fuzzy` RPC) |
| 32 | `/api/filters` | GET | primary + **payments** | createServerSupabaseClient + paymentsSupabase | Wards from payments `wards_table`; categories/types from primary |
| 33 | `/api/contact` | POST | — (Resend) | — | Contact form email via Resend |
| 34 | `/api/cloudinary-sign` | POST | primary | createServerSupabaseClient | Generates Cloudinary signed upload params (auth-gated) |
| 35 | `/api/webhooks/notifications` | POST | primary | createAdminClient | Supabase DB webhook receiver → writes `notifications` table |

**Empty/placeholder directories (no route files):** `app/api/(authentication)`, `app/api/(db-connection)`, `app/api/(first-Tier)/(admin)`, `app/api/(first-Tier)/(lister)`, `app/api/(properties)`, `app/api/(users)`, `app/api/webhooks/logo`.

**Versioning:** None present. All routes are unversioned under `/api/*`.

**Duplicate / overlapping routes:**
- **`/api/payments` (Buni) vs `/api/subscription` (Daraja)** — both implement slot purchase (`add_slots`), payment status lookup (GET), and M-Pesa callback handling. They differ in provider (Buni vs Safaricom Daraja), callback URL, and — critically — which Supabase project they write `Pending_Payments`/`Payment_Ledger` to (primary vs payments). This is the legacy-vs-current payment split.
- **`/api/listings/[id]/reviews` POST vs `/api/listings/[id]/feedback` POST** — both insert into `listing_reviews`. `reviews` uses a client-supplied `fingerprint` (409 on duplicate); `feedback` generates a random UUID fingerprint server-side (no duplicate protection). The frontend `detailsHero.jsx` submits to `/feedback` while the documented flow uses `/reviews`.
- **`/api/Listing` (capital L) vs `/api/listings`** — `Listing` is the owner-scoped dashboard fetch; `listings` is the public fetch. Different scopes, not strictly duplicates, but overlapping table access.

---

## Step 2 — Map Against Target `/api/v1/*` Structure

Legend: **EXISTS** = matches target path/method/shape; **EXISTS-DIFFERENT-SHAPE** = functionally present but different path/method/response; **MISSING** = no current equivalent; **STUB** = placeholder/TODO.

### listings

| Target `/api/v1/listings/*` | Current Equivalent | Status |
|------------------------------|--------------------|--------|
| `GET /listings` (fetch all) | `GET /api/listings` | EXISTS-DIFFERENT-SHAPE (unversioned; response includes pagination wrapper + ward_name resolution) |
| `GET /listings/:id` (fetch one) | `GET /api/listings/[id]` | EXISTS-DIFFERENT-SHAPE |
| `GET /listings?lister_id=` (fetch by lister) | `GET /api/Listing` (owner-scoped, auth-gated) | EXISTS-DIFFERENT-SHAPE (path differs; no `lister_id` query param — uses session user) |
| `POST /listings` (add) | `POST /api/AddListing` + `POST /api/AddListing/media` | EXISTS-DIFFERENT-SHAPE (two-step: text insert then media insert; not atomic) |
| `DELETE /listings/:id` | `DELETE /api/Listing?listing_id=` | EXISTS-DIFFERENT-SHAPE (query param instead of path param; capital-L path) |
| `PATCH /listings/:id` (update) | `PATCH /api/listings/[id]` | EXISTS-DIFFERENT-SHAPE (formData; 2-day edit window; image replacement via Supabase Storage, not Cloudinary) |

### auth

| Target `/api/v1/auth/*` | Current Equivalent | Status |
|-------------------------|--------------------|--------|
| `POST /auth/register` | `POST /api/auth` (mode=signup) | EXISTS-DIFFERENT-SHAPE (mode-switched single route; admin client; creates auth user + `Listers_Info`) |
| `POST /auth/login` | `POST /api/auth` (mode=login) | EXISTS-DIFFERENT-SHAPE (username-based lookup, not email/password; returns email + role, no token) |

### users

| Target `/api/v1/users/*` | Current Equivalent | Status |
|--------------------------|--------------------|--------|
| `PATCH /users/me` (update me) | `PATCH /api/account/profile` (+ `PATCH /api/account/auth` for email/password) | EXISTS-DIFFERENT-SHAPE (split across two routes; lister-only, no admin) |
| `DELETE /users/me` (delete me) | — | **MISSING** (no self-delete route; only DB-level `Listers_Info` DELETE webhook exists) |

### reviews

| Target `/api/v1/reviews/*` | Current Equivalent | Status |
|----------------------------|--------------------|--------|
| `POST /reviews` (post) | `POST /api/listings/[id]/reviews` AND `POST /api/listings/[id]/feedback` | EXISTS-DIFFERENT-SHAPE (two duplicate routes; nested under listings; fingerprint semantics differ) |
| `GET /reviews` (fetch) | `GET /api/listings/[id]/reviews` | EXISTS-DIFFERENT-SHAPE (nested under listings; no global reviews fetch) |

### analytics

| Target `/api/v1/analytics/*` | Current Equivalent | Status |
|------------------------------|--------------------|--------|
| `total_listings` | `GET /api/analytics/listings` (per-listing rows) + `GET /api/analytics/summary` (aggregate) | EXISTS-DIFFERENT-SHAPE (no single total_listings metric; split across two routes) |
| `total_reviews` | `GET /api/analytics/summary` → `totalReviews` | EXISTS-DIFFERENT-SHAPE |
| `total_calls` | `GET /api/analytics/summary` → `totalCalls`; also `GET /api/adminRo/revenue` → `totalCalls` | EXISTS-DIFFERENT-SHAPE (duplicated across lister + admin routes) |
| `total_visits` | `GET /api/adminRo/analytics` (page_visits by range) | EXISTS-DIFFERENT-SHAPE (admin-only; no lister-facing total_visits) |
| `total_payments` | `GET /api/adminRo/revenue` → `totalTransactions` | EXISTS-DIFFERENT-SHAPE |
| `payment_amount` | `GET /api/adminRo/revenue` → `totalRevenue`; `GET /api/adminRo/revenueChart` | EXISTS-DIFFERENT-SHAPE |
| `total_listers` | `GET /api/Admin` → `registeredListers`; `GET /api/adminRo/listerGrowth` | EXISTS-DIFFERENT-SHAPE (admin-only) |

### webhooks

| Target `/api/v1/webhooks/*` | Current Equivalent | Status |
|------------------------------|--------------------|--------|
| listing added | `POST /api/webhooks/notifications` (handles `Property_Listing` INSERT) | EXISTS-DIFFERENT-SHAPE (single generic webhook receiver; DB triggers in `schema/webhooks/schma.sql` POST to it) |
| listing deleted | `POST /api/webhooks/notifications` (handles `Property_Listing` DELETE) | EXISTS-DIFFERENT-SHAPE |
| account created | `POST /api/webhooks/notifications` (handles `Listers_Info` INSERT) | EXISTS-DIFFERENT-SHAPE |
| account deleted | `POST /api/webhooks/notifications` (handles `Listers_Info` DELETE) | EXISTS-DIFFERENT-SHAPE |

### STUB cross-check (detailsHero.jsx TODOs)

| TODO in detailsHero.jsx | Status |
|-------------------------|--------|
| Agent data (`agent_name`, `agent_avatar_url`, `agent_verified`, `agency_name`) not returned by listings endpoint | **STUB** — `GET /api/listings/[id]` and `GET /api/listings` do not return agent fields. A separate `GET /api/listings/[id]/listerInfo` returns only `username` + `organisationName`. No target `/api/v1/*` agent endpoint exists in the doc. |
| Review like/dislike counts not returned by reviews endpoint | **STUB** — `listing_reviews` table has no like/dislike columns; `GET /api/listings/[id]/reviews` returns `review_id, rating, review_text, created_at, fingerprint` only. `detailsHero.jsx` renders `r.likes ?? 0` placeholder. |

---

## Step 3 — Image Upload Path Audit

### Cloudinary call sites

| # | File | What it does | Data written |
|---|------|--------------|--------------|
| 1 | `lib/cloudinary.js` | Server-side `uploadToCloudinary` (upload_stream) + `deleteFromCloudinary` (destroy). Config: cloud `dovo8jgua`, preset `pedu_rentals`. | Returns `{ public_id, secure_url }`; used for rollback deletes |
| 2 | `lib/uploadMedia.js` | **Browser-to-Cloudinary direct upload.** Calls `/api/cloudinary-sign` for signed params, then PUTs FormData to `https://api.cloudinary.com/v1_1/{cloud_name}/{resourceType}/upload`. Returns `{ cloudinary_url, cloudinary_public_id, resource_type }`. | Returns URLs to caller (AddListing.jsx) |
| 3 | `app/api/cloudinary-sign/route.js` | Generates Cloudinary signed upload params (`timestamp`, `signature`, `api_key`, `cloud_name`) for a folder. Auth-gated. | Returns signature JSON to browser |
| 4 | `app/api/AddListing/media/route.js` | Receives `{ cloudinary_url, cloudinary_public_id, resource_type, position }` array; inserts into `images_table` with `storage_provider: 'cloudinary'`. On failure, deletes Cloudinary assets + listing row. | `images_table`: `cloudinary_url`, `cloudinary_public_id`, `position`, `storage_provider='cloudinary'` |
| 5 | `app/api/Listing/route.js` (DELETE) | Fetches `cloudinary_public_id` + `position` from `images_table`, calls `deleteFromCloudinary` (position 0 = video, else image). | Deletes Cloudinary assets on listing delete |
| 6 | `app/api/search/route.js` | Selects `cloudinary_url`, `cloudinary_public_id`, `video_url` from `images_table` for search results. | Read-only |
| 7 | `app/(user)/properties/components/PropertyCard.jsx` | Reads `cloudinary_url` / `image_url` for card thumbnail. | Read-only (client) |
| 8 | `app/(user)/properties/[id]/components/detailsHero.jsx` | Reads `cloudinary_url` / `video_url` / `image_url` for gallery. | Read-only (client) |

**Upload flow (create listing):** `AddListing.jsx` → `POST /api/AddListing` (text) → `uploadListingMedia()` in `lib/uploadMedia.js` (browser→Cloudinary direct) → `POST /api/AddListing/media` (persist URLs). **No Cloudinary webhook/confirmation step exists** — the flow is synchronous: the browser waits for the Cloudinary upload response, then persists.

**Edit flow (PATCH `/api/listings/[id]`):** Uses **Supabase Storage** bucket `listing-images`, not Cloudinary. New images uploaded to Supabase Storage, `images_table` rows deleted + re-inserted with `image_url` (no `cloudinary_url`). This is a second, parallel storage path.

### Mapping to Stravon SCALE SDK

| Current Cloudinary step | SCALE SDK equivalent | Notes |
|-------------------------|----------------------|-------|
| `POST /api/cloudinary-sign` (signed URL generation) | `create()` | Direct replacement — `create()` returns `{ uploadUrl, publicUrl, key, uuid, filename }` |
| Browser PUT to `api.cloudinary.com/v1_1/.../upload` | PUT to `uploadUrl` | Direct replacement |
| (none — no Cloudinary webhook/confirmation) | `complete()` | **No current equivalent exists.** The current flow is synchronous; SCALE's `complete()` is a new step that must be added. |

### Shape mismatches (synchronous Cloudinary response assumptions)

- `lib/uploadMedia.js` reads `data.secure_url` and `data.public_id` from the Cloudinary upload response. SCALE's `create()` returns `{ uploadUrl, publicUrl, key, uuid, filename }` — **no `secure_url` or `public_id`**. The code that maps `cloudinary_url: data.secure_url` and `cloudinary_public_id: data.public_id` will break.
- `app/api/AddListing/media/route.js` expects `m.cloudinary_url` and `m.cloudinary_public_id` and writes `storage_provider: 'cloudinary'`. SCALE returns `publicUrl` and `key` — column mapping and `storage_provider` value must change.
- `app/api/Listing/route.js` DELETE reads `cloudinary_public_id` to delete assets. SCALE has no delete in v1 (storage-only: create → PUT → complete). **No SCALE delete equivalent exists** — asset deletion on listing delete has no SDK path.
- `app/api/search/route.js`, `PropertyCard.jsx`, `detailsHero.jsx` all read `cloudinary_url` / `cloudinary_public_id` columns. These will need to read the SCALE `publicUrl` instead.

### Error-handling gaps vs SCALE typed errors

- `lib/uploadMedia.js` throws a plain `Error('Cloudinary upload failed for ...')` on non-OK response. SCALE throws six typed errors (`ScaleError`, `AuthError`, `RateLimitError`, `ValidationError`, `ServerError`, `TimeoutError`) plus a **plain `Error` on PUT failure**. The current `if (!res.ok) throw new Error(...)` will not distinguish these; a plain `Error` from a failed PUT will be indistinguishable from other failures.
- **`TimeoutError`** — SCALE has a fixed 10s timeout. The current Cloudinary flow has no explicit timeout; a slow Cloudinary upload would hang indefinitely. Under SCALE, a 10s timeout will surface as `TimeoutError` — the current code has no handling for this and no retry.
- **No retry logic in SCALE.** The current flow relies on the browser's single fetch attempt with no retry. `app/api/filters/route.js` has an explicit retry for the wards query, but that's a Supabase query, not the upload path. The upload path (`lib/uploadMedia.js`) has no retry — so no implicit retry behavior is being lost, but the fixed 10s timeout means a single slow attempt now fails hard with no recovery.
- `app/api/AddListing/media/route.js` rollback calls `deleteFromCloudinary` — this is Cloudinary-specific and has no SCALE equivalent.

---

## Step 4 — Gap and Effort Summary

| Component | Current State | Target State | Gap Size | Blocking Dependencies |
|-----------|---------------|--------------|----------|----------------------|
| **API versioning** | All routes unversioned under `/api/*` | Versioned `/api/v1/*` | large | Route restructuring across all 35 routes; client call-site updates |
| **Listings** | Split across `/api/listings`, `/api/Listing`, `/api/AddListing`, `/api/AddListing/media` | Unified `/api/v1/listings/*` (fetch all/one/by lister, add, delete, update) | large | Consolidation of 4 route groups; two-step add must become atomic; delete path (query param → path param) |
| **Auth** | Single mode-switched `/api/auth` (username-based login, admin client) | `/api/v1/auth/register` + `/api/v1/auth/login` | medium | Split route; login semantics (username vs email/password); token issuance |
| **Users** | `/api/account`, `/api/account/profile`, `/api/account/auth`, `/api/account/sync-email` | `/api/v1/users/me` (PATCH + DELETE) | medium | Merge profile/auth/sync routes; **DELETE /users/me is MISSING** |
| **Reviews** | `/api/listings/[id]/reviews` + duplicate `/api/listings/[id]/feedback` | `/api/v1/reviews` (POST + GET) | medium | Resolve duplicate POST routes; fingerprint semantics; like/dislike counts are STUB (no schema) |
| **Analytics** | Split across `/api/analytics/listings`, `/api/analytics/summary`, `/api/Admin`, `/api/adminRo/*` | `/api/v1/analytics/*` (7 metrics) | large | Consolidate 7+ routes; total_listings/total_visits/total_listers not exposed as single metrics; admin vs lister scoping |
| **Webhooks** | Single generic `/api/webhooks/notifications` + DB triggers | `/api/v1/webhooks/*` (4 event types) | small | Path rename; trigger URLs in `schema/webhooks/schma.sql` point to old path |
| **Payments** | **Two parallel routes**: `/api/payments` (Buni, writes primary project) + `/api/subscription` (Daraja, writes payments project) | Single `/api/v1/*` payments surface | large | Provider consolidation (Buni vs Daraja); **cross-project data split** (Pending_Payments/Payment_Ledger on two different Supabase projects); callback URL config |
| **Image upload** | Browser→Cloudinary direct upload + signed URL route + Supabase Storage edit path | Stravon SCALE SDK (create → PUT → complete) | large | SCALE SDK not yet installed (`package.json` has no `@stravon/scale-sdk`); `complete()` step is new (no current equivalent); response shape mismatch (`secure_url`/`public_id` vs `publicUrl`/`key`); no SCALE delete equivalent for listing-delete rollback; no retry + fixed 10s timeout handling; `storage_provider` column value change |
| **Agent data** | `GET /api/listings/[id]/listerInfo` returns only username/org | Agent fields on listing (per detailsHero.jsx TODO) | medium | No target endpoint in doc; STUB in frontend |