import { createServerSupabaseClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

const TRENDING_LIMIT = 10;

export const revalidate = 0;

export async function GET() {
  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase.rpc('get_listings_paginated', {
    p_limit: TRENDING_LIMIT,
    p_offset: 0,
    p_ward_id: null,
    p_category_id: null,
    p_type_ids: null,
    p_price_range: null,
    p_rent_duration: null,
    p_property_interior: null,
    p_listing_id: null,
  });

  if (error) {
    return NextResponse.json(
      { error: 'Failed to fetch trending listings', details: error.message },
      { status: 500 }
    );
  }

  // hot + warm only — decile logic is in the RPC, so just take top results
  // RPC already returns hot first, so slicing TRENDING_LIMIT is sufficient
  return NextResponse.json({ data: data ?? [] });
}