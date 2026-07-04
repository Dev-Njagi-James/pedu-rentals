import { NextResponse } from 'next/server';
import { createBrowserSupabaseClient } from '@/lib/supabase/client';

const supabase = createBrowserSupabaseClient();

export async function POST(request, { params }) {
  const { id } = await params;

  const { error } = await supabase.rpc('increment_views', { listing_id_input: Number(id) });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}