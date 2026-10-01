// lib/payments/pesapal/queryStatus.js
import { pesapalRequest, PesapalError } from "./client";

// Pesapal status_code -> provider-neutral status.
// 0 (INVALID) is treated as non-terminal: an order that exists but has not
// been paid reports INVALID. Confirm this behavior in sandbox.
const STATUS_BY_CODE = {
  0: "pending",
  1: "completed",
  2: "failed",
  3: "reversed",
};

/**
 * The only trusted source of payment truth. IPN and callback carry no status.
 * Provider-neutral contract:
 * { status: pending|completed|failed|reversed, paymentMethod, confirmationCode,
 *   amountKes, merchantReference, message, raw }
 */
export async function queryStatus(providerRef) {
  if (!providerRef) throw new PesapalError("providerRef is required.");

  const data = await pesapalRequest(
    `/api/Transactions/GetTransactionStatus?orderTrackingId=${encodeURIComponent(providerRef)}`,
  );

  const code = Number(data.status_code);
  const amount = Number(data.amount);

  return {
    status: STATUS_BY_CODE[code] ?? "pending", // unknown code stays non-terminal
    rawStatusCode: Number.isFinite(code) ? code : null,
    paymentMethod: data.payment_method ?? null,
    confirmationCode: data.confirmation_code ?? null,
    amountKes: Number.isFinite(amount) ? amount : null,
    currency: data.currency ?? null,
    merchantReference: data.merchant_reference ?? null,
    message: data.description ?? null,
    raw: data,
  };
}
