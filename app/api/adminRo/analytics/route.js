import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

// POST /api/adminRo/analytics — record a visit
export async function POST(req) {
  try {
    const supabase = await createServerSupabaseClient();
    const { path } = await req.json();
    if (!path) return NextResponse.json({ error: 'No path' }, { status: 400 });

    const { error } = await supabase
      .from('page_visits')
      .insert({ path });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });

  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// GET /api/adminRo/analytics?range=week — fetch aggregated visits
export async function GET(req) {
  try {
    const supabase = await createServerSupabaseClient();
    const { searchParams } = new URL(req.url);
    const start = searchParams.get('start');
    const end   = searchParams.get('end');

    if (!start || !end) {
      return NextResponse.json({ error: 'start and end required' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('page_visits')
      .select('visited_at')
      .gte('visited_at', start)
      .lte('visited_at', end);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const grouped = {};
    for (const row of data) {
      const date = row.visited_at.slice(0, 10);
      grouped[date] = (grouped[date] || 0) + 1;
    }

    const result = Object.entries(grouped)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, visits]) => ({ date, visits }));

    return NextResponse.json(result);

  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}