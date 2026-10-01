import { paymentsSupabase } from "@/lib/supabase/paymentsClient";
import { getPaymentStatus } from "@/lib/payments";

async function settle(paymentId, status, extra = {}) {
  const { data, error } = await paymentsSupabase.rpc("settle_payment", {
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

// Pesapal is the only source of truth. Callers: IPN (recheckSettled: true) and status poll.
export async function reconcileByProviderRef(
  providerRef,
  { recheckSettled = false } = {},
) {
  const { data: payment, error } = await paymentsSupabase
    .from("payments_table")
    .select("payment_id, status, amount_kes, merchant_reference")
    .eq("provider_ref", providerRef)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!payment) return { found: false, status: null };

  const shouldQuery =
    payment.status === "pending" ||
    payment.status === "expired" ||
    (recheckSettled && payment.status === "completed");
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
