import { createServerSupabaseClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export const revalidate = 0;

export async function GET() {
  try {
    const supabase = await createServerSupabaseClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user || user.user_metadata?.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const parsed = (data ?? []).map(n => ({
      ...n,
      body: typeof n.body === 'string' ? JSON.parse(n.body) : n.body,
    }))

    return NextResponse.json({ data: parsed });


  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PATCH(request) {
  try {
    const supabase = await createServerSupabaseClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user || user.user_metadata?.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    

    const { ids, all } = await request.json();

    let error;

    if (all) {
      // mark all as read
      ({ error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('read', false));
    } else if (ids?.length) {
      // mark specific ids as read
      ({ error } = await supabase
        .from('notifications')
        .update({ read: true })
        .in('id', ids));
    }

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });

  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}