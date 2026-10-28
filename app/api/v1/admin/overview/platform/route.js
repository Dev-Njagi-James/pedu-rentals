import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/requireAdmin";
import { paymentsSupabase } from "@/lib/supabase/paymentsClient";
import { parseRange } from "@/lib/admin/dateRange";

export async function GET(request) {
  const gate = await requireAdmin();
  if (gate.error) return gate.error;

  const range = parseRange(new URL(request.url).searchParams);
  if (range.error) {
    return NextResponse.json({ error: range.error }, { status: 400 });
  }

  const head = (table) =>
    paymentsSupabase.from(table).select("*", { count: "exact", head: true });
  const live = () => head("listings_table").eq("payment_status", "paid");
  const inRange = (q) =>
    q.gte("created_at", range.startIso).lt("created_at", range.endIso);

  const results = await Promise.all([
    live(),
    inRange(live()),
    head("users_table").ilike("account_type", "user"),
    inRange(head("users_table").ilike("account_type", "user")),
    head("users_table").ilike("account_type", "lister"),
    inRange(head("users_table").ilike("account_type", "lister")),
  ]);

  const failed = results.find((r) => r.error);
  if (failed) {
    return NextResponse.json({ error: failed.error.message }, { status: 500 });
  }
  const [lAll, lIn, uAll, uIn, kAll, kIn] = results;

  return NextResponse.json({
    from: range.from,
    to: range.to,
    totalListings: lAll.count,
    totalUsers: uAll.count,
    totalListers: kAll.count,
    inRange: { listings: lIn.count, users: uIn.count, listers: kIn.count },
  });
}
