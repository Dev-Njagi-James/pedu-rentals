// lib/payments/pesapal/submitOrder.js
import { getPesapalConfig, pesapalRequest, PesapalError } from "./client";

// Pesapal: max 50 chars; alphanumerics, dash, underscore, dot, colon only.
const MERCHANT_REF_RE = /^[A-Za-z0-9\-_.:]{1,50}$/;

/**
 * Create a Pesapal order and return where to send the customer.
 * Provider-neutral contract: { providerRef, redirectUrl }.
 * Amount and billing details must come from the server, never the client.
 */
export async function submitOrder({
  merchantReference,
  amountKes,
  description,
  callbackUrl,
  cancellationUrl,
  billing,
}) {
  const { ipnId } = getPesapalConfig();
  if (!ipnId) throw new PesapalError("PESAPAL_IPN_ID is not configured.");
  if (!MERCHANT_REF_RE.test(merchantReference ?? "")) {
    throw new PesapalError("Invalid merchant reference.");
  }
  if (!Number.isFinite(amountKes) || amountKes <= 0) {
    throw new PesapalError("Invalid amount.");
  }
  if (!callbackUrl) throw new PesapalError("callbackUrl is required.");
  if (!billing?.email && !billing?.phone) {
    throw new PesapalError("Billing email or phone is required.");
  }

  const billing_address = { country_code: "KE" };
  if (billing.email) billing_address.email_address = billing.email;
  if (billing.phone) billing_address.phone_number = billing.phone;
  if (billing.firstName) billing_address.first_name = billing.firstName;

  const payload = {
    id: merchantReference,
    currency: "KES",
    amount: amountKes,
    description: String(description ?? "Listing payment").slice(0, 100),
    callback_url: callbackUrl,
    notification_id: ipnId,
    billing_address,
  };
  if (cancellationUrl) payload.cancellation_url = cancellationUrl;

  const data = await pesapalRequest("/api/Transactions/SubmitOrderRequest", {
    method: "POST",
    body: payload,
  });

  if (!data.order_tracking_id || !data.redirect_url) {
    throw new PesapalError(
      "Pesapal did not return a tracking id or redirect URL.",
    );
  }
  return {
    providerRef: data.order_tracking_id,
    redirectUrl: data.redirect_url,
  };
}
