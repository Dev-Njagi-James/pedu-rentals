import { paymentsSupabase } from '@/lib/supabase/paymentsClient';
import { PRICE_BUCKET_RANGES } from "@/lib/categoryMapping";
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

  const category = searchParams.get('category') || null;
  const types = searchParams.getAll('types').filter(Boolean);
  const price_range = searchParams.get('price_range') || null;
  const rent_duration = searchParams.get('rent_duration') || null;
  const furnishing = searchParams.get('furnishing') || null;
  const isSearch = !!(searchParams.get('q')?.trim());
  
  // Price bucket key -> numeric bounds (min inclusive, max exclusive).
  const priceRange = price_range ? PRICE_BUCKET_RANGES[price_range] ?? null : null;
  
  // C. V1 QUERY — payments project, paid listings only.
  let v1Data = [];
  let v1Count = 0;
  try {
    let v1Query = paymentsSupabase
      .from("listings_table")
      .select(
        `listing_id, listing_name, listing_category, category_type, furnishing,
         rent_duration, price_kes, listing_ward, ward_display_name,
         listing_description, plan_name, created_at, updated_at,
         images_table (images_url, video_url)`,
        { count: "exact" },
      )
      .eq("payment_status", "paid");
    if (ward_id) v1Query = v1Query.eq('listing_ward', ward_id);
    if (category && category !== "all") {
      v1Query = v1Query.eq("listing_category", category);
    }
    if (types.length) v1Query = v1Query.in('category_type', types);
    if (rent_duration) v1Query = v1Query.eq('rent_duration', rent_duration);
    if (furnishing) v1Query = v1Query.eq('furnishing', furnishing);
    if (priceRange) {
      if (priceRange.min !== null) v1Query = v1Query.gte('price_kes', priceRange.min);
      if (priceRange.max !== null) v1Query = v1Query.lt('price_kes', priceRange.max);
    }

    const { data, error, count } = await v1Query;

    if (error) {
      console.error('V1 listings query failed:', error.message);
    } else {
      v1Data = (data ?? []).map((row) => ({ _source: 'v1', ...row }));
      v1Count = count ?? 0;
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

