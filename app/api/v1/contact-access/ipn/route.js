import { readIpnParams, ipnAck } from "@/lib/payments/pesapal/ipn";
import { reconcileAccessByProviderRef } from "@/lib/payments/reconcileAccess";

export const dynamic = "force-dynamic";

async function handle(request) {
  const params = await readIpnParams(request);
  if (!params.orderTrackingId) return ipnAck(params, 500);

  if (
    params.orderNotificationType &&
    params.orderNotificationType !== "IPNCHANGE"
  ) {
    return ipnAck(params, 200); // acknowledge, ignore
  }

  try {
    const r = await reconcileAccessByProviderRef(params.orderTrackingId, {
      recheckSettled: true,
    });
    return ipnAck(params, r.found ? 200 : 500);
  } catch (e) {
    console.error("[access/ipn]", e.message);
    return ipnAck(params, 500);
  }
}

export const GET = handle;
export const POST = handle;
