import { NextResponse } from 'next/server';
import { paymentsSupabase } from '@/lib/supabase/paymentsClient';
import { requireAuth } from '@/lib/auth/session';

export async function GET(request) {
  const { user, error: authError, status: authStatus } = await requireAuth();

  if (authError || !user) {
    return NextResponse.json(
      { error: authError || 'Unauthenticated' },
      { status: authStatus || 401 }
    );
  }

  try {
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)));
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    const { data, error, count } = await paymentsSupabase
      .from('listings_table')
      .select(
        `listing_id, listing_name, listing_category, category_type, furnishing,
         rent_duration, phone_number, price_kes, listing_ward, ward_display_name,
         ward_location, location_url, listing_description, plan_name, created_at, updated_at,
         images_table (images_url, video_url)`,
        { count: 'exact' }
      )
      .eq('lister_uuid', user.id)
      .order('created_at', { ascending: false })
      .range(from, to);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      listings: data,
      page,
      limit,
      total: count,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err?.message || 'Failed to fetch listings.' },
      { status: 500 }
    );
  }
}