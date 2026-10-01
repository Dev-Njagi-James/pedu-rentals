import { readIpnParams, ipnAck } from "@/lib/payments/pesapal/ipn";
import { reconcileByProviderRef } from "@/lib/payments/reconcile";

export const dynamic = "force-dynamic";

async function handle(request) {
  const params = await readIpnParams(request);
  if (!params.orderTrackingId) return ipnAck(params, 500);
  try {
    const r = await reconcileByProviderRef(params.orderTrackingId, {
      recheckSettled: true,
    });
    return ipnAck(params, r.found ? 200 : 500); // 500 makes Pesapal retry
  } catch (e) {
    console.error("[payments/ipn]", e.message);
    return ipnAck(params, 500);
  }
}

export const GET = handle;
export const POST = handle;
