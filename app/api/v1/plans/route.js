import { NextResponse } from 'next/server';
import { paymentsSupabase } from '@/lib/supabase/paymentsClient';
import { requireAuth } from '@/lib/auth/session';

export async function GET(request) {
  // Auth check — plans are shown to authenticated listers at popup time.
  const { user, error: authError, status: authStatus } = await requireAuth();
  if (authError || !user) {
    return NextResponse.json(
      { error: authError || 'Unauthenticated' },
      { status: authStatus || 401 }
    );
  }

  try {
    const { searchParams } = new URL(request.url);
    const category_name = searchParams.get('category_name');

    if (!category_name || String(category_name).trim() === '') {
      return NextResponse.json(
        { error: 'category_name query param is required' },
        { status: 400 }
      );
    }

    // Query plan_category_pricing joined with plans_table for display ordering.
    const { data: plans, error: plansErr } = await paymentsSupabase
      .from('plan_category_pricing')
      .select('plan_name, price_kes, plans_table(plan_name, visibility_label, priority_rank)')
      .eq('category_name', category_name)
      .order('plan_name');

    if (plansErr) {
      return NextResponse.json({ error: plansErr.message }, { status: 500 });
    }

    if (!plans || plans.length === 0) {
      return NextResponse.json(
        { error: 'No plans found for the given category' },
        { status: 400 }
      );
    }

    // Sort by priority_rank for display ordering.
    const sorted = [...plans].sort(
      (a, b) => (a.plans_table?.priority_rank ?? 0) - (b.plans_table?.priority_rank ?? 0)
    );

    const result = sorted.map((p) => ({
      plan_name: p.plan_name,
      visibility_label: p.plans_table?.visibility_label ?? p.plan_name,
      price_kes: p.price_kes,
    }));

    return NextResponse.json({ plans: result }, { status: 200 });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}