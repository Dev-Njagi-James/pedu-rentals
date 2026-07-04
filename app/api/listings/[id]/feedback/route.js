import { createServerSupabaseClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { randomUUID } from 'crypto';

export async function POST(req, { params }) {
  try {
    const { id } = await params;
    const listing_id = parseInt(id, 10);

    if (!listing_id || isNaN(listing_id)) {
      return NextResponse.json({ error: 'Invalid listing id' }, { status: 400 });
    }

    const { rating, review_text } = await req.json();

    if (!rating || rating < 1 || rating > 5) {
      return NextResponse.json({ error: 'Rating must be between 1 and 5' }, { status: 400 });
    }

    const supabase = await createServerSupabaseClient();

    const { error } = await supabase
      .from('listing_reviews')
      .insert({
        listing_id,
        fingerprint: randomUUID(),
        rating,
        review_text: review_text ?? null,
      });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true }, { status: 201 });

  } catch (err) {
    console.error('POST /api/listings/[id]/feedback error:', err);
    return NextResponse.json({ error: err.message ?? 'Internal server error' }, { status: 500 });
  }
}