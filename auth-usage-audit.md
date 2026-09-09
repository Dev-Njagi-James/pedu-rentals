# Auth Usage Audit — requireAuth() / requireRole() call-site classification

**Audit-only task. Zero source files modified (this report is the only artifact).**

- Date: 2026-09-09
- Scope: `app/api/` (all `route.js`). `node_modules`, `.next` excluded.
- Method: every `requireAuth()` / `requireRole()` call site traced to each subsequent use of the returned `user.id` (or `user` destructure) and classified by the target table's key scheme. Client choice (`createServerSupabaseClient` / `createAdminClient` / `paymentsSupabase`) was cross-checked against the actual table name in each query.
- `requireAuth()` / `requireRole()` return `user = { id: legacyUserId }` — the **legacy UUID** resolved from `auth_identity_map` by Clerk session (`lib/auth/session.js:35-43`).

## Classification table

| File | Line | requireAuth or requireRole | Downstream usage line | Target table | Classification |
|---|---|---|---|---|---|
| `app/api/account/auth/route.js` | 6 | requireAuth | n/a — uses `user.email` (lines 16/23/29), never `user.id` in a query | — (`supabase.auth.updateUser`, session-keyed) | NEITHER — auth gate only; note: `user.email` is not returned by `requireAuth` (`{ id }` only), so those comparisons are always `undefined` (latent bug, unrelated to id rewrite) |
| `app/api/account/profile/route.js` | 6 | requireAuth | `.eq('lister_UUID', user.id)` (line 18, select) and line 46 (update) | `Listers_Info` (primary project, legacy UUID key) | LEGACY |
| `app/api/account/route.js` | 6 | requireAuth | `.eq('lister_UUID', user.id)` (line 16) | `Listers_Info` (primary, legacy UUID) | LEGACY |
| `app/api/account/sync-email/route.js` | 6 | requireAuth | `.eq('lister_UUID', user.id)` (line 16) and line 30 | `Listers_Info` (primary, legacy UUID) | LEGACY |
| `app/api/adminRo/account/route.js` | 6 | requireAuth (GET) | `.eq('lister_uuid', user.id)` (line 16) | `Admin Table` (primary project, legacy `lister_uuid`) | LEGACY |
| `app/api/adminRo/account/route.js` | 25 | requireAuth (PATCH) | `.eq('lister_uuid', user.id)` (lines 43, 70) | `Admin Table` (primary, legacy `lister_uuid`) | LEGACY |
| `app/api/adminRo/notifications/route.js` | 9 | requireRole('admin') | n/a — `notifications` queried with no user filter (line 16-19) | `notifications` (primary) | NEITHER — role gate only |
| `app/api/adminRo/notifications/route.js` | 40 | requireRole('admin') | n/a — updates by `ids`/`all` (lines 53-63) | `notifications` (primary) | NEITHER — role gate only |
| `app/api/adminRo/settings/route.js` | 35 | requireAuth (PATCH) | n/a — updates `system_settings` by `action` (line 47-50) | `system_settings` (primary) | NEITHER — auth gate only |
| `app/api/adminRo/verification/route.js` | 9 | requireAuth (GET) | n/a — bulk `Property_Listing` by `listing_id` (16-29); `Listers_Info` by `.in('lister_UUID', userIds)` where `userIds` derives from **DB** `listing.user_id` (line 36), not auth `user.id` | `Property_Listing`, `Listers_Info`, `listing_reviews` (primary) | NEITHER — auth gate only; no use of auth-provided `user.id` |
| `app/api/adminRo/verification/[id]/route.js` | 14 | requireAuth (GET) | n/a — ownership derives from **DB** `plRow.user_id` (line 48), compared against `Listers_Info.lister_UUID` (line 60), never auth `user.id` | `Property_Listing`, `Listers_Info`, `listing_reviews` (primary) | NEITHER — auth gate only |
| `app/api/analytics/listings/route.js` | 10 | requireAuth | `rpc('get_analytics_listings', { p_user_id: user.id })` (line 18) | RPC `get_analytics_listings` → `WHERE pl.user_id = p_user_id` on `Property_Listing` (`schema/RPC/get-analytics-listing.sql:34`) | LEGACY |
| `app/api/analytics/summary/route.js` | 9 | requireAuth | `rpc('get_lister_analytics', { p_user_id: user.id })` (line 17) | RPC `get_lister_analytics` → `WHERE pl.user_id = p_user_id` on `Property_Listing` (`schema/RPC/get-lister-analytics.sql:18`) | LEGACY |
| `app/api/cloudinary-sign/route.js` | 12 | requireAuth | n/a — `user.id` unused (Cloudinary signature only) | none | NEITHER — auth gate only |
| `app/api/Listing/route.js` | 12 | requireAuth (GET — "my listings") | `.eq('user_id', user.id)` (line 44) | `Property_Listing` (primary, legacy `user_id` UUID) | LEGACY |
| `app/api/Listing/route.js` | 83 | requireAuth (DELETE) | `.eq('user_id', user.id)` (line 102 ownership verify; line 137 delete) | `Property_Listing` (primary, legacy `user_id`) | LEGACY |
| `app/api/listings/[id]/route.js` | 54 | requireAuth (PATCH) | `if (existing.user_id !== user.id)` (line 72) — ownership check on edit, compares against `Property_Listing.user_id` fetched at line 65 | `Property_Listing` (primary, legacy `user_id`) | LEGACY — ownership comparison, not a filter, but keyed by the legacy UUID: would always mismatch (403) after a Clerk-id rewrite |
| `app/api/v1/analytics/listings/route.js` | 12 | requireAuth | `.eq('lister_uuid', user.id)` (line 20) | `listings_table` (payments project) | V1 |
| `app/api/v1/listings/finalize/route.js` | 20 | requireAuth | `if (listingRow.lister_uuid !== user.id)` (line 62) — ownership gate before images insert | `listings_table` (payments) | V1 — ownership comparison against v1 key |
| `app/api/v1/listings/me/route.js` | 6 | requireAuth | `.eq('lister_uuid', user.id)` (line 31) | `listings_table` (payments) | V1 |
| `app/api/v1/listings/route.js` | 117 | requireAuth (POST) | `lister_uuid: user.id` upsert into `users_table` (line 186); `lister_uuid: user.id` insert into `listings_table` (line 214) | `users_table`, `listings_table` (payments) | V1 |
| `app/api/v1/listings/[id]/cancel/route.js` | 7 | requireAuth | `if (listingRow.lister_uuid !== user.id)` (line 43) — ownership gate before delete | `listings_table` (payments) | V1 — ownership comparison against v1 key |
| `app/api/v1/payments/initiate/route.js` | 11 | requireAuth | `lister_uuid: user.id` insert into `payments_table` (line 71) | `payments_table` (payments) | V1 |
| `app/api/v1/payments/status/[checkoutRequestId]/route.js` | 6 | requireAuth | `if (payment.lister_uuid !== user.id)` (line 26) — ownership check on payment status | `payments_table` (payments) | V1 — ownership comparison against v1 key |
| `app/api/v1/plans/pricing/route.js` | 6 | requireAuth | n/a — `plan_category_pricing` unfiltered by user (line 16-26) | `plan_category_pricing` (payments) | NEITHER — auth gate only |
| `app/api/v1/plans/route.js` | 7 | requireAuth | n/a — filtered by `category_name` only (line 30) | `plan_category_pricing` (payments) | NEITHER — auth gate only |
| `app/api/v1/users/me/route.js` | 6 | requireAuth (GET) | `.eq('lister_uuid', user.id)` (line 15) | `users_table` (payments) | V1 |
| `app/api/v1/users/me/route.js` | 30 | requireAuth (PATCH) | `.eq('lister_uuid', user.id)` (line 62) | `users_table` (payments) | V1 |

---

## Key cross-cutting finding (do not miss)

The task brief assumes V1 payments tables are "keyed by Clerk UUID" and therefore safe. **That assumption is false in this repo.** Per the in-repo schema:

- `schema/project_schemas/auth_identity_map.sql:12-14`: "**legacy_user_id** (== users_table.lister_uuid). listings_table.lister_uuid and payments_table.lister_uuid are NOT re-keyed; they keep referencing the legacy users_table.lister_uuid throughout the migration."
- `schema/project_schemas/auth_identity_map.sql:18`: "`legacy_user_id uuid not null unique, -- == users_table.lister_uuid`"
- `schema/project_schemas/schemas.sql:50,71`: `listings_table.lister_uuid` and `payments_table.lister_uuid` both `REFERENCES users_table (lister_uuid)`.

So `users_table.lister_uuid`, `listings_table.lister_uuid`, and `payments_table.lister_uuid` all store the **legacy UUID** — exactly the value `requireAuth()` returns today. If `session.js` is rewritten to return a Clerk-native `user.id` (`user_2xx…`), **every V1 `lister_uuid = user.id` filter/insert/comparison breaks too** — a Clerk id matches neither the primary-project legacy keys nor the payments-project legacy keys. Only the `NEITHER` rows are truly safe. (The only table keyed by the Clerk id is `auth_identity_map.clerk_user_id`, and only `app/api/v1/auth/sync/route.js` touches it — it does not use `requireAuth`.)

## Specifically requested checks

| Requested item | Finding |
|---|---|
| `app/api/listings/[id]/route.js` (PATCH) — ownership check on edit | Exists: `if (existing.user_id !== user.id)` at line 72, comparing against `Property_Listing.user_id` fetched at line 65. LEGACY-keyed → always 403 after a Clerk-id rewrite. |
| `app/api/AddListing/route.js` — insert with user.id | **Does not exist.** Confirmed via full `app/api` tree listing — there is no `app/api/AddListing` route (the `API_AUDIT_REPORT.md` references to `app/api/AddListing/media/route.js` are stale; that file is also gone). The add-listing insert with `user.id` now lives at `app/api/v1/listings/route.js:186` (`users_table` upsert) and `:214` (`listings_table` insert). V1-classified above. |
| `app/api/Listing/route.js` — "my listings" fetch | GET at line 12 + `.eq('user_id', user.id)` at line 44 on `Property_Listing`. LEGACY (would break). |
| Any `app/(lister)/` backend paths gating by lister ownership | None in scope `app/api/` — there is no `app/(lister)` subtree under `app/api`. Lister pages (`app/(lister)/Lister/components/ListingsSummary.jsx:31-32`, `TopPerfomer.jsx:57`) query Supabase directly from client code with `user.id`, but those are not API route files. |

## Count

**LEGACY (would break on a Clerk-native rewrite): 10** — account/profile, account/route, account/sync-email, adminRo/account GET, adminRo/account PATCH, analytics/listings, analytics/summary, Listing GET, Listing DELETE, listings/[id] PATCH.
**V1 (safe per task framing, but NOTE: also keyed by legacy UUID per schema above → effectively 9 more would break): 9** — v1/analytics/listings, v1/listings/finalize, v1/listings/me, v1/listings POST, v1/listings/[id]/cancel, v1/payments/initiate, v1/payments/status, v1/users/me GET, v1/users/me PATCH.
**NEITHER (truly safe — auth/role gate only, `user.id` unused in a DB query): 9** — account/auth, adminRo/notifications GET, adminRo/notifications PATCH, adminRo/settings PATCH, adminRo/verification GET, adminRo/verification/[id] GET, cloudinary-sign, v1/plans/pricing, v1/plans.

---

*Generated by the auth-usage audit. Source files untouched.*