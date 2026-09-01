// app/api/v1/listings/[id]/route.js
// GET single v1 listing by ID from the payments project (listings_table).
//
// - Column selection mirrors the v1 query in app/api/v1/listings/public/route.js
//   (section C), including images_table (images_url, video_url).
// - Response envelope matches the legacy app/api/listings/[id]/route.js:
//   { data: <row> } on success, 404 { error: 'Listing not found' } when the ID
//   has no row — so the detail page's existing `if (res.status === 404) return
//   null` logic keeps working unchanged.
// - No payment_status gate here: straight ID lookup per spec. The public list
//   route (section C) gates on payment_status='paid'; wire that here too if
//   this route ever serves the public detail page for v1 rows.

import { paymentsSupabase } from '@/lib/supabase/paymentsClient';
import { NextResponse } from 'next/server';

export const revalidate = 0;

export async function GET(request, { params }) {
  const { id } = await params;
  const listing_id = parseInt(id, 10);

  if (isNaN(listing_id)) {
    return NextResponse.json({ error: 'Invalid listing ID' }, { status: 400 });
  }

  const { data, error } = await paymentsSupabase
    .from('listings_table')
    .select(
      `listing_id, listing_name, listing_category, category_type, furnishing,
       rent_duration, phone_number, price_kes, listing_ward, ward_display_name,
       ward_location, location_url, listing_description, plan_name, created_at, updated_at,
       images_table (images_url, video_url)`
    )
    .eq('listing_id', listing_id)
    .maybeSingle();

  if (error) {
    return NextResponse.json(
      { error: 'Failed to fetch listing', details: error.message },
      { status: 500 }
    );
  }

  if (!data) {
    return NextResponse.json({ error: 'Listing not found' }, { status: 404 });
  }

  return NextResponse.json({ data });
}
