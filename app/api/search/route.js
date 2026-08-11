import { createServerSupabaseClient } from '@/lib/supabase/server';
import { resolveWardNames } from '@/lib/resolveWardName';
import { NextResponse } from 'next/server';

export const revalidate = 0;

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get('q')?.trim();
  const mode = searchParams.get('mode') ?? 'exact';

  if (!q || q.length < 2) {
    return NextResponse.json({ data: [] });
  }

  const supabase = await createServerSupabaseClient();

  if (mode === 'exact') {
    const { data, error } = await supabase
      .from('Property_Listing')
      .select(`
  listing_id,
  property_name,
  property_price,
  property_interior,
  rent_duration,
  ward_name,
  images_table (
    image_url,
    cloudinary_url,
    cloudinary_public_id,
    video_url,
    position
  )
`)
      .ilike('property_name', `%${q}%`)
      .order('listing_id', { ascending: false })
      .limit(10);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const formatted = (data ?? []).map(row => ({
      listing_id: row.listing_id,
      property_name: row.property_name,
      property_price: row.property_price,
      property_interior: row.property_interior,
      rent_duration: row.rent_duration,
      ward_name: row.ward_name,
      media: (row.images_table ?? []).sort((a, b) => a.position - b.position),
    }));

    return NextResponse.json({ data: formatted });
  }

  if (mode === 'fuzzy') {
    const { data, error } = await supabase.rpc('search_listings_fuzzy', { p_query: q });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const rows = data ?? [];

    // Reroute ward-name resolution to the new-scheme table (payments project).
    const wardMap = await resolveWardNames(rows.map(l => l.ward_id));
    for (const l of rows) {
      const resolved = wardMap.get(l.ward_id);
      l.ward_name = resolved?.ward_name ?? null;
      l.ward_id = resolved?.ward_id ?? l.ward_id;
    }

    return NextResponse.json({ data: rows });
  }

  return NextResponse.json({ data: [] });
}