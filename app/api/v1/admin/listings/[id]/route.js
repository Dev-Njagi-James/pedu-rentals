//id
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/requireAdmin";
import { paymentsSupabase } from "@/lib/supabase/paymentsClient";

export async function GET(_request, { params }) {
  const gate = await requireAdmin();
  if (gate.error) return gate.error;

  const { id } = await params;
  if (!/^\d+$/.test(id)) {
    return NextResponse.json({ error: "Invalid listing id" }, { status: 400 });
  }

  const { data, error } = await paymentsSupabase
    .from("listings_table")
    .select(
      `*,
       images_table (images_url, video_url),
       users_table (lister_uuid, username, lister_email, phone_number)`,
    )
    .eq("listing_id", Number(id))
    .maybeSingle();

  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { users_table, ...item } = data;
  return NextResponse.json({
    ...item,
    lister: {
      uuid: item.lister_uuid,
      username: users_table?.username || users_table?.lister_email || "Lister",
      email: users_table?.lister_email ?? null,
      phone: users_table?.phone_number ?? null,
    },
  });
}
