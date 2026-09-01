// app/api/analytics/summary/route.js

import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { requireAuth } from '@/lib/auth/session';

export async function GET() {
  try {
    const { user, error, status } = await requireAuth();
    if (error) {
      return NextResponse.json({ error }, { status });
    }

    const supabase = await createServerSupabaseClient();

    const { data, error: rpcError } = await supabase.rpc('get_lister_analytics', {
      p_user_id: user.id,
    });

    if (rpcError) {
      return NextResponse.json({ error: rpcError.message }, { status: 500 });
    }

    return NextResponse.json(data, { status: 200 });

  } catch (err) {
    console.error('GET /api/analytics/summary error:', err);
    return NextResponse.json({ error: err.message ?? 'Internal server error' }, { status: 500 });
  }
}