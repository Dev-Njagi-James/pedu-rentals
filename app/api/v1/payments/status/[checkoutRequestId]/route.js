import { NextResponse } from "next/server";
import { paymentsSupabase } from "@/lib/supabase/paymentsClient";
import { requireAuth } from "@/lib/auth/session";
import { reconcileByProviderRef } from "@/lib/payments/reconcile";

export async function GET(request, { params }) {
  const { user, error: authError, status: authStatus } = await requireAuth();
  if (authError || !user) {
    return NextResponse.json(
      { error: authError || "Unauthenticated" },
      { status: authStatus || 401 },
    );
  }

  const { checkoutRequestId: providerRef } = await params;

  const { data: payment } = await paymentsSupabase
    .from("payments_table")
    .select(
      "payment_id, listing_id, plan_name, status, lister_uuid, provider_receipt",
    )
    .eq("provider_ref", providerRef)
    .maybeSingle();

  if (!payment)
    return NextResponse.json({ status: "not_found" }, { status: 404 });
  if (payment.lister_uuid !== user.id)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  let status = payment.status;
  // Fallback for a missed or late IPN.
  if (status === "pending" || status === "expired") {
    try {
      const r = await reconcileByProviderRef(providerRef);
      if (r.status) status = r.status;
    } catch (e) {
      console.error("[payments/status]", e.message);
    }
  }

  return NextResponse.json({
    status,
    payment_id: payment.payment_id,
    listing_id: payment.listing_id,
    plan_name: payment.plan_name,
    provider_receipt: payment.provider_receipt,
  });
}
