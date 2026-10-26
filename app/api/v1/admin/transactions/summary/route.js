import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/requireAdmin";
import { paymentsSupabase } from "@/lib/supabase/paymentsClient";

export async function GET() {
  const gate = await requireAdmin();
  if (gate.error) return gate.error;

  try {
    // Fetch completed lister payments
    const { data: listingPayments, error: lpError } = await paymentsSupabase
      .from("payments_table")
      .select("amount_kes, status")
      .eq("status", "completed");

    if (lpError) throw new Error(lpError.message);

    // Fetch completed access payments
    const { data: accessPayments, error: apError } = await paymentsSupabase
      .from("access_payments")
      .select("amount_kes, status")
      .eq("status", "completed");

    if (apError) throw new Error(apError.message);

    const listerTotal = (listingPayments || []).reduce(
      (acc, curr) => acc + curr.amount_kes,
      0,
    );
    const accessTotal = (accessPayments || []).reduce(
      (acc, curr) => acc + curr.amount_kes,
      0,
    );
    const systemTotal = listerTotal + accessTotal;
    const totalTransactions =
      (listingPayments?.length || 0) + (accessPayments?.length || 0);

    return NextResponse.json({
      totalTransactions,
      paidByListers: listerTotal,
      paidByUsers: accessTotal,
      systemTotal,
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
