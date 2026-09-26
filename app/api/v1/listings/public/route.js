import { paymentsSupabase } from '@/lib/supabase/paymentsClient';
import { CATEGORY_ID_TO_V1_NAME, TYPE_ID_TO_V1_NAME, RENT_DURATION_TO_V1, FURNISHING_TO_V1, PRICE_BUCKET_RANGES } from '@/lib/categoryMapping';
import { rankListings } from '@/lib/ranking/rankListings';
import { NextResponse } from 'next/server';


const PAGE_SIZE = 20;
const PREFETCH_SIZE = 40;

export const revalidate = 0;



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


  // C. V1 QUERY — payments project, paid listings only.
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

 const merged = rankListings(v1Data);
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
  const total_records = v1Count;

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

