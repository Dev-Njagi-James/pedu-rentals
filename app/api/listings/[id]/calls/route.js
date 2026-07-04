import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function POST(request, { params }) {
  const { id } = await params;
  const supabase = await createServerSupabaseClient();

  const { error } = await supabase.rpc('increment_call_logs', { listing_id_input: Number(id) });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}