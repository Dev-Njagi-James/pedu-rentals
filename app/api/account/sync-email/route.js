import { createServerSupabaseClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/session';

export async function POST() {
  const { user, error, status } = await requireAuth();
  if (error) {
    return NextResponse.json({ error }, { status });
  }

  const supabase = await createServerSupabaseClient();

  const { data: current, error: fetchError } = await supabase
    .from('Listers_Info')
    .select('lister_email')
    .eq('lister_UUID', user.id)
    .single();

  if (fetchError) {
    return NextResponse.json({ error: fetchError.message }, { status: 500 });
  }

  if (current.lister_email === user.email) {
    return NextResponse.json({ success: true, synced: false });
  }

  const { error: updateError } = await supabase
    .from('Listers_Info')
    .update({ lister_email: user.email })
    .eq('lister_UUID', user.id);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, synced: true });
}