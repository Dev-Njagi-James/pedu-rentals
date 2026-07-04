import { createServerSupabaseClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET() {
  const supabase = await createServerSupabaseClient();

  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data, error } = await supabase
    .from('Admin Table')
    .select('username, email')
    .eq('lister_uuid', user.id)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ username: data.username, email: data.email });
}

export async function PATCH(request) {
  const supabase = await createServerSupabaseClient();

  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { type } = body;

  // ── Account section: username only ──
  if (type === 'account') {
    const username = body.username?.trim();
    if (!username) return NextResponse.json({ error: 'Username is required.' }, { status: 400 });

    const { error } = await supabase
      .from('Admin Table')
      .update({ username })
      .eq('lister_uuid', user.id);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  }

  // ── Security section: email and/or password ──
  if (type === 'security') {
    const email = body.email?.trim() || null;
    const password = body.password?.trim() || null;

    if (!email && !password) {
      return NextResponse.json({ error: 'Nothing to update.' }, { status: 400 });
    }

    const updates = {};
    if (email) updates.email = email;
    if (password) updates.password = password;

    const { error } = await supabase.auth.updateUser(updates);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // keep Admin Table email in sync if email changed
    if (email) {
      await supabase
        .from('Admin Table')
        .update({ email })
        .eq('lister_uuid', user.id);
    }

    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: 'Invalid type.' }, { status: 400 });
}