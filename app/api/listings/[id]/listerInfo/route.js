import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function GET(request, { params }) {
  const { id } = await params;
  const listing_id = parseInt(id, 10);

  if (isNaN(listing_id)) {
    return NextResponse.json({ error: 'Invalid listing ID' }, { status: 400 });
  }

  const { data: listing, error: listingError } = await supabaseAdmin
    .from('Property_Listing')
    .select('user_id')
    .eq('listing_id', listing_id)
    .single();

  if (listingError || !listing) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const { data, error } = await supabaseAdmin
    .from('Listers_Info')
    .select('username, lister_org')
    .eq('lister_UUID', listing.user_id)
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ username: data.username, organisationName: data.lister_org });
}