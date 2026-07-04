import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function POST(request) {
  try {
    const supabase = await createServerSupabaseClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const {
      property_name, ward_id, ward_name, ward_location,
      property_location, category_id, type_id, rent_duration,
      property_interior, phone_number, property_price, description,
    } = await request.json();

    const missing = [];
    for (const [key, val] of Object.entries({
      property_name, ward_id, ward_location, property_location,
      category_id, type_id, rent_duration, property_interior,
      phone_number, property_price, description,
    })) {
      if (!val || String(val).trim() === '') missing.push(key);
    }
    if (missing.length > 0) {
      return NextResponse.json(
        { error: `Missing required fields: ${missing.join(', ')}` },
        { status: 400 }
      );
    }

    const { data: listing, error: listingError } = await supabase
      .from('Property_Listing')
      .insert({
        user_id:          user.id,
        property_name,
        ward_id:          parseInt(ward_id, 10),
        ward_name,
        ward_location,
        property_location,
        category_id:      parseInt(category_id, 10),
        property_type_id: parseInt(type_id, 10),
        rent_duration,
        property_interior,
        phone_number:     parseInt(phone_number, 10),
        property_price,
        description,
      })
      .select('listing_id')
      .single();

    if (listingError) {
      return NextResponse.json({ error: listingError.message }, { status: 500 });
    }

    return NextResponse.json({ listing_id: listing.listing_id }, { status: 201 });

  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}