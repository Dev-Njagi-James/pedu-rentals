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

  const [daily, bL, bU, bK] = await Promise.all([
    paymentsSupabase.rpc("admin_growth_daily", {
      p_from: range.from,
      p_to: range.to,
    }),
    head("listings_table")
      .eq("payment_status", "paid")
      .lt("created_at", range.startIso),
    head("users_table")
      .ilike("account_type", "user")
      .lt("created_at", range.startIso),
    head("users_table")
      .ilike("account_type", "lister")
      .lt("created_at", range.startIso),
  ]);

  const failed = [daily, bL, bU, bK].find((r) => r.error);
  if (failed) {
    return NextResponse.json({ error: failed.error.message }, { status: 500 });
  }

  return NextResponse.json({
    from: range.from,
    to: range.to,
    baseline: { listings: bL.count, users: bU.count, listers: bK.count },
    series: (daily.data ?? []).map((r) => ({
      date: r.day,
      listings: Number(r.listings),
      users: Number(r.users),
      listers: Number(r.listers),
    })),
  });
}
