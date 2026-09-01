// app/api/admin/verification/route.js
import { createAdminClient } from '@/lib/supabase/server';
import { resolveWardNames } from '@/lib/resolveWardName';
import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/session';

export async function GET() {
  try {
    const { user, error, status } = await requireAuth();
    if (error) {
      return NextResponse.json({ error }, { status });
    }

    const admin = createAdminClient();

    const { data: listings, error: listingError } = await admin
      .from('Property_Listing')
      .select(`
    listing_id,
    property_name,
    property_price,
    views,
    user_id,
    ward_id,
    property_categories ( category_name ),
    images_table ( image_url, position )
  `)
      .order('listing_id', { ascending: false })
      .limit(500);

    if (listingError) {
      return NextResponse.json({ error: listingError.message }, { status: 500 });
    }

    // Get all unique user_ids from listings
    const userIds = [ ...new Set((listings ?? []).map(l => l.user_id).filter(Boolean)) ];

    // Fetch lister status for all listers
    const listingIds = (listings ?? []).map(l => l.listing_id);

    // Collect unique old ward_ids from listings for mapping lookup
    const oldWardIds = [ ...new Set((listings ?? []).map(l => l.ward_id).filter(Boolean)) ];

    const [
      { data: listers, error: listerError },
      { data: reviews },
    ] = await Promise.all([
      admin.from('Listers_Info').select('lister_UUID, Status').in('lister_UUID', userIds),
      admin.from('listing_reviews').select('listing_id, rating').in('listing_id', listingIds),
    ]);

    if (listerError) {
      return NextResponse.json({ error: listerError.message }, { status: 500 });
    }

    // Resolve ward names via the shared helper (single resolution path).
    // Keyed by the original (old-scheme) ward_id → { ward_id (new), ward_name }.
    const wardMap = await resolveWardNames(oldWardIds);

    // build review stats map
    const reviewMap = {};
    (reviews ?? []).forEach(r => {
      if (!reviewMap[ r.listing_id ]) {
        reviewMap[ r.listing_id ] = { count: 0, total: 0 };
      }
      reviewMap[ r.listing_id ].count += 1;
      reviewMap[ r.listing_id ].total += r.rating;
    });

    // Map UUID → status
    const statusMap = {};
    (listers ?? []).forEach(l => { statusMap[ l.lister_UUID ] = l.Status; });

    const shaped = (listings ?? []).map(l => {
      const { images_table, property_categories, ...rest } = l;
      const stats = reviewMap[ l.listing_id ] ?? { count: 0, total: 0 };
      const wardInfo = wardMap.get(l.ward_id) ?? {};
      return {
        ...rest,
        category_name: property_categories?.category_name ?? null,
        ward_name: wardInfo.ward_name ?? null,
        ward_id: wardInfo.ward_id ?? null,
        media: images_table ?? [],
        review_count: stats.count,
        avg_rating: stats.count > 0 ? Math.round((stats.total / stats.count) * 10) / 10 : 0,
        status: statusMap[ l.user_id ] ?? 'FREE TIER',
      };
    });

    return NextResponse.json({ data: shaped });

  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
