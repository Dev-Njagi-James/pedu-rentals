import { NextResponse } from "next/server";
import { paymentsSupabase } from "@/lib/supabase/paymentsClient";
import { requireAuth } from "@/lib/auth/session";
import { getAccessExpiry } from "@/lib/auth/viewAccess";
import { reconcileAccessByProviderRef } from "@/lib/payments/reconcileAccess";

export const revalidate = 0;
const NO_STORE = { "Cache-Control": "private, no-store" };

export async function GET(_req, { params }) {
  const { user, error, status } = await requireAuth();
  if (error || !user) {
    return NextResponse.json(
      { error: error ?? "Unauthenticated" },
      { status: status ?? 401, headers: NO_STORE },
    );
  }

  const { providerRef } = await params;

  const { data: payment } = await paymentsSupabase
    .from("access_payments")
    .select("payment_id, status, lister_uuid, provider_receipt")
    .eq("provider_ref", providerRef)
    .maybeSingle();

  if (!payment)
    return NextResponse.json(
      { status: "not_found" },
      { status: 404, headers: NO_STORE },
    );
  if (payment.lister_uuid !== user.id)
    return NextResponse.json(
      { error: "Forbidden" },
      { status: 403, headers: NO_STORE },
    );

  let paymentStatus = payment.status;
  if (paymentStatus === "pending" || paymentStatus === "expired") {
    try {
      const r = await reconcileAccessByProviderRef(providerRef);
      if (r.status) paymentStatus = r.status;
    } catch (e) {
      console.error("[access/pay/status]", e.message);
    }
  }

  const body = {
    status: paymentStatus,
    provider_receipt: payment.provider_receipt,
  };
  if (paymentStatus === "completed") {
    try {
      body.expires_at = await getAccessExpiry(user.id);
      body.server_time = new Date().toISOString();
    } catch {
      /* client falls back to /me */
    }
  }
  return NextResponse.json(body, { headers: NO_STORE });
}
