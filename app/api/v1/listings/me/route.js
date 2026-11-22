import { NextResponse } from "next/server";
import { paymentsSupabase } from "@/lib/supabase/paymentsClient";
import { requireAuth } from "@/lib/auth/session";
import { rankListings } from "@/lib/ranking/rankListings";

export async function GET(request) {
  const { user, error: authError, status: authStatus } = await requireAuth();

  if (authError || !user) {
    return NextResponse.json(
      { error: authError || "Unauthenticated" },
      { status: authStatus || 401 },
    );
  }

  try {
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(
      50,
      Math.max(1, parseInt(searchParams.get("limit") || "20", 10)),
    );
    const status = (searchParams.get("status") || "").toLowerCase();
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    const { data, error } = await paymentsSupabase
      .from("listings_table")
      .select(
        `listing_id, listing_name, listing_category, category_type, furnishing,
         rent_duration, phone_number, price_kes, listing_ward, ward_display_name,
         ward_location, location_url, listing_description, plan_name, payment_status,
          created_at, updated_at,
         images_table (images_url, video_url),
         subscriptions_table (status, expires_at, plan_name),
         admin_unpublished_at`,
        { count: "exact" },
      )
      .eq("lister_uuid", user.id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const all = data.map((row) => ({ ...row, _source: "v1" }));

    const hasActiveSub = (listing) => {
      const subs = listing.subscriptions_table;
      if (!Array.isArray(subs)) return false;
      const now = new Date();
      return subs.some(
        (s) =>
          s.status === "active" &&
          s.expires_at &&
          new Date(s.expires_at) > now,
      );
    };

    let filtered = all;
    if (status === "active") {
      filtered = all.filter(
        (r) =>
          r.payment_status === "paid" &&
          r.admin_unpublished_at == null &&
          hasActiveSub(r),
      );
    } else if (status === "pending") {
      filtered = all.filter(
        (r) =>
          r.payment_status === "pending" && r.admin_unpublished_at == null,
      );
    } else if (status === "unpublished") {
      filtered = all.filter((r) => r.admin_unpublished_at != null);
    } else if (status === "unsubscribed") {
      filtered = all.filter(
        (r) =>
          r.payment_status === "paid" &&
          r.admin_unpublished_at == null &&
          !hasActiveSub(r),
      );
    }

    const pending = filtered
      .filter((r) => r.payment_status !== "paid")
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    const paid = rankListings(
      filtered.filter((r) => r.payment_status === "paid"),
    );
    const ordered = [...pending, ...paid].map((r) => ({
      ...r,
      is_unsubscribed:
        r.payment_status === "paid" &&
        r.admin_unpublished_at == null &&
        !hasActiveSub(r),
    }));

    return NextResponse.json({
      listings: ordered.slice(from, to + 1),
      page,
      limit,
      total: ordered.length,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err?.message || "Failed to fetch listings." },
      { status: 500 },
    );
  }
}
