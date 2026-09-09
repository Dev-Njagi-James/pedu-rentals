# Route Liveness Audit — frontend call graph for listing routes

**Audit-only task. No source files were modified (this report is the only artifact).**

- Date: 2026-09-09
- Scope: `app/` (page.jsx, layout.jsx, components, including `page.tsx` under `app/(user)/`). `node_modules`, `.next` excluded.
- Method: import-graph tracing, not filename guessing. Every call site below was verified against its containing component's render site in a `page.jsx`/`page.tsx` that is NOT commented out, and that page's reachability from the live nav (`app/(user)/navigation/nav.jsx`, `app/(user)/navigation/footer.jsx`, `app/(user)/layout.tsx`).
- No `axios` usage exists in the codebase — all client calls are `fetch()`.

## Routing model (context for liveness)

| URL | Page | Notes |
|---|---|---|
| `/` | `app/(user)/page.tsx` | **The live properties browse/search page.** Renders `<PropertiesClient />` (line 25). Wrapped by `app/(user)/layout.tsx` (navbar + footer). Reachable from nav "Properties" (`nav.jsx:29`) and footer "Home" (`footer.jsx:133`). |
| `/properties` | `app/(user)/properties/page.jsx` | Marketing/home-style page (Hero, Trending, Browse Categories…). Reachable from nav "Home" (`nav.jsx:36`), footer "Properties" (`footer.jsx:134`), hero CTA (`heroSection.jsx:30`), category cards (`BrowseCategorySection.jsx:80`), "More Listings" (`TrendingListingsSection.jsx:73`). |
| `/properties/[id]` | `app/(user)/properties/[id]/page.jsx` | Detail page; linked from every property card. |
| `/Lister` | `app/(lister)/Lister/page.jsx` | Lister dashboard (auth-guarded by `proxy.js:42`); renders `ListingsPanel`, `AddListing`, `Analytics`. |

---

## LIVE (called by rendered, reachable frontend code)

### `/api/v1/listings/public` — LIVE (3 call sites)

| File path | Line | Reasoning |
|---|---|---|
| `app/(user)/properties/PropertiesClient.jsx` | 42 | Main browse fetch (`fetch('/api/v1/listings/public?…')`). `PropertiesClient` is imported and rendered by `app/(user)/page.tsx:2,25` (root `/`), reachable from nav/footer — not commented out. |
| `app/(user)/properties/components/SearchBar.jsx` | 94 | Search fallback fetch (`/api/v1/listings/public?q=…`) on memory miss. `SearchBar` is rendered by `PropertiesClient.jsx:137` (live, see above), so this fires whenever a live user search exhausts in-memory results. |
| `app/(user)/properties/[id]/components/RelatedListingsCarousel.jsx` | 19 | Related-listings fetch (`/api/v1/listings/public?page=1`). Rendered by `app/(user)/properties/[id]/page.jsx:121` (not commented). The detail page is linked from every card on `/` and `/properties`. |

### `/api/v1/listings/[id]` — LIVE (conditional branch)

| File path | Line | Reasoning |
|---|---|---|
| `app/(user)/properties/[id]/page.jsx` | 40 | `const endpoint = src === 'v1' ? '/api/v1/listings/${id}' : '/api/listings/${id}'` — the v1 branch fires for `?src=v1` URLs. Those URLs are actually produced today: `PropertyCardV1.jsx:218` emits `/properties/{id}?src=v1` whenever `_source === 'v1'`, and the merged feed stamps `_source: 'v1'` on every payments row (`app/api/v1/listings/public/route.js:223`) and `_source: 'legacy'` on legacy rows (line 162). So v1-sourced cards on the live grid/carousel hit this endpoint. |

### `/api/listings/trending` — LIVE (old "most viewed" feed; ranking logic active)

| File path | Line | Reasoning |
|---|---|---|
| `app/(user)/home/components/TrendingListingsSection.jsx` | 10 | `fetch('/api/listings/trending')` in `fetchTrending()`. The component is imported LIVE (not commented) at `app/(user)/properties/page.jsx:2` and rendered at `line 12` (`<TrendingListings />`). That page is `/properties`, linked from nav "Home" (`nav.jsx:36`) and footer (`footer.jsx:134`). There is no `app/(user)/home/page.jsx`; the component lives under `home/` but is rendered from `/properties`. |

### `/api/listings/[id]` — LIVE (conditional default branch + lister edit)

| File path | Line | Reasoning |
|---|---|---|
| `app/(user)/properties/[id]/page.jsx` | 40 | Default (non-`?src=v1`) branch — every legacy-sourced card links plain `/properties/{id}` (`PropertyCard.jsx:128`, `PropertyCardV1.jsx:219`), and the trending feed is 100% legacy rows, so this still fires for all legacy rows and all trending cards. |
| `app/(lister)/Lister/components/AddListing.jsx` | 703 | `fetch('/api/listings/${prefill.listing_id}', …)` — legacy single-listing GET/PATCH used to prefill the edit form. Lister dashboard is a live, auth-guarded route (`proxy.js:42`). |

#### Legacy `[id]`-family sub-routes on the same ranking RPC (verified live, not part of the 6 exact paths but feed the same legacy ranking counters):

| File path | Line | Reasoning |
|---|---|---|
| `app/(user)/properties/[id]/components/ViewTracker.jsx` | 10 | POSTs `/api/listings/{id}/view` on mount; rendered at `app/(user)/properties/[id]/page.jsx:99` (live) — increments `views`, a primary input to the legacy score. |
| `app/(user)/properties/components/PropertyCard.jsx` | 156 | POSTs `/api/listings/{id}/calls` on call button; card rendered by live `TrendingListingsSection.jsx:63`. |
| `app/(user)/properties/components/PropertyCardV1.jsx` | 254 | POSTs `/api/listings/{id}/calls` on call button; card rendered by live `PropertiesClient.jsx:189` and `RelatedListingsCarousel.jsx:53`. |
| `app/(user)/properties/components/ReviewPrompt.jsx` | 50 | POSTs `/api/listings/{id}/reviews`; rendered by live `TrendingListingsSection.jsx:30`. |
| `app/(user)/properties/[id]/components/detailsHero.jsx` | 189 | GETs `/api/listings/{id}/listerInfo`; rendered at `app/(user)/properties/[id]/page.jsx:114` (live). |

---

## DEAD OR ORPHANED

| File path | Line | Reasoning |
|---|---|---|
| `app/api/listings/route.js` (GET `/api/listings` — `get_listings_paginated`) | — | **No frontend call site anywhere in `app/`.** The only `/api/listings` fetches are sub-routes (`/trending`, `/{id}`, `/{id}/calls`, `/{id}/reviews`, …). The paginated `GET /api/listings` logic survives only as a server-side copy inside the legacy branch of `app/api/v1/listings/public/route.js:132` (same RPC, inlined — not an HTTP call). As an HTTP endpoint reachable from rendered code, it is **dead**. |
| `app/api/search/route.js` (GET `/api/search` — `search_listings_fuzzy`) | — | **No frontend call site.** Verified by grep: `fetch(.*api/search` matches only this report and pre-existing markdown audits. The live search path goes through `SearchBar.jsx:94` → `/api/v1/listings/public?q=`. Route is **dead** from the frontend. |
| `app/(user)/properties/[id]/components/detailsTab.jsx` | 43 | `fetch('/api/listings/${listing_id}/reviews')` lives in a component whose render is **commented out** — `app/(user)/properties/[id]/page.jsx:117` (`{/* <PropertyTabs …/> */}`). Imported (line 5) but never rendered → orphaned. |
| `app/(user)/properties/[id]/components/reviewPrompt.jsx` | 33 | `fetch('/api/listings/${listing_id}/feedback')` lives in `ReviewForm`, whose render is **commented out** — `app/(user)/properties/[id]/page.jsx:119`. Imported (line 8) but never rendered → orphaned. |

---

## Confirmation Q2 — TrendingListingsSection.jsx import

- **Live, not commented.** `app/(user)/properties/page.jsx:2` imports it and `line 12` renders it (`<TrendingListings />`).
- It is **not** imported by any `app/(user)/home/` page because **no `app/(user)/home/page.jsx` exists** — `home/` contains only components (heroSection, HomeSeekerSection, TestimonialSection, CTAbannerSection, TrendingListingsSection).
- Consequence: `GET /api/listings/trending` (legacy "most viewed" ranking via `get_listings_paginated`, score ~70% views) is **active** on the live `/properties` page.

## Confirmation Q3 — PropertyCard.jsx vs PropertyCardV1.jsx on the browse page

- The live browse/search page is `app/(user)/page.tsx` (route `/`) → `<PropertiesClient />` (line 25).
- `PropertiesClient.jsx` decides: it imports `PropertyCardV1` (line 6) and its parent map over listing data renders **`<PropertyCardV1>`** for every row (`PropertiesClient.jsx:189`). No conditional switch exists — `PropertyCardV1` is the only card on the browse/search grid (it renders both `_source: 'legacy'` and `_source: 'v1'` rows, since the merged public route normalizes legacy rows into v1 shape).
- Legacy `PropertyCard` is **not** used by the browse page. Its only live consumer is `TrendingListingsSection.jsx:5,63` (the `/properties` trending feed). `ListingsPanel.jsx:4` renames `PropertyCardV1` to `PropertyCard` (lister dashboard) — that is v1, not the legacy card.

## Confirmation Q4 — Mixed state: components wired to BOTH an old route and a v1 route

| File path | Old-route hit | v1-route hit | Note |
|---|---|---|---|
| `app/(user)/properties/[id]/page.jsx` | line 40 (default `/api/listings/${id}`) | line 40 (`?src=v1` → `/api/v1/listings/${id}`) | Single `src`-switch: both single-listing endpoints remain wired and reachable. |
| `app/(user)/properties/components/PropertyCardV1.jsx` | line 254 (POST `…/calls` legacy) | renders v1 `listings_table` rows; line 218 links `?src=v1` | v1 read path but **legacy write** for call tracking. |
| `app/(lister)/Lister/components/AddListing.jsx` | line 703 (`/api/listings/{id}`) | lines 748/888/904 (`/api/v1/listings`, `/cancel`, `/finalize`) | Lister create/edit flow pages between old single-listing GET and v1 create/cancel/finalize. |

## Bottom line — which server-side ranking logic is still active vs dead

- **Active legacy (views-weighted) ranking**: `get_listings_paginated` RPC (the "most viewed" score) is still exercised from live frontend code via `GET /api/listings/trending` (TrendingListingsSection), the default branch of `GET /api/listings/[id]`, and the server-side legacy branch of `GET /api/v1/listings/public` which the live browse page calls.
- **Dead**: the standalone `GET /api/listings` paginated route and `GET /api/search` fuzzy route — no rendered, reachable frontend code calls either.

---

## MANDATORY VERIFICATION — raw tool output

Command (as specified):

```
Get-ChildItem -Path .\app -Recurse -Include *.jsx,*.js -File | Select-String -Pattern "fetch\(.*api/listings|fetch\(.*api/v1/listings|fetch\(.*api/search|TrendingListingsSection|PropertyCardV1|PropertyCard[^V]" | Select-Object Path,LineNumber,Line
```

Raw `Select-Object` table (console-truncated columns preserved) followed by a full-width rendering of every match:

```
C:\...\golden_rentals\app\(lister)\Lister\components\AddListing.jsx:298: fetch("/api/v1/listings/filters")
C:\...\golden_rentals\app\(lister)\Lister\components\AddListing.jsx:703: const res = await fetch(`/api/listings/${prefill.listing_id}`, {
C:\...\golden_rentals\app\(lister)\Lister\components\AddListing.jsx:748: const listingRes = await fetch("/api/v1/listings", {
C:\...\golden_rentals\app\(lister)\Lister\components\AddListing.jsx:888: await fetch(`/api/v1/listings/${listingId}/cancel`, {
C:\...\golden_rentals\app\(lister)\Lister\components\AddListing.jsx:904: const finalizeRes = await fetch("/api/v1/listings/finalize", {
C:\...\golden_rentals\app\(lister)\Lister\components\Analytics.jsx:77: fetch(`/api/listings/${listing.listing_id}/reviews`)
C:\...\golden_rentals\app\(lister)\Lister\components\ListingsPanel.jsx:4: import PropertyCard from '@/app/(user)/properties/components/PropertyCardV1';
C:\...\golden_rentals\app\(lister)\Lister\components\ListingsPanel.jsx:27: const res = await fetch(`/api/v1/listings/me?page=${page}`);
C:\...\golden_rentals\app\(user)\home\components\TrendingListingsSection.jsx:5: import PropertyCard from '../../properties/components/PropertyCard'
C:\...\golden_rentals\app\(user)\home\components\TrendingListingsSection.jsx:7: import styles from '../css/TrendingListingsSection.module.css'
C:\...\golden_rentals\app\(user)\home\components\TrendingListingsSection.jsx:10: const res = await fetch('/api/listings/trending')
C:\...\golden_rentals\app\(user)\home\components\TrendingListingsSection.jsx:15: export default function TrendingListingsSection() {
C:\...\golden_rentals\app\(user)\properties\components\PropertyCard.jsx:5: import styles from '../css/propertyCard.module.css';
C:\...\golden_rentals\app\(user)\properties\components\PropertyCard.jsx:7: export default function PropertyCard({ listing, onWardClick }) {
C:\...\golden_rentals\app\(user)\properties\components\PropertyCard.jsx:156: fetch(`/api/listings/${listing_id}/calls`, { method: 'POST' })
C:\...\golden_rentals\app\(user)\properties\components\PropertyCardV1.jsx:5: import styles from '../css/propertyCard.module.css';
C:\...\golden_rentals\app\(user)\properties\components\PropertyCardV1.jsx:19: export default function PropertyCardV1({ listing, onWardClick }) {
C:\...\golden_rentals\app\(user)\properties\components\PropertyCardV1.jsx:254: fetch(`/api/listings/${listing_id}/calls`, {
C:\...\golden_rentals\app\(user)\properties\components\ReviewPrompt.jsx:50: const res = await fetch(`/api/listings/${pending.listing_id}/reviews`, {
C:\...\golden_rentals\app\(user)\properties\components\SearchBar.jsx:94: const res = await fetch(`/api/v1/listings/public?q=${encodeURIComponent(q)}`)
C:\...\golden_rentals\app\(user)\properties\[id]\components\detailsHero.jsx:129: fetch(`/api/v1/listings/reviews?listing_id=${listing_id}`)
C:\...\golden_rentals\app\(user)\properties\[id]\components\detailsHero.jsx:154: const res = await fetch(`/api/v1/listings/reviews`, {
C:\...\golden_rentals\app\(user)\properties\[id]\components\detailsHero.jsx:175: const refreshed = await fetch(`/api/v1/listings/reviews?listing_id=${listing_id}`);
C:\...\golden_rentals\app\(user)\properties\[id]\components\detailsHero.jsx:189: fetch(`/api/listings/${listing_id}/listerInfo`)
C:\...\golden_rentals\app\(user)\properties\[id]\components\detailsTab.jsx:43: fetch(`/api/listings/${listing_id}/reviews`)
C:\...\golden_rentals\app\(user)\properties\[id]\components\RelatedListingsCarousel.jsx:4: import PropertyCardV1 from '@/app/(user)/properties/components/PropertyCardV1';
C:\...\golden_rentals\app\(user)\properties\[id]\components\RelatedListingsCarousel.jsx:19: const res = await fetch('/api/v1/listings/public?page=1')
C:\...\golden_rentals\app\(user)\properties\[id]\components\RelatedListingsCarousel.jsx:53: <PropertyCardV1 listing={item} onWardClick={() => { }} />
C:\...\golden_rentals\app\(user)\properties\[id]\components\reviewPrompt.jsx:33: const res = await fetch(`/api/listings/${listing_id}/feedback`, {
C:\...\golden_rentals\app\(user)\properties\[id]\components\ViewTracker.jsx:10: fetch(`/api/listings/${listingId}/view`, { method: 'POST' });
C:\...\golden_rentals\app\(user)\properties\page.jsx:2: import TrendingListings from '../home/components/TrendingListingsSection'
C:\...\golden_rentals\app\(user)\properties\PropertiesClient.jsx:6: import PropertyCardV1 from './components/PropertyCardV1'
C:\...\golden_rentals\app\(user)\properties\PropertiesClient.jsx:42: const res = await fetch(`/api/v1/listings/public?${params.toString()}`)
C:\...\golden_rentals\app\(user)\properties\PropertiesClient.jsx:189: <PropertyCardV1
```

Note: the mandatory `-Include *.jsx,*.js` filter does not include `app/(user)/page.tsx` (`.tsx`), which itself contains **no** route fetches — it only imports `PropertiesClient` (line 2) and renders it (line 25). Its absence from the grep changes nothing.

---

*Generated by the route-liveness audit. Source files untouched.*