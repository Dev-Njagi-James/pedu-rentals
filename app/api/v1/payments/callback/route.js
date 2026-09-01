import { NextResponse } from 'next/server';
import { paymentsSupabase } from '@/lib/supabase/paymentsClient';

export async function POST(request) {
  try {
    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ received: true }, { status: 200 });
    }

    const callback = body?.Body?.stkCallback;
    if (!callback?.CheckoutRequestID) {
      return NextResponse.json({ received: true }, { status: 200 });
    }

    const checkoutRequestId = callback.CheckoutRequestID;
    const resultCode = String(callback?.ResultCode ?? '');

    const { data: paymentRow, error: lookupErr } = await paymentsSupabase
      .from('payments_table')
      .select('payment_id, listing_id, plan_name')
      .eq('checkout_request_id', checkoutRequestId)
      .eq('status', 'pending')
      .single();

    if (lookupErr || !paymentRow) {
      return NextResponse.json({ received: true }, { status: 200 });
    }

    if (resultCode !== '0') {
      const { error: updateErr } = await paymentsSupabase
        .from('payments_table')
        .update({
          status: 'failed',
          raw_callback: body,
          updated_at: new Date().toISOString(),
        })
        .eq('payment_id', paymentRow.payment_id);

      if (updateErr) {
        console.error('[payments/callback] failed-status update error:', updateErr.message);
      }

      return NextResponse.json({ received: true }, { status: 200 });
    }

    const items = callback?.CallbackMetadata?.Item ?? [];
    const mpesaReceiptItem = items.find(i => i.Name === 'MpesaReceiptNumber');
    const mpesa_receipt = mpesaReceiptItem?.Value ?? null;

    const { error: rpcErr } = await paymentsSupabase.rpc('complete_payment', {
      p_payment_id: paymentRow.payment_id,
      p_mpesa_receipt: mpesa_receipt,
      p_raw_callback: body,
    });

    if (rpcErr) {
      await paymentsSupabase
        .from('payments_table')
        .update({
          status: 'error',
          updated_at: new Date().toISOString(),
        })
        .eq('payment_id', paymentRow.payment_id)
        .catch(() => {});

      console.error('[payments/callback] complete_payment RPC error:', rpcErr.message);
      return NextResponse.json({ received: true }, { status: 200 });
    }

    return NextResponse.json({ received: true }, { status: 200 });

  } catch (err) {
    console.error('[payments/callback] unhandled error:', err.message);
    return NextResponse.json({ received: true }, { status: 200 });
  }
}