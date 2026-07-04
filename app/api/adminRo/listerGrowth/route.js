import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function GET(req) {
  try {
    const supabase = await createServerSupabaseClient();
    const { searchParams } = new URL(req.url);
    const start = searchParams.get('start');
    const end   = searchParams.get('end');

    if (!start || !end)
      return NextResponse.json({ error: 'start and end required' }, { status: 400 });

    const { data, error } = await supabase
      .from('Listers_Info')
      .select('created_at')
      .gte('created_at', start)
      .lte('created_at', end);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const grouped = {};
    for (const row of data) {
      const date = row.created_at.slice(0, 10);
      grouped[date] = (grouped[date] || 0) + 1;
    }

    const result = Object.entries(grouped)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, count]) => ({ date, count }));

    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}