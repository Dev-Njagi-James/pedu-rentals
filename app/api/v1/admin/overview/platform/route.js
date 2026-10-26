import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/requireAdmin";
import { paymentsSupabase } from "@/lib/supabase/paymentsClient";

const ACCOUNT_TYPE_COLUMN = "account_type"; // confirm the real column name

export async function GET() {
  const gate = await requireAdmin();
  if (gate.error) return gate.error;

  const admin = paymentsSupabase;

  const [listings, users, listers] = await Promise.all([
    admin.from("listings_table").select("*", { count: "exact", head: true }),
    admin
      .from("users_table")
      .select("*", { count: "exact", head: true })
      .ilike("account_type", "user"),
    admin
      .from("users_table")
      .select("*", { count: "exact", head: true })
      .ilike("account_type", "lister"),
  ]);

  const failed = [listings, users, listers].find((r) => r.error);
  if (failed) {
    return NextResponse.json({ error: failed.error.message }, { status: 500 });
  }

  return NextResponse.json({
    totalListings: listings.count,
    totalUsers: users.count,
    totalListers: listers.count,
  });
}
