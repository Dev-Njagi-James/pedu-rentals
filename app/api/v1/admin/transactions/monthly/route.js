import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/requireAdmin";
import { paymentsSupabase } from "@/lib/supabase/paymentsClient";

export async function GET() {
  const gate = await requireAdmin();
  if (gate.error) return gate.error;

  try {
    // Fetch completed payments from both tables
    const [{ data: listerPay }, { data: accessPay }] = await Promise.all([
      paymentsSupabase
        .from("payments_table")
        .select("amount_kes, created_at")
        .eq("status", "completed"),
      paymentsSupabase
        .from("access_payments")
        .select("amount_kes, created_at")
        .eq("status", "completed"),
    ]);

    const monthlyMap = {};

    // Helper to aggregate into YYYY-MM
    const addPayments = (rows) => {
      (rows || []).forEach((row) => {
        if (!row.created_at) return;
        const monthKey = row.created_at.substring(0, 7); // "YYYY-MM"
        if (!monthlyMap[monthKey]) {
          monthlyMap[monthKey] = 0;
        }
        monthlyMap[monthKey] += row.amount_kes;
      });
    };

    addPayments(listerPay);
    addPayments(accessPay);

    // Sort months chronologically
    const sortedMonths = Object.keys(monthlyMap).sort();
    const series = sortedMonths.map((month) => ({
      month,
      revenue: monthlyMap[month],
    }));

    // Simple projection: average of the last 3 months or last available month
    let projection = 0;
    if (series.length > 0) {
      const recentMonths = series.slice(-3);
      const sumRecent = recentMonths.reduce(
        (acc, curr) => acc + curr.revenue,
        0,
      );
      projection = Math.round(sumRecent / recentMonths.length);
    }

    return NextResponse.json({
      series,
      nextMonthProjection: projection,
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
