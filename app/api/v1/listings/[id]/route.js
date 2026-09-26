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
import { ScaleClient, ScaleError, ValidationError } from "@stravon/scale-sdk";

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

export async function PATCH(request, { params }) {
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

  const { data: existing, error: fetchError } = await paymentsSupabase
    .from("listings_table")
    .select("lister_uuid, created_at")
    .eq("listing_id", listing_id)
    .maybeSingle();

  if (fetchError) {
    return NextResponse.json({ error: fetchError.message }, { status: 500 });
  }
  if (!existing) {
    return NextResponse.json({ error: "Listing not found" }, { status: 404 });
  }
  if (existing.lister_uuid !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const fields = body ?? {};
    const files = Array.isArray(fields.files) ? fields.files : [];

    const required = [
      "property_name",
      "ward_id",
      "ward_name",
      "category_name",
      "category_type_name",
      "property_price",
      "phone_number",
    ];
    const missing = required.filter(
      (key) => !fields[key] || String(fields[key]).trim() === "",
    );
    if (missing.length > 0) {
      return NextResponse.json(
        { error: `Missing required fields: ${missing.join(", ")}` },
        { status: 400 },
      );
    }

    const listing_ward = Number.parseInt(fields.ward_id, 10);
    const price_kes = Number.parseInt(fields.property_price, 10);
    if (!Number.isInteger(listing_ward) || !Number.isInteger(price_kes)) {
      return NextResponse.json(
        { error: "Ward and price must be valid numbers." },
        { status: 400 },
      );
    }

    const { error: updateError } = await paymentsSupabase
      .from("listings_table")
      .update({
        listing_name: String(fields.property_name).trim(),
        listing_ward,
        ward_display_name: String(fields.ward_name).trim(),
        ward_location: fields.ward_location || null,
        location_url: fields.property_location || null,
        listing_description: fields.description,
        listing_category: String(fields.category_name).trim(),
        category_type: String(fields.category_type_name).trim(),
        furnishing: fields.property_interior || null,
        rent_duration: fields.rent_duration || null,
        phone_number: String(fields.phone_number),
        price_kes,
      })
      .eq("listing_id", listing_id);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    if (files.length === 0) {
      return NextResponse.json(
        { listing_id, uploadTargets: [] },
        { status: 200 },
      );
    }

    const uploadTargets = await Promise.all(
      files.map(async (file) => {
        if (
          !file ||
          typeof file.filename !== "string" ||
          typeof file.contentType !== "string" ||
          !Number.isFinite(file.fileSize) ||
          file.fileSize <= 0 ||
          !["image", "video"].includes(file.type) ||
          !Number.isInteger(file.position)
        ) {
          throw new ValidationError("Invalid file metadata.");
        }

        const created = await scale.storage.create({
          filename: file.filename,
          contentType: file.contentType,
          fileSize: file.fileSize,
        });

        return {
          key: created.key,
          uploadUrl: created.uploadUrl,
          publicUrl: created.publicUrl,
          position: file.position,
          type: file.type,
        };
      }),
    );

    return NextResponse.json({ listing_id, uploadTargets }, { status: 200 });
  } catch (err) {
    if (err instanceof ValidationError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    if (err instanceof ScaleError) {
      return NextResponse.json({ error: err.message }, { status: 500 });
    }
    return NextResponse.json(
      { error: err?.message || "Failed to update listing." },
      { status: 500 },
    );
  }
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
