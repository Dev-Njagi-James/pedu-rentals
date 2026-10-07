import { NextResponse } from "next/server";
import { paymentsSupabase } from "@/lib/supabase/paymentsClient";
import { requireAuth } from "@/lib/auth/session";
import { canViewContact } from "@/lib/auth/contactAccess";
import { getCallerRole, hasActiveViewAccess } from "@/lib/auth/viewAccess";

export const revalidate = 0;

const NO_STORE = { "Cache-Control": "private, no-store" };

export async function GET(request, { params }) {
  const { id } = await params;
  const listing_id = parseInt(id, 10);
  if (isNaN(listing_id)) {
    return NextResponse.json({ error: "Invalid listing ID" }, { status: 400 });
  }

  const { user, error, status } = await requireAuth();
  if (error || !user) {
    return NextResponse.json(
      { error: error ?? "Unauthenticated" },
      { status: status ?? 401, headers: NO_STORE },
    );
  }

  const { data, error: queryError } = await paymentsSupabase
    .from("listings_table")
    .select(
      "phone_number, location_url, ward_location, lister_uuid, payment_status",
    )
    .eq("listing_id", listing_id)
    .maybeSingle();

  if (queryError) {
    return NextResponse.json(
      { error: "Failed to fetch contact" },
      { status: 500, headers: NO_STORE },
    );
  }

  // Unpaid listings are not public. Only the owner can reach their contact data.
  if (
    !data ||
    (data.payment_status !== "paid" && data.lister_uuid !== user.id)
  ) {
    return NextResponse.json(
      { error: "Listing not found" },
      { status: 404, headers: NO_STORE },
    );
  }

  let role;
  try {
    role = await getCallerRole();
  } catch {
    return NextResponse.json(
      { error: "Could not verify account" },
      { status: 503, headers: NO_STORE },
    );
  }
  const hasAccess =
    role !== "admin" && data.lister_uuid !== user.id
      ? await hasActiveViewAccess(user.id)
      : false;

  if (!canViewContact({ userId: user.id, role, hasAccess }, data)) {
    return NextResponse.json(
      { error: "Subscription required", code: "subscription_required" },
      { status: 403, headers: NO_STORE },
    );
  }

  return NextResponse.json(
    {
      data: {
        phone_number: data.phone_number,
        location_url: data.location_url,
        ward_location: data.ward_location,
      },
    },
    { headers: NO_STORE },
  );
}
