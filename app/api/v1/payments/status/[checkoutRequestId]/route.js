import { NextResponse } from 'next/server';
import { paymentsSupabase } from '@/lib/supabase/paymentsClient';
import { requireAuth } from '@/lib/auth/session';

export async function GET(request, { params }) {
  const { user, error: authError, status: authStatus } = await requireAuth();
  if (authError || !user) {
    return NextResponse.json(
      { error: authError || 'Unauthenticated' },
      { status: authStatus || 401 }
    );
  }

  const { checkoutRequestId } = params;

  const { data: payment, error: queryErr } = await paymentsSupabase
    .from('payments_table')
    .select('payment_id, listing_id, plan_name, status, lister_uuid, mpesa_receipt')
    .eq('checkout_request_id', checkoutRequestId)
    .single();

  if (queryErr || !payment) {
    return NextResponse.json({ status: 'not_found' }, { status: 404 });
  }

  if (payment.lister_uuid !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  return NextResponse.json({
    status: payment.status,
    payment_id: payment.payment_id,
    listing_id: payment.listing_id,
    plan_name: payment.plan_name,
    mpesa_receipt: payment.mpesa_receipt,
  }, { status: 200 });
}
