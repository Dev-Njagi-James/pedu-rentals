// app/api/v1/analytics/listings/route.js
// Lister-scoped listing analytics — v1 schema only (payments listings_table).
// Reviews/ratings data now; views/calls are placeholders pending the PostHog
// aggregation merge (see TODO below).

import { NextResponse } from "next/server";
import { paymentsSupabase } from "@/lib/supabase/paymentsClient";
import { requireAuth } from "@/lib/auth/session";
import {
  getCallCountsByListing,
  getViewCountsByListing,
} from "@/lib/analytics/query";

// Engagement weights. Tune here.
const WEIGHT_VIEW = 1;
const WEIGHT_CALL = 5;
const WEIGHT_REVIEW = 10;

const engagementScore = (r) =>
  (r.views ?? 0) * WEIGHT_VIEW +
  (r.call_logs ?? 0) * WEIGHT_CALL +
  (r.review_count ?? 0) * WEIGHT_REVIEW;

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
    const viewCounts = await getViewCountsByListing();

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
        views: viewCounts ? (viewCounts[String(row.listing_id)] ?? 0) : null,
        call_logs: callCounts
          ? (callCounts[String(row.listing_id)] ?? 0)
          : null,
      };
    });

      rows.sort(
      (a, b) =>
        engagementScore(b) - engagementScore(a) ||
        (b.avg_rating ?? 0) - (a.avg_rating ?? 0) ||
        b.listing_id - a.listing_id,
    );

    return NextResponse.json({ data: rows }, { status: 200 });
  } catch (err) {
    console.error("GET /api/v1/analytics/listings error:", err);
    return NextResponse.json(
      { error: err.message ?? "Internal server error" },
      { status: 500 },
    );
  }
}
