import { paymentsSupabase } from '@/lib/supabase/paymentsClient';
import { NextResponse } from 'next/server';

export async function POST(request, { params }) {
  const { review_id } = params;
  const { fingerprint, reaction_type } = await request.json();

  if (!fingerprint || !['like', 'dislike'].includes(reaction_type)) {
    return NextResponse.json({ error: 'fingerprint and valid reaction_type are required' }, { status: 400 });
  }

  const { data: inserted, error } = await paymentsSupabase
    .from('review_reactions')
    .insert({ review_id, fingerprint, reaction_type })
    .select()
    .single();

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ error: 'Already reacted to this review' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Failed to submit reaction', details: error.message }, { status: 500 });
  }

  return NextResponse.json({ data: inserted }, { status: 201 });
}