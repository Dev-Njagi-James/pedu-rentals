// app/api/v1/analytics/listings/route.js
// Lister-scoped listing analytics — v1 schema only (payments listings_table).
// Reviews/ratings data now; views/calls are placeholders pending the PostHog
// aggregation merge (see TODO below).

import { NextResponse } from "next/server";
import { paymentsSupabase } from "@/lib/supabase/paymentsClient";
import { requireAuth } from "@/lib/auth/session";
import { getCallCountsByListing } from "@/lib/analytics/query";

export async function GET() {
  try {
    const { user, error, status } = await requireAuth();
    if (error) {
      return NextResponse.json({ error }, { status });
    }

    const { data, error: dbError } = await paymentsSupabase
      .from("listings_table")
      .select(
        `
    listing_id,
    listing_name,
    avg_rating,
    review_count,
    ward_location,
    images_table ( images_url )
  `,
      )
      .eq("lister_uuid", user.id);

    if (dbError) {
      return NextResponse.json({ error: dbError.message }, { status: 500 });
    }
    const callCounts = await getCallCountsByListing();

    const rows = (data ?? []).map(({ images_table, ...row }) => {
      const imageRows = Array.isArray(images_table)
        ? images_table
        : images_table
          ? [images_table]
          : [];
      const allImages = imageRows.flatMap((r) =>
        Array.isArray(r.images_url) ? r.images_url : [],
      );
      const sorted = [...allImages].sort(
        (a, b) => (a.position ?? 0) - (b.position ?? 0),
      );

      return {
        ...row,
        image_url: sorted[0]?.publicUrl ?? null,
        views: null,
        call_logs: callCounts
          ? (callCounts[String(row.listing_id)] ?? 0)
          : null,
      };
    });

    return NextResponse.json({ data: rows }, { status: 200 });
  } catch (err) {
    console.error("GET /api/v1/analytics/listings error:", err);
    return NextResponse.json(
      { error: err.message ?? "Internal server error" },
      { status: 500 },
    );
  }
}
