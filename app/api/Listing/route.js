// app/api/Listing/route.js
import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { deleteFromCloudinary } from '@/lib/cloudinary';

const PAGE_SIZE = 20;

/* ── GET /api/Listing?page=1 ── */
export async function GET(request) {
  try {
    const supabase = await createServerSupabaseClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));
    const offset = (page - 1) * PAGE_SIZE;

    const { data, error, count } = await supabase
      .from('Property_Listing')
      .select(`
    listing_id,
    property_name,
    property_price,
    property_interior,
    rent_duration,
    ward_name,
    ward_id,
    ward_location,
    description,
    property_location,
    phone_number,
    created_at,
    category_id,
    property_type_id,
    images_table ( image_url, cloudinary_url, video_url, position ),
    property_categories ( category_name ),
    property_types ( type_name )
  `, { count: 'exact' })
      .eq('user_id', user.id)
      .order('listing_id', { ascending: false })
      .range(offset, offset + PAGE_SIZE - 1);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const shaped = (data ?? []).map(row => ({
      ...row,
      media: row.images_table ?? [],
      category_name: row.property_categories?.category_name ?? null,
      type_name: row.property_types?.type_name ?? null,
    }));

    const total_records = count ?? 0;
    const total_pages = Math.ceil(total_records / PAGE_SIZE);

    return NextResponse.json({
      data: shaped,
      pagination: {
        current_page: page,
        total_pages,
        total_records,
        page_size: PAGE_SIZE,
        has_next: page < total_pages,
        has_prev: page > 1,
      },
    });

  } catch (err) {
    console.error('GET /api/Listing error:', err);
    return NextResponse.json({ error: err.message ?? 'Internal server error' }, { status: 500 });
  }
}


export async function DELETE(request) {
  try {
    const supabase = await createServerSupabaseClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const listing_id = searchParams.get('listing_id');

    if (!listing_id) {
      return NextResponse.json({ error: 'listing_id is required' }, { status: 400 });
    }

    // ── Verify ownership before touching anything ─────────────
    const { data: listing, error: ownerError } = await supabase
      .from('Property_Listing')
      .select('listing_id')
      .eq('listing_id', listing_id)
      .eq('user_id', user.id)
      .single();

    if (ownerError || !listing) {
      return NextResponse.json({ error: 'Listing not found or access denied' }, { status: 404 });
    }

    // ── Fetch Cloudinary assets for this listing ──────────────
    const { data: mediaRows, error: mediaError } = await supabase
      .from('images_table')
      .select('cloudinary_public_id, position')
      .eq('listing_id', listing_id)
      .not('cloudinary_public_id', 'is', null);

    if (mediaError) {
      return NextResponse.json({ error: mediaError.message }, { status: 500 });
    }

    // ── Delete from Cloudinary ────────────────────────────────
    if (mediaRows?.length) {
      await Promise.allSettled(
        mediaRows.map(row =>
          deleteFromCloudinary(
            row.cloudinary_public_id,
            row.position === 0 ? 'video' : 'image'
          )
        )
      );
    }

    // ── Delete listing row (cascades to images_table if FK set) ─
    const { error: deleteError } = await supabase
      .from('Property_Listing')
      .delete()
      .eq('listing_id', listing_id)
      .eq('user_id', user.id);

    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });

  } catch (err) {
    console.error('DELETE /api/Listing error:', err);
    return NextResponse.json({ error: err.message ?? 'Internal server error' }, { status: 500 });
  }
}