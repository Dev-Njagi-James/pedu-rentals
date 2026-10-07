import { NextResponse } from "next/server";
import { paymentsSupabase } from "@/lib/supabase/paymentsClient";
import { requireAuth } from "@/lib/auth/session";
import { canViewContact } from "@/lib/auth/contactAccess";
import { getCallerRole, hasActiveViewAccess } from "@/lib/auth/viewAccess";

export const revalidate = 0;

const NO_STORE = { "Cache-Control": "private, no-store" };
const MAX_IDS = 50;

export async function GET(request) {
  const raw = new URL(request.url).searchParams.get("ids") ?? "";
  const ids = [
    ...new Set(
      raw
        .split(",")
        .map((s) => parseInt(s, 10))
        .filter((n) => Number.isInteger(n) && n > 0),
    ),
  ];
  if (ids.length === 0 || ids.length > MAX_IDS) {
    return NextResponse.json(
      { error: `Provide 1 to ${MAX_IDS} listing ids` },
      { status: 400, headers: NO_STORE },
    );
  }

  const { user, error, status } = await requireAuth();
  if (error || !user) {
    return NextResponse.json(
      { error: error ?? "Unauthenticated" },
      { status: status ?? 401, headers: NO_STORE },
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

  const { data: rows, error: queryError } = await paymentsSupabase
    .from("listings_table")
    .select(
      "listing_id, phone_number, location_url, ward_location, lister_uuid, payment_status",
    )
    .in("listing_id", ids);

  if (queryError) {
    return NextResponse.json(
      { error: "Failed to fetch contact" },
      { status: 500, headers: NO_STORE },
    );
  }

  // One access lookup for the whole batch, only when a lister needs it.
  const needsGrant =
    role !== "admin" && rows.some((r) => r.lister_uuid !== user.id);
  const hasAccess = needsGrant ? await hasActiveViewAccess(user.id) : false;

  const byId = new Map(rows.map((r) => [r.listing_id, r]));
  const result = {};

  for (const id of ids) {
    const row = byId.get(id);
    if (
      !row ||
      (row.payment_status !== "paid" && row.lister_uuid !== user.id)
    ) {
      result[id] = { status: "not_found" };
      continue;
    }
    const allowed = canViewContact({ userId: user.id, role, hasAccess }, row);
    result[id] = allowed
      ? {
          status: "ok",
          data: {
            phone_number: row.phone_number,
            location_url: row.location_url,
            ward_location: row.ward_location,
          },
        }
      : { status: "forbidden" };
  }

  return NextResponse.json({ data: result }, { headers: NO_STORE });
}
