import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { deleteFromCloudinary } from '@/lib/cloudinary';

export async function POST(request) {
  try {
    const supabase = await createServerSupabaseClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { listing_id, media } = await request.json();

    if (!listing_id) {
      return NextResponse.json({ error: 'listing_id required' }, { status: 400 });
    }
    if (!Array.isArray(media) || media.filter(m => m.resource_type === 'image').length < 3) {
      return NextResponse.json({ error: 'At least 3 images required' }, { status: 400 });
    }

    // Verify listing belongs to this user
    const { data: row, error: ownerError } = await supabase
      .from('Property_Listing')
      .select('listing_id')
      .eq('listing_id', listing_id)
      .eq('user_id', user.id)
      .single();

    if (ownerError || !row) {
      return NextResponse.json({ error: 'Listing not found' }, { status: 404 });
    }

    const rows = media.map(m => ({
      listing_id:           listing_id,
      image_url:            null,
      video_url:            null,
      cloudinary_url:       m.cloudinary_url,
      cloudinary_public_id: m.cloudinary_public_id,
      position:             m.position,
      storage_provider:     'cloudinary',
    }));

    const { error: mediaError } = await supabase.from('images_table').insert(rows);

    if (mediaError) {
      // Rollback Cloudinary assets and listing row
      for (const m of media) {
        await deleteFromCloudinary(m.cloudinary_public_id, m.resource_type);
      }
      await supabase.from('Property_Listing').delete().eq('listing_id', listing_id);
      return NextResponse.json({ error: mediaError.message }, { status: 500 });
    }

    return NextResponse.json({ listing_id }, { status: 201 });

  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}