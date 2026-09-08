import { createServerSupabaseClient } from '@/lib/supabase/server';
import { paymentsSupabase } from '@/lib/supabase/paymentsClient';
import { resolveWardNames } from '@/lib/resolveWardName';
import { CATEGORY_ID_TO_V1_NAME, TYPE_ID_TO_V1_NAME, RENT_DURATION_TO_V1, FURNISHING_TO_V1, PRICE_BUCKET_RANGES } from '@/lib/categoryMapping';
import { rankListings } from '@/lib/ranking/rankListings';
import { NextResponse } from 'next/server';

/*
 * Public listings endpoint — merges legacy (Property_Listing) + v1 (listings_table).
 *
 * - Legacy query body is copied verbatim from app/api/listings/route.js.
 * - V1 query hits paymentsSupabase.from('listings_table'), applies a base
 *   payment_status='paid' filter, then chains any v1 filter params present
 *   (listing_ward via ward_id, listing_category, category_type, rent_duration,
 *   furnishing, and a price_kes bucket). ward_id is shared with the legacy
 *   branch — same ID space.
 * - Both row sets are normalized into the legacy Property_Listing shape so the
 *   public properties page can consume a single array without changes.
 */

const PAGE_SIZE = 20;
const PREFETCH_SIZE = 40;
const HIDDEN_LISTING_IDS = [40, 43, 34];

export const revalidate = 0;

// Helper: parse legacy price string into a number (defensive sanitization)
function parsePrice(value) {
  if (value === null || value === undefined) return null;
  const cleaned = String(value).replace(/[^0-9.]/g, '');
  const num = parseFloat(cleaned);
  return Number.isFinite(num) ? num : null;
}

// Helper: build images_url array from legacy media objects.
//   Legacy media elements look like: { image_url: null, cloudinary_url, cloudinary_public_id, video_url: null, position }
//   The usable URL is in cloudinary_url; images point at an /image/ path, videos at /video/.
function buildImagesUrlArray(media) {
  if (!Array.isArray(media)) return [];
  return media
    .filter((m) => m.cloudinary_url && !m.cloudinary_url.includes('/video/'))
    .map((m) => ({ publicUrl: m.cloudinary_url, position: m.position ?? 0 }));
}

// Helper: extract the single video_url from legacy media, if present.
function extractVideoUrl(media) {
  if (!Array.isArray(media)) return null;
  const videoItem = media.find((m) => m.cloudinary_url && m.cloudinary_url.includes('/video/'));
  return videoItem?.cloudinary_url ?? null;
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);

  // A. Parse page/limit/filters — copied exactly from app/api/listings/route.js.
  const page = parseInt(searchParams.get('page') ?? '1', 10);
  const prefetch = searchParams.get('prefetch') === 'true';
  const limit = prefetch ? PREFETCH_SIZE : PAGE_SIZE;
  const offset = prefetch ? (page - 1) * PREFETCH_SIZE : (page - 1) * PAGE_SIZE;

  const ward_id = searchParams.get('ward_id') ? parseInt(searchParams.get('ward_id'), 10) : null;
  const category_id = searchParams.get('category_id') ? parseInt(searchParams.get('category_id'), 10) : null;
  const type_ids = searchParams.get('type_ids') ? searchParams.get('type_ids').split(',').map(Number) : null;
  const price_range = searchParams.get('price_range') || null;
  const rent_duration = searchParams.get('rent_duration') || null;
  const property_interior = searchParams.get('property_interior') || null;
  const isSearch = !!(searchParams.get('q')?.trim());

  // V1-specific filter params (payments project listings_table columns).
  // ward_id is reused as-is from the legacy parse above — same ID space.
  const v1_category_name = searchParams.get('v1_category_name');
  const v1_category_type_name = searchParams.get('v1_category_type_name');
  const v1_price_bucket = searchParams.get('v1_price_bucket'); // e.g. "5000_8000"
  const v1_rent_duration = searchParams.get('v1_rent_duration');
  const v1_furnishing = searchParams.get('v1_furnishing');

  // Resolve a bucket key to numeric bounds via the explicit map (handles the
  // below_2000/above_20000 keys that string-split parsing can't).
  function resolvePriceRange(bucket) {
    return bucket ? PRICE_BUCKET_RANGES[bucket] ?? null : null;
  }
  const priceRange = resolvePriceRange(v1_price_bucket ?? price_range);

  // Resolve legacy IDs to v1 names. null = no v1 match (unseeded type or bad id).
  // If v1_category_name/v1_category_type_name were explicitly passed, they take
  // precedence (manual override for direct testing); otherwise resolve from legacy IDs.
  const resolvedCategoryName = v1_category_name
    ?? (category_id ? CATEGORY_ID_TO_V1_NAME[category_id] ?? null : null);

  const resolvedTypeName = v1_category_type_name
    ?? (type_ids?.length ? TYPE_ID_TO_V1_NAME[type_ids[0]] ?? null : null);

  // True only when a type filter was requested but has no v1 equivalent yet —
  // v1 branch must return zero rows for that filter, not all rows.
  const typeFilterUnresolvable = !!(type_ids?.length && !v1_category_type_name && resolvedTypeName === null);

  const resolvedRentDuration = v1_rent_duration
    ?? (rent_duration ? RENT_DURATION_TO_V1[rent_duration] ?? null : null);

  const resolvedFurnishing = v1_furnishing
    ?? (property_interior ? FURNISHING_TO_V1[property_interior] ?? null : null);

  const supabase = await createServerSupabaseClient();

  // B. LEGACY QUERY — verbatim from app/api/listings/route.js.
  let legacyData = [];
  let legacyCount = 0;

  {
    let countQuery = supabase
      .from('Property_Listing')
      .select('listing_id', { count: 'exact', head: true })
      .not('listing_id', 'in', `(${HIDDEN_LISTING_IDS.join(',')})`);

    if (ward_id) countQuery = countQuery.eq('ward_id', ward_id);
    if (category_id) countQuery = countQuery.eq('category_id', category_id);
    if (type_ids?.length) countQuery = countQuery.in('property_type_id', type_ids);
    if (rent_duration) countQuery = countQuery.eq('rent_duration', rent_duration);
    if (property_interior) countQuery = countQuery.ilike('property_interior', property_interior);

    const { count, error: countError } = await countQuery;

    if (countError) {
      return NextResponse.json({ error: 'Failed to fetch count', details: countError.message }, { status: 500 });
    }

      // Offset is now applied once, after the merge (step F), so the legacy RPC fetches
  // from the beginning. p_limit is increased to cover enough legacy rows to satisfy
  // the requested page position (offset + limit), capped at 200 for safety.
  const legacyFetchLimit = isSearch ? 200 : Math.min(offset + limit, 200);

  const { data: rawData, error } = await supabase.rpc('get_listings_paginated', {
      p_limit: legacyFetchLimit,
      p_offset: 0,
      p_ward_id: ward_id,
      p_category_id: category_id,
      p_type_ids: type_ids,
      p_price_range: price_range,
      p_rent_duration: rent_duration,
      p_property_interior: property_interior,
    });

    if (error) {
      return NextResponse.json({ error: 'Failed to fetch listings', details: error.message }, { status: 500 });
    }

    legacyData = rawData.filter(l => !HIDDEN_LISTING_IDS.includes(l.listing_id));

    // Reroute ward-name resolution to the new-scheme table (payments project).
    const wardMap = await resolveWardNames(legacyData.map(l => l.ward_id));
    for (const l of legacyData) {
      const resolved = wardMap.get(l.ward_id);
      l.ward_name = resolved?.ward_name ?? null;
      l.ward_id = resolved?.ward_id ?? l.ward_id;
    }

    legacyCount = count ?? 0;
  }

    // D. NORMALIZE legacy rows into the v1 listings_table shape.
  const remappedLegacyData = legacyData.map((row) => ({
    _source: 'legacy',
    listing_id: row.listing_id,
    listing_name: row.property_name,
    price_kes: parsePrice(row.property_price),
    furnishing: row.property_interior,
    ward_display_name: row.ward_name,
    listing_ward: row.ward_id,
    category_type: row.type_name,
    listing_category: row.category_name,
    location_url: row.property_location,
    ward_location: row.ward_location,
    phone_number: row.phone_number,
    rent_duration: row.rent_duration,
    created_at: row.created_at,
    plan_name: 'Regular',
    images_table: {
      images_url: buildImagesUrlArray(row.media),
      video_url: extractVideoUrl(row.media),
    },
  }));

    // E. V1 rows pass through with native field names (no conversion).
  // C. V1 QUERY — payments project, paid listings only.
  //    v1 filters wired below, chained onto the same query builder (additive).
  let v1Data = [];
  let v1Count = 0;
  try {
    let v1Query = paymentsSupabase
      .from('listings_table')
      .select(
        `listing_id, listing_name, listing_category, category_type, furnishing,
         rent_duration, phone_number, price_kes, listing_ward, ward_display_name,
         ward_location, location_url, listing_description, plan_name, created_at, updated_at,
         images_table (images_url, video_url)`,
        { count: 'exact' }
      )
      .eq('payment_status', 'paid');

    // V1 filters — each conditional chains onto the same reference.
    if (typeFilterUnresolvable) {
      // Type filter requested but has no v1 equivalent yet → zero v1 rows, not all.
      v1Data = [];
      v1Count = 0;
    } else {
      if (ward_id) v1Query = v1Query.eq('listing_ward', ward_id);
      if (resolvedCategoryName) v1Query = v1Query.eq('listing_category', resolvedCategoryName);
      if (resolvedTypeName) v1Query = v1Query.eq('category_type', resolvedTypeName);
      if (resolvedRentDuration) v1Query = v1Query.eq('rent_duration', resolvedRentDuration);
      if (resolvedFurnishing) v1Query = v1Query.eq('furnishing', resolvedFurnishing);
      if (priceRange) {
        if (priceRange.min !== null) v1Query = v1Query.gte('price_kes', priceRange.min);
        if (priceRange.max !== null) v1Query = v1Query.lte('price_kes', priceRange.max);
      }

      const { data, error, count } = await v1Query;

      if (error) {
        console.error('V1 listings query failed:', error.message);
      } else {
        v1Data = (data ?? []).map((row) => ({ _source: 'v1', ...row }));
        v1Count = count ?? 0;
      }
    }
  } catch (err) {
    console.error('V1 listings query failed:', err?.message);
    v1Data = [];
    v1Count = 0;
  }

  // F. MERGE. Offset is applied once here, after the merge, so neither source
  //    offsets independently. Legacy rows are remapped to v1 shape; v1 rows pass
  //    through natively.
  const merged = rankListings([...remappedLegacyData, ...v1Data]);
  // F2. TEXT SEARCH (?q=) — case-insensitive substring match on the normalized
  //     `listing_name` field. Legacy rows are remapped to that field name in D
  //     above and v1 rows carry it natively, so this one filter covers both
  //     sources. The two sources live in different Supabase projects, so this
  //     cannot be pushed down as a SQL ILIKE; this is the in-memory equivalent
  //     of ILIKE '%q%'. Runs before the offset/limit slice below so it composes
  //     with the existing filters and pagination. Empty/missing q = no filter.
  const q = (searchParams.get('q') ?? '').trim().toLowerCase();
  const searched = q
    ? merged.filter((m) => (m.listing_name ?? '').toLowerCase().includes(q))
    : merged;

  const mergedSliced = searched.slice(offset, offset + limit);


  // G. total_records.
  const total_records = legacyCount + v1Count;

  // H. SAME response shape as app/api/listings/route.js.
  const totalPages = Math.ceil((total_records ?? 0) / PAGE_SIZE);

  return NextResponse.json({
    data: mergedSliced,
    pagination: {
      current_page: page,
      total_pages: totalPages,
      total_records: total_records,
      page_size: PAGE_SIZE,
      has_next: page < totalPages,
      has_prev: page > 1,
    },
  });
}

