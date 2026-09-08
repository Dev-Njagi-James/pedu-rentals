import { paymentsSupabase } from '@/lib/supabase/paymentsClient';
import { recalculateListingRating } from '@/lib/reviews/sync';
import { NextResponse } from 'next/server';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const listing_id = searchParams.get('listing_id');

  if (!listing_id) {
    return NextResponse.json({ error: 'listing_id is required' }, { status: 400 });
  }

  const { data, error } = await paymentsSupabase
    .from('reviews_table')
    .select('review_id, listing_id, rating, review_text, created_at')
    .eq('listing_id', listing_id)
    .eq('status', 'visible')
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: 'Failed to fetch reviews', details: error.message }, { status: 500 });
  }

  return NextResponse.json({ data });
}

export async function POST(request) {
  const body = await request.json();
  const { listing_id, fingerprint, rating, review_text, account_uuid } = body;

  if (!listing_id || !fingerprint || !rating) {
    return NextResponse.json({ error: 'listing_id, fingerprint, and rating are required' }, { status: 400 });
  }
  if (rating < 1 || rating > 5) {
    return NextResponse.json({ error: 'rating must be between 1 and 5' }, { status: 400 });
  }

  // Gate: only paid listings can receive reviews. Checked server-side —
  // do not rely on the frontend only showing paid listings.
  const { data: listing, error: listingError } = await paymentsSupabase
    .from('listings_table')
    .select('listing_id, payment_status')
    .eq('listing_id', listing_id)
    .single();

  if (listingError || !listing) {
    return NextResponse.json({ error: 'Listing not found' }, { status: 404 });
  }
  if (listing.payment_status !== 'paid') {
    return NextResponse.json({ error: 'Reviews are only accepted on live listings' }, { status: 403 });
  }

  const { data: inserted, error: insertError } = await paymentsSupabase
    .from('reviews_table')
    .insert({
      listing_id,
      fingerprint,
      rating,
      review_text: review_text ?? null,
      account_uuid: account_uuid ?? null,
    })
    .select()
    .single();

  if (insertError) {
    // UNIQUE(listing_id, fingerprint) violation — Postgres code 23505.
    if (insertError.code === '23505') {
      return NextResponse.json({ error: 'You have already reviewed this listing' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Failed to submit review', details: insertError.message }, { status: 500 });
  }

  await recalculateListingRating(listing_id);

  return NextResponse.json({ data: inserted }, { status: 201 });
}