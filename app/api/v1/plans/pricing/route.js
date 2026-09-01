import { NextResponse } from 'next/server';
import { paymentsSupabase } from '@/lib/supabase/paymentsClient';
import { requireAuth } from '@/lib/auth/session';

export async function GET() {
  const { user, error: authError, status: authStatus } = await requireAuth();

  if (authError || !user) {
    return NextResponse.json(
      { error: authError || 'Unauthenticated' },
      { status: authStatus || 401 }
    );
  }

  try {
    const { data, error } = await paymentsSupabase
      .from('plan_category_pricing')
      .select(`
        plan_name,
        category_name,
        price_kes,
        plans_table(
          visibility_label,
          priority_rank
        )
      `);

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    const pricing = (data ?? [])
      .map((row) => ({
        plan_name: row.plan_name,
        category_name: row.category_name,
        visibility_label:
          row.plans_table?.visibility_label ?? row.plan_name,
        price_kes: row.price_kes,
        priority_rank: row.plans_table?.priority_rank ?? 0,
      }))
      .sort((a, b) => {
        if (a.category_name !== b.category_name) {
          return a.category_name.localeCompare(b.category_name);
        }

        return a.priority_rank - b.priority_rank;
      })
      .map(({ priority_rank, ...row }) => row);

    return NextResponse.json(
      { pricing },
      {
        status: 200,
        headers: {
          // The browser component has its own 24-hour cache. This header also
          // prevents unnecessary server-side revalidation for one day.
          'Cache-Control': 'private, max-age=86400',
        },
      }
    );
  } catch (error) {
    return NextResponse.json(
      { error: error.message || 'Failed to load pricing.' },
      { status: 500 }
    );
  }
}
