import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/requireAdmin";
import { paymentsSupabase } from "@/lib/supabase/paymentsClient";

export async function GET(request) {
  const gate = await requireAdmin();
  if (gate.error) return gate.error;

  const { searchParams } = new URL(request.url);
  const days = parseInt(searchParams.get("days") || "30", 10);

  const now = new Date();
  const startDate = new Date();
  startDate.setDate(now.getDate() - days);
  const startDateIso = startDate.toISOString();

  try {
    // 1. Fetch listings created in the date window from Supabase
    const { data: listingsData, error: listingsErr } = await paymentsSupabase
      .from("listings_table")
      .select("created_at")
      .gte("created_at", startDateIso)
      .order("created_at", { ascending: true });

    if (listingsErr) {
      return NextResponse.json({ error: listingsErr.message }, { status: 500 });
    }

    // 2. Fetch users created in the date window from Supabase users_table
    const { data: usersData, error: usersErr } = await paymentsSupabase
      .from("users_table")
      .select("created_at, account_type")
      .gte("created_at", startDateIso)
      .order("created_at", { ascending: true });

    if (usersErr) {
      return NextResponse.json({ error: usersErr.message }, { status: 500 });
    }

    // Generate date map array for the requested timeframe
    const dateMap = {};
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(now.getDate() - i);
      const dateStr = d.toISOString().split("T")[0];
      dateMap[dateStr] = { date: dateStr, listings: 0, users: 0, listers: 0 };
    }

    // Group listings by date
    (listingsData || []).forEach((item) => {
      if (!item.created_at) return;
      const dateStr = item.created_at.split("T")[0];
      if (dateMap[dateStr]) {
        dateMap[dateStr].listings += 1;
      }
    });

    // Group Supabase users by date and account type
    (usersData || []).forEach((u) => {
      if (!u.created_at) return;
      const dateStr = u.created_at.split("T")[0];
      const accountType = (u.account_type || "User").toLowerCase();

      if (dateMap[dateStr]) {
        if (accountType === "lister") {
          dateMap[dateStr].listers += 1;
        } else if (accountType === "user" || accountType === "admin") {
          // Count admins/users under regular users or track separately if preferred
          dateMap[dateStr].users += 1;
        }
      }
    });

    const series = Object.values(dateMap);

    return NextResponse.json({
      days,
      series,
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
