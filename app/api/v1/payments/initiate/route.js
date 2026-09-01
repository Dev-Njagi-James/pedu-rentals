import { NextResponse } from 'next/server';
import { paymentsSupabase } from '@/lib/supabase/paymentsClient';
import { requireAuth } from '@/lib/auth/session';
import { sanitisePhone } from '@/lib/payments/phone';
import { initiateStkPush } from '@/lib/payments/daraja/stkPush';

export async function POST(request) {
  let payment_id = null;

  try {
    const { user, error, status } = await requireAuth();
    if (error) {
      return NextResponse.json({ success: false, error }, { status });
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ success: false, error: 'Malformed JSON body.' }, { status: 400 });
    }

    const { listing_id, plan_name, phone } = body;
    if (!listing_id || !plan_name || !phone) {
      return NextResponse.json({ success: false, error: 'listing_id, plan_name, and phone are required.' }, { status: 400 });
    }

    const sanitisedPhone = sanitisePhone(phone);
    if (!sanitisedPhone) {
      return NextResponse.json({ success: false, error: 'Invalid phone number.' }, { status: 400 });
    }

    // Look up the listing's category — never trust a client-submitted category.
    const { data: listingRow, error: listingErr } = await paymentsSupabase
      .from('listings_table')
      .select('listing_category')
      .eq('listing_id', listing_id)
      .single();

    if (listingErr) {
      if (listingErr.code === 'PGRST116') {
        return NextResponse.json({ success: false, error: 'Listing not found.' }, { status: 404 });
      }
      return NextResponse.json({ success: false, error: listingErr.message }, { status: 500 });
    }

    // Look up price from plan_category_pricing using (plan_name, listing_category).
    const { data: plan, error: planErr } = await paymentsSupabase
      .from('plan_category_pricing')
      .select('price_kes')
      .eq('plan_name', plan_name)
      .eq('category_name', listingRow.listing_category)
      .single();

    if (planErr) {
      if (planErr.code === 'PGRST116') {
        return NextResponse.json(
          { success: false, error: 'No pricing found for this plan and category.' },
          { status: 400 }
        );
      }
      return NextResponse.json({ success: false, error: planErr.message }, { status: 500 });
    }

    const amount_kes = plan.price_kes;

    // Insert pending payment row
    const { data: paymentRecord, error: insertErr } = await paymentsSupabase
      .from('payments_table')
      .insert({
        lister_uuid: user.id,
        listing_id,
        plan_name,
        phone: sanitisedPhone,
        amount_kes,
        status: 'pending',
        checkout_request_id: null,
      })
      .select('payment_id')
      .single();

    if (insertErr) {
      return NextResponse.json({ success: false, error: insertErr.message }, { status: 500 });
    }

    payment_id = paymentRecord.payment_id;

    // Call Daraja STK Push
    const stkJson = await initiateStkPush({ amount_kes, phone: sanitisedPhone, listing_id, plan_name });

    if (stkJson.ResponseCode === '0') {
      let updateSuccess = false;
      let lastUpdateErr = null;

      for (let attempt = 0; attempt < 3; attempt++) {
        const { error: updateErr } = await paymentsSupabase
          .from('payments_table')
          .update({
            checkout_request_id: stkJson.CheckoutRequestID,
            updated_at: new Date().toISOString(),
          })
          .eq('payment_id', payment_id);

        if (!updateErr) {
          updateSuccess = true;
          break;
        }
        lastUpdateErr = updateErr;
        await new Promise(r => setTimeout(r, 300 * (attempt + 1)));
      }

      if (!updateSuccess) {
        await paymentsSupabase
          .from('payments_table')
          .update({ status: 'orphaned_checkout_id', updated_at: new Date().toISOString() })
          .eq('payment_id', payment_id)
          .catch(() => {});

        return NextResponse.json({
          success: false,
          error: 'STK push sent but failed to record checkout ID. Contact support with your phone number and timestamp.',
          payment_id,
        }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        checkout_request_id: stkJson.CheckoutRequestID,
        customer_message: stkJson.CustomerMessage,
      });
    } else {
      await paymentsSupabase
        .from('payments_table')
        .update({
          status: 'failed',
          updated_at: new Date().toISOString(),
        })
        .eq('payment_id', payment_id);

      return NextResponse.json({
        success: false,
        error: stkJson.errorMessage ?? 'STK push rejected.',
      }, { status: 502 });
    }

  } catch (err) {
    if (payment_id) {
      await paymentsSupabase
        .from('payments_table')
        .update({
          status: 'failed',
          updated_at: new Date().toISOString(),
        })
        .eq('payment_id', payment_id)
        .catch(() => {});
    }
    return NextResponse.json({ success: false, error: err.message }, { status: 502 });
  }
}
