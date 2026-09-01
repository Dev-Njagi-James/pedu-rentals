import { createServerSupabaseClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth/session';

export const revalidate = 0;

export async function GET() {
  try {
    const { user, error, status } = await requireRole('admin');
    if (error) {
      return NextResponse.json({ error }, { status });
    }

    const supabase = await createServerSupabaseClient();

    const { data, error: dbError } = await supabase
      .from('notifications')
      .select('*')
      .order('created_at', { ascending: false })

    if (dbError) {
      return NextResponse.json({ error: dbError.message }, { status: 500 });
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
    const { user, error, status } = await requireRole('admin');
    if (error) {
      return NextResponse.json({ error }, { status });
    }

    const supabase = await createServerSupabaseClient();

    const { ids, all } = await request.json();

    let dbError;

    if (all) {
      // mark all as read
      ({ error: dbError } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('read', false));
    } else if (ids?.length) {
      // mark specific ids as read
      ({ error: dbError } = await supabase
        .from('notifications')
        .update({ read: true })
        .in('id', ids));
    }

    if (dbError) {
      return NextResponse.json({ error: dbError.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });

  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}