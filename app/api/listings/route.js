import { createServerSupabaseClient } from '@/lib/supabase/server';
import { paymentsSupabase } from '@/lib/supabase/paymentsClient';
import { NextResponse } from 'next/server';


const PAGE_SIZE = 20;
const PREFETCH_SIZE = 40;
const HIDDEN_LISTING_IDS = [ 40, 43,34 ];

export const revalidate = 0;

// ═══════════════════════════════════════════════════════════════
// GET /api/listings
// ═══════════════════════════════════════════════════════════════
export async function GET(request) {
  const { searchParams } = new URL(request.url);

  const page = parseInt(searchParams.get('page') ?? '1', 10);
  const prefetch = searchParams.get('prefetch') === 'true';
  const limit = prefetch ? PREFETCH_SIZE : PAGE_SIZE;
  const offset = (page - 1) * PAGE_SIZE;

  const ward_id = searchParams.get('ward_id') ? parseInt(searchParams.get('ward_id'), 10) : null;
  const category_id = searchParams.get('category_id') ? parseInt(searchParams.get('category_id'), 10) : null;
  const type_ids = searchParams.get('type_ids') ? searchParams.get('type_ids').split(',').map(Number) : null;
  const price_range = searchParams.get('price_range') || null;
  const rent_duration = searchParams.get('rent_duration') || null;
  const property_interior = searchParams.get('property_interior') || null;

  // Translate new ward_id → old ward_id via ward_id_mapping (payments project)
  let oldWardId = ward_id;
  if (ward_id !== null) {
    const { data: mapping, error: mappingError } = await paymentsSupabase
      .from('ward_id_mapping')
      .select('old_ward_id')
      .eq('new_ward_id', ward_id)
      .maybeSingle();

    if (mappingError || !mapping) {
      // No mapping exists — no live listings can exist for this ward
      return NextResponse.json({
        data: [],
        pagination: {
          current_page: page,
          total_pages: 1,
          total_records: 0,
          page_size: PAGE_SIZE,
          has_next: false,
          has_prev: false,
        },
      });
    }
    oldWardId = mapping.old_ward_id;
  }

  const supabase = await createServerSupabaseClient();

  let countQuery = supabase
    .from('Property_Listing')
    .select('listing_id', { count: 'exact', head: true })
    .not('listing_id', 'in', `(${HIDDEN_LISTING_IDS.join(',')})`);

  if (oldWardId) countQuery = countQuery.eq('ward_id', oldWardId);
  if (category_id) countQuery = countQuery.eq('category_id', category_id);
  if (type_ids?.length) countQuery = countQuery.in('property_type_id', type_ids);
  if (rent_duration) countQuery = countQuery.eq('rent_duration', rent_duration);
  if (property_interior) countQuery = countQuery.ilike('property_interior', property_interior);

  const { count, error: countError } = await countQuery;


  if (countError) {
    return NextResponse.json(
      { error: 'Failed to fetch count', details: countError.message },
      { status: 500 }
    );
  }

  const { data: rawData, error } = await supabase.rpc('get_listings_paginated', {
    p_limit: limit,
    p_offset: offset,
    p_ward_id: oldWardId,
    p_category_id: category_id,
    p_type_ids: type_ids,
    p_price_range: price_range,
    p_rent_duration: rent_duration,
    p_property_interior: property_interior,
  });

  if (error) {
    return NextResponse.json(
      { error: 'Failed to fetch listings', details: error.message },
      { status: 500 }
    );
  }

  const data = rawData.filter(l => !HIDDEN_LISTING_IDS.includes(l.listing_id));



  const totalPages = Math.ceil((count ?? 0) / PAGE_SIZE);

  return NextResponse.json({
    data,
    pagination: {
      current_page: page,
      total_pages: totalPages,
      total_records: count,
      page_size: PAGE_SIZE,
      has_next: page < totalPages,
      has_prev: page > 1,
    },
  });
}