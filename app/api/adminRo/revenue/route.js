import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function GET(req) {
  try {
    const supabase = await createServerSupabaseClient();
    const { searchParams } = new URL(req.url);

    const filtered = searchParams.get('filtered') === 'true';
    const start = searchParams.get('start');
    const end = searchParams.get('end');

    // ── Revenue + Transactions ──
    let revenueQuery = supabase
      .from('Payment_Ledger')
      .select('amount_kes', { count: 'exact' })
      .eq('status', 'complete');

    if (filtered && start && end) {
      revenueQuery = revenueQuery
        .gte('created_at', start)
        .lte('created_at', end);
    }

    // ── Total Calls ──
    let callsQuery = supabase
      .from('call_events')
      .select('id', { count: 'exact' });

    if (filtered && start && end) {
      callsQuery = callsQuery
        .gte('created_at', start)
        .lte('created_at', end);
    }

    const [ revenueResult, callsResult ] = await Promise.all([
      revenueQuery,
      callsQuery,
    ]);

    if (revenueResult.error) return NextResponse.json({ error: revenueResult.error.message }, { status: 500 });
    if (callsResult.error) return NextResponse.json({ error: callsResult.error.message }, { status: 500 });

    const totalRevenue = (revenueResult.data ?? []).reduce((sum, row) => sum + (row.amount_kes ?? 0), 0);
    const totalTransactions = revenueResult.count ?? 0;
    const totalCalls = callsResult.count ?? 0;

    return NextResponse.json({ totalRevenue, totalTransactions, totalCalls });

  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}