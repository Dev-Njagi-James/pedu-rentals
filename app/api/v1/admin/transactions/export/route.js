import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/requireAdmin";
import { paymentsSupabase } from "@/lib/supabase/paymentsClient";

export async function GET(request) {
  const gate = await requireAdmin();
  if (gate.error) return gate.error;

  try {
    const [{ data: listerPay }, { data: accessPay }] = await Promise.all([
      paymentsSupabase
        .from("payments_table")
        .select("*")
        .order("created_at", { ascending: false }),
      paymentsSupabase
        .from("access_payments")
        .select("*")
        .order("created_at", { ascending: false }),
    ]);

    const listerRows = (listerPay || []).map((item) => ({
      date: item.created_at,
      type: "Lister Listing Plan",
      payerUuid: item.lister_uuid,
      amount: item.amount_kes,
      status: item.status,
      receipt: item.provider_receipt || item.merchant_reference || "",
      provider: item.provider,
    }));

    const accessRows = (accessPay || []).map((item) => ({
      date: item.created_at,
      type: "User Access Grant",
      payerUuid: item.lister_uuid,
      amount: item.amount_kes,
      status: item.status,
      receipt: item.provider_receipt || item.merchant_reference || "",
      provider: item.provider,
    }));

    const combined = [...listerRows, ...accessRows].sort(
      (a, b) => new Date(b.date) - new Date(a.date),
    );

    // Build CSV content
    const csvHeaders =
      "Date,Type,Payer UUID,Amount (KES),Status,Receipt,Provider\n";
    const csvRows = combined
      .map(
        (row) =>
          `"${row.date}","${row.type}","${row.payerUuid}",${row.amount},"${row.status}","${row.receipt}","${row.provider}"`,
      )
      .join("\n");

    const csvContent = csvHeaders + csvRows;

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="transactions_export_${new Date().toISOString().split("T")[0]}.csv"`,
      },
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
