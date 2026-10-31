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
      `listing_id, lister_uuid, payment_status, admin_unpublished_at, listing_name, listing_category, category_type, furnishing,
       rent_duration, price_kes, listing_ward, ward_display_name,
       listing_description, plan_name, created_at, updated_at,
       images_table (images_url, video_url)`,
    )
    .eq("listing_id", listing_id)
    .maybeSingle();

  if (error) {
    return NextResponse.json(
      { error: "Failed to fetch listing" },
      { status: 500 },
    );
  }
  if (!data) {
    return NextResponse.json({ error: "Listing not found" }, { status: 404 });
  }

  const isPublic = data.payment_status === "paid" && !data.admin_unpublished_at;
  if (!isPublic) {
    const { user } = await requireAuth();
    if (!user || user.id !== data.lister_uuid) {
      return NextResponse.json({ error: "Listing not found" }, { status: 404 });
    }
  }

  const { lister_uuid, ...rest } = data;
  return NextResponse.json({ data: rest });
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

  // Ownership check, child cleanup and listing delete happen in one transaction.
  const { data, error } = await paymentsSupabase.rpc("delete_listing_cascade", {
    p_listing_id: listing_id,
    p_lister_uuid: user.id,
  });

  if (error) {
    console.error("[listings DELETE]", { listing_id }, error);
    const status =
      error.code === "P0002"
        ? 404
        : error.code === "42501"
          ? 403
          : error.code === "55000"
            ? 409
            : 500;
    return NextResponse.json({ error: error.message }, { status });
  }

  // DB is already clean. Storage cleanup is best effort: a failure leaves an
  // orphaned file, never a broken listing.
  const keys = data?.keys ?? [];
  const failedKeys = [];
  await Promise.all(
    keys.map(async (key) => {
      try {
        const result = await scale.storage.delete({ key });
        if (!result?.success) failedKeys.push(key);
      } catch {
        failedKeys.push(key);
      }
    }),
  );
  if (failedKeys.length > 0) {
    console.error("[listings DELETE] orphaned storage keys", {
      listing_id,
      failedKeys,
    });
  }

  return NextResponse.json({ success: true });
}
