// app/api/listings/[id]/route.js

import { createServerSupabaseClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { EDIT_WINDOW_DAYS } from '@/lib/constants';

export const revalidate = 0;

export async function GET(request, { params }) {
  const { id } = await params;
  const listing_id = parseInt(id, 10);

  if (isNaN(listing_id)) {
    return NextResponse.json({ error: 'Invalid listing ID' }, { status: 400 });
  }

  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase.rpc('get_listings_paginated', {
    p_limit: 1,
    p_offset: 0,
    p_listing_id: listing_id,
  });

  if (error) {
    return NextResponse.json(
      { error: 'Failed to fetch listing', details: error.message },
      { status: 500 }
    );
  }

  if (!data || data.length === 0) {
    return NextResponse.json({ error: 'Listing not found' }, { status: 404 });
  }

  return NextResponse.json({ data: data[0] });
}

export async function PATCH(request, { params }) {
  const { id } = await params;
  const listing_id = parseInt(id, 10);

  if (isNaN(listing_id)) {
    return NextResponse.json({ error: 'Invalid listing ID' }, { status: 400 });
  }

  const supabase = await createServerSupabaseClient();

  // Auth
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Ownership + 2-day window
  const { data: existing, error: fetchError } = await supabase
    .from('Property_Listing')
    .select('created_at, user_id')
    .eq('listing_id', listing_id)
    .single();

  if (fetchError || !existing) {
    return NextResponse.json({ error: 'Listing not found' }, { status: 404 });
  }

  if (existing.user_id !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const diffDays = (Date.now() - new Date(existing.created_at).getTime()) / (1000 * 60 * 60 * 24);
  if (diffDays > EDIT_WINDOW_DAYS) {
    return NextResponse.json({ error: 'Edit window expired' }, { status: 403 });
  }

  // Parse formData
  const formData = await request.formData();

  // Scalar fields matching Property_Listing columns exactly
  const scalarFields = [
    'property_name',
    'description',
    'rent_duration',
    'property_interior',
    'property_price',
    'property_location',
    'ward_location',
    'ward_name',
    'phone_number',
    'ward_id',
    'category_id',
    'property_type_id',
  ];

  const listingUpdate = {};
  for (const field of scalarFields) {
    if (formData.has(field)) {
      const val = formData.get(field);
      listingUpdate[field] = ['ward_id', 'category_id', 'property_type_id', 'phone_number'].includes(field)
        ? Number(val)
        : val;
    }
  }

  // Update Property_Listing if any scalar fields were sent
  if (Object.keys(listingUpdate).length > 0) {
    const { error: updateError } = await supabase
      .from('Property_Listing')
      .update(listingUpdate)
      .eq('listing_id', listing_id);

    if (updateError) {
      return NextResponse.json(
        { error: 'Failed to update listing', details: updateError.message },
        { status: 500 }
      );
    }
  }

  // Image handling — only runs if new images were submitted
  const imageFiles = formData.getAll('images').filter(f => f?.size > 0);

  if (imageFiles.length > 0) {
    // Upload new files to storage
    const uploadedUrls = [];

    for (const [index, file] of imageFiles.entries()) {
      const ext = file.name.split('.').pop();
      const path = `listings/${listing_id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from('listing-images')         // adjust bucket name to yours
        .upload(path, file, { upsert: false });

      if (uploadError) {
        return NextResponse.json(
          { error: 'Image upload failed', details: uploadError.message },
          { status: 500 }
        );
      }

      const { data: urlData } = supabase.storage
        .from('listing-images')
        .getPublicUrl(path);

      uploadedUrls.push({ url: urlData.publicUrl, position: index });
    }

    // Delete existing images_table rows for this listing
    const { error: deleteError } = await supabase
      .from('images_table')
      .delete()
      .eq('listing_id', listing_id);

    if (deleteError) {
      return NextResponse.json(
        { error: 'Failed to replace images', details: deleteError.message },
        { status: 500 }
      );
    }

    // Insert new rows
    const imageRows = uploadedUrls.map(({ url, position }) => ({
      listing_id,
      image_url: url,
      position,
    }));

    const { error: insertError } = await supabase
      .from('images_table')
      .insert(imageRows);

    if (insertError) {
      return NextResponse.json(
        { error: 'Failed to save image records', details: insertError.message },
        { status: 500 }
      );
    }
  }

  // Return the updated listing
  const { data: result, error: resultError } = await supabase.rpc('get_listings_paginated', {
    p_limit: 1,
    p_offset: 0,
    p_listing_id: listing_id,
  });

  if (resultError) {
    return NextResponse.json({ error: 'Update succeeded but fetch failed', details: resultError.message }, { status: 500 });
  }

  return NextResponse.json({ data: result[0] });
}