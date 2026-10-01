// lib/payments/pesapal/ipn.js
// Pesapal-specific IPN plumbing. Only the IPN route imports this.

/** Reads IPN params from the query string (GET) or JSON body (POST). */
export async function readIpnParams(request) {
  const url = new URL(request.url);
  let params = {
    orderTrackingId: url.searchParams.get("OrderTrackingId"),
    orderNotificationType: url.searchParams.get("OrderNotificationType"),
    orderMerchantReference: url.searchParams.get("OrderMerchantReference"),
  };

  if (!params.orderTrackingId && request.method === "POST") {
    const body = await request.json().catch(() => null);
    if (body) {
      params = {
        orderTrackingId: body.OrderTrackingId ?? null,
        orderNotificationType: body.OrderNotificationType ?? null,
        orderMerchantReference: body.OrderMerchantReference ?? null,
      };
    }
  }
  return params;
}

/**
 * Pesapal expects a JSON acknowledgement: status 200 = received and processed,
 * 500 = received but processing failed.
 */
export function ipnAck(params, status = 200) {
  return Response.json(
    {
      orderNotificationType: params.orderNotificationType ?? "IPNCHANGE",
      orderTrackingId: params.orderTrackingId ?? null,
      orderMerchantReference: params.orderMerchantReference ?? null,
      status,
    },
    { status },
  );
}
