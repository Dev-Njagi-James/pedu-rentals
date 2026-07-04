import { createServerSupabaseClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET(request, { params }) {
  try {
    const { id } = await params;
    const listing_id = parseInt(id, 10);

    if (!listing_id || isNaN(listing_id)) {
      return NextResponse.json({ error: 'Invalid listing id' }, { status: 400 });
    }

    const supabase = await createServerSupabaseClient();

    const { data, error } = await supabase
      .from('listing_reviews')
      .select('review_id, rating, review_text, created_at, fingerprint')
      .eq('listing_id', listing_id)
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data: data ?? [] });

  } catch (err) {
    console.error('GET /api/listings/[id]/reviews error:', err);
    return NextResponse.json({ error: err.message ?? 'Internal server error' }, { status: 500 });
  }
}


export async function POST(request, { params }) {
  try {
    const { id } = await params;
    const listing_id = parseInt(id, 10);

    if (!listing_id || isNaN(listing_id)) {
      return NextResponse.json({ error: 'Invalid listing id' }, { status: 400 });
    }

    const body = await request.json();
    const { fingerprint, rating, review_text } = body;

    if (!fingerprint || typeof fingerprint !== 'string') {
      return NextResponse.json({ error: 'Missing fingerprint' }, { status: 400 });
    }

    if (!rating || rating < 1 || rating > 5) {
      return NextResponse.json({ error: 'Rating must be between 1 and 5' }, { status: 400 });
    }

    const supabase = await createServerSupabaseClient();

    const { error } = await supabase
      .from('listing_reviews')
      .insert({
        listing_id,
        fingerprint,
        rating,
        review_text: review_text ?? null,
      });

    if (error) {
      // Unique constraint violation — duplicate review
      if (error.code === '23505') {
        return NextResponse.json(
          { error: 'Review already submitted' },
          { status: 409 }
        );
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });

  } catch (err) {
    console.error('POST /api/listings/[id]/reviews error:', err);
    return NextResponse.json({ error: err.message ?? 'Internal server error' }, { status: 500 });
  }
}