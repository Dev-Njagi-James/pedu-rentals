import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/requireAdmin";
import { paymentsSupabase } from "@/lib/supabase/paymentsClient";
import {
  getCallCountsByListing,
  getViewCountsByListing,
} from "@/lib/analytics/query";

export async function GET(_request, { params }) {
  const gate = await requireAdmin();
  if (gate.error) return gate.error;

  const { id } = await params;
  if (!/^\d+$/.test(id)) {
    return NextResponse.json({ error: "Invalid listing id" }, { status: 400 });
  }

  try {
    const [{ data, error }, views, calls] = await Promise.all([
      paymentsSupabase
        .from("listings_table")
        .select("listing_id, avg_rating, review_count")
        .eq("listing_id", Number(id))
        .maybeSingle(),
      getViewCountsByListing(),
      getCallCountsByListing(),
    ]);

    if (error)
      return NextResponse.json({ error: error.message }, { status: 500 });
    if (!data)
      return NextResponse.json({ error: "Not found" }, { status: 404 });

    const key = String(data.listing_id);
    return NextResponse.json({
      views: views ? (views[key] ?? 0) : null,
      calls: calls ? (calls[key] ?? 0) : null,
      reviews: data.review_count ?? 0,
      rating: Number(data.avg_rating ?? 0),
    });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
