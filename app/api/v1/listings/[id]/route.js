// app/api/v1/listings/[id]/route.js
// GET single v1 listing by ID from the payments project (listings_table).
//
// - Column selection mirrors the v1 query in app/api/v1/listings/public/route.js
//   (section C), including images_table (images_url, video_url).
// - Response envelope matches the legacy app/api/listings/[id]/route.js:
//   { data: <row> } on success, 404 { error: 'Listing not found' } when the ID
//   has no row — so the detail page's existing `if (res.status === 404) return
//   null` logic keeps working unchanged.
// - No payment_status gate here: straight ID lookup per spec. The public list
//   route (section C) gates on payment_status='paid'; wire that here too if
//   this route ever serves the public detail page for v1 rows.

import { NextResponse } from "next/server";
import { paymentsSupabase } from "@/lib/supabase/paymentsClient";
import { requireAuth } from "@/lib/auth/session";
import { ScaleClient } from "@stravon/scale-sdk";

export const revalidate = 0;
const scale = new ScaleClient({ apiKey: process.env.SCALE_API_KEY });

export async function GET(request, { params }) {
  const { id } = await params;
  const listing_id = parseInt(id, 10);

  if (isNaN(listing_id)) {
    return NextResponse.json({ error: "Invalid listing ID" }, { status: 400 });
  }

  const { data, error } = await paymentsSupabase
    .from("listings_table")
    .select(
      `listing_id, listing_name, listing_category, category_type, furnishing,
       rent_duration, phone_number, price_kes, listing_ward, ward_display_name,
       ward_location, location_url, listing_description, plan_name, created_at, updated_at,
       images_table (images_url, video_url)`,
    )
    .eq("listing_id", listing_id)
    .maybeSingle();

  if (error) {
    return NextResponse.json(
      { error: "Failed to fetch listing", details: error.message },
      { status: 500 },
    );
  }

  if (!data) {
    return NextResponse.json({ error: "Listing not found" }, { status: 404 });
  }

  return NextResponse.json({ data });
}

export async function DELETE(request, { params }) {
  const { user, error: authError, status: authStatus } = await requireAuth();
  if (authError || !user) {
    return NextResponse.json(
      { error: authError || "Unauthenticated" },
      { status: authStatus || 401 },
    );
  }

  const { id } = await params;
  const listing_id = parseInt(id, 10);
  if (isNaN(listing_id)) {
    return NextResponse.json({ error: "Invalid listing ID" }, { status: 400 });
  }

  const { data: listing, error: fetchError } = await paymentsSupabase
    .from("listings_table")
    .select("lister_uuid, images_table (media_id, images_url)")
    .eq("listing_id", listing_id)
    .maybeSingle();

  if (fetchError) {
    return NextResponse.json({ error: fetchError.message }, { status: 500 });
  }
  if (!listing) {
    return NextResponse.json({ error: "Listing not found" }, { status: 404 });
  }
  if (listing.lister_uuid !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const imageKeys = (listing.images_table?.images_url ?? [])
    .map((img) => img.key)
    .filter(Boolean);

  // Gate: every R2 object must delete successfully before any DB row is touched.
  const failedKeys = [];
  for (const key of imageKeys) {
    try {
      const result = await scale.storage.delete({ key });
      if (!result?.success) {
        failedKeys.push(key);
      }
    } catch (err) {
      failedKeys.push(key);
      console.error(`SCALE delete failed for key ${key}:`, err.message);
    }
  }

  if (failedKeys.length > 0) {
    return NextResponse.json(
      {
        error:
          "Failed to delete one or more storage files. Listing was not deleted.",
        failedKeys,
      },
      { status: 500 },
    );
  }

  // review_reactions FK's to reviews_table — must clear before reviews_table row deletion.
  const { data: reviewRows, error: reviewLookupError } = await paymentsSupabase
    .from("reviews_table")
    .select("review_id")
    .eq("listing_id", listing_id);

  if (reviewLookupError) {
    return NextResponse.json(
      { error: reviewLookupError.message },
      { status: 500 },
    );
  }

  const reviewIds = (reviewRows ?? []).map((r) => r.review_id);

  if (reviewIds.length > 0) {
    const { error: reactionsDeleteError } = await paymentsSupabase
      .from("review_reactions")
      .delete()
      .in("review_id", reviewIds);

    if (reactionsDeleteError) {
      return NextResponse.json(
        { error: reactionsDeleteError.message },
        { status: 500 },
      );
    }
  }

  const { error: reviewsDeleteError } = await paymentsSupabase
    .from("reviews_table")
    .delete()
    .eq("listing_id", listing_id);

  if (reviewsDeleteError) {
    return NextResponse.json(
      { error: reviewsDeleteError.message },
      { status: 500 },
    );
  }

  const { error: imagesDeleteError } = await paymentsSupabase
    .from("images_table")
    .delete()
    .eq("listing_id", listing_id);

  if (imagesDeleteError) {
    return NextResponse.json(
      { error: imagesDeleteError.message },
      { status: 500 },
    );
  }

  const { error: listingDeleteError } = await paymentsSupabase
    .from("listings_table")
    .delete()
    .eq("listing_id", listing_id);

  if (listingDeleteError) {
    return NextResponse.json(
      { error: listingDeleteError.message },
      { status: 500 },
    );
  }

  return NextResponse.json({ success: true });
}