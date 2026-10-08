import { paymentsSupabase } from "@/lib/supabase/paymentsClient";
import { getPaymentStatus } from "@/lib/payments";

const RECHECK_MIN_AGE_MS = 15_000;

async function settle(paymentId, status, extra = {}) {
  const { data, error } = await paymentsSupabase.rpc("settle_access_payment", {
    p_payment_id: paymentId,
    p_status: status,
    p_provider_receipt: extra.receipt ?? null,
    p_payment_method: extra.method ?? null,
    p_failure_reason: extra.reason ?? null,
    p_raw: extra.raw ?? null,
  });
  if (error) throw new Error(error.message);
  return data;
}

export async function reconcileAccessByProviderRef(
  providerRef,
  { recheckSettled = false } = {},
) {
  const { data: payment, error } = await paymentsSupabase
    .from("access_payments")
    .select(
      "payment_id, status, amount_kes, merchant_reference, updated_at, created_at",
    )
    .eq("provider_ref", providerRef)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!payment) return { found: false, status: null };

  const age = Date.now() - Date.parse(payment.updated_at ?? payment.created_at);

  const shouldQuery =
    payment.status === "pending" ||
    payment.status === "expired" ||
    (recheckSettled &&
      payment.status === "completed" &&
      age > RECHECK_MIN_AGE_MS);
  if (!shouldQuery) return { found: true, status: payment.status };

  const r = await getPaymentStatus(providerRef);
  if (r.status === "pending") return { found: true, status: payment.status };

  if (
    r.merchantReference !== payment.merchant_reference ||
    (r.status === "completed" &&
      (r.amountKes !== payment.amount_kes || r.currency !== "KES"))
  ) {
    await settle(payment.payment_id, "needs_review", {
      reason: "Provider data does not match payment record.",
      raw: r.raw,
    });
    return { found: true, status: "needs_review" };
  }

  const result = await settle(payment.payment_id, r.status, {
    receipt: r.confirmationCode,
    method: r.paymentMethod,
    reason: r.status === "failed" ? r.message : null,
    raw: r.raw,
  });
  return {
    found: true,
    status: result === "already_settled" ? payment.status : result,
  };
}
