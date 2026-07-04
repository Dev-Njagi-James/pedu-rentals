import { createServerSupabaseClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function POST() {
  const supabase = await createServerSupabaseClient();

  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

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