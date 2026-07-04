// app/api/payments/route.js
// Buni M-Pesa Express — sandbox + production aware
// Token is fetched fresh per request (1hr TTL, but simpler than caching for now)

import { NextResponse } from 'next/server';
import { createServerSupabaseClient, createAdminClient } from '@/lib/supabase/server';

const SLOT_PRICE_KES = 500;

// ── Buni config ───────────────────────────────────────────────
// Sandbox:    BUNI_BASE_URL = https://uat.buni.kcbgroup.com
// Production: BUNI_BASE_URL = https://api.buni.kcbgroup.com  (swap when going live)
const BUNI_BASE_URL = process.env.BUNI_BASE_URL ?? '';
const BUNI_TOKEN_URL = process.env.BUNI_TOKEN_URL ?? 'https://accounts.buni.kcbgroup.com/oauth2/token';
const BUNI_CONSUMER_KEY = process.env.BUNI_CONSUMER_KEY ?? '';
const BUNI_CONSUMER_SECRET = process.env.BUNI_CONSUMER_SECRET ?? '';
const BUNI_SHORTCODE = process.env.BUNI_SHORTCODE ?? '';   // sandbox: 522522
const BUNI_CALLBACK_URL = process.env.BUNI_CALLBACK_URL ?? '';


async function getBuniToken() {
  const key = (BUNI_CONSUMER_KEY ?? '').trim();
  const secret = (BUNI_CONSUMER_SECRET ?? '').trim();
  const basic = Buffer.from(`${key}:${secret}`).toString('base64');

  console.log('key length:', key.length);
  console.log('secret length:', secret.length);
  console.log('basic:', basic);

  const res = await fetch(BUNI_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${basic}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });

  const text = await res.text();
  console.log('token response status:', res.status);
  console.log('token response body:', text);

  if (!res.ok) throw new Error(`Buni token fetch failed (${res.status}): ${text}`);

  const json = JSON.parse(text);
  if (!json.access_token) throw new Error('Buni token response missing access_token');
  return json.access_token;
}


// ── Toggle ────────────────────────────────────────────────────
async function isMpesaEnabled(supabase) {
  const { data, error } = await supabase
    .from('system_settings')
    .select('value')
    .eq('action', 'mpesa_enabled')
    .single();
  if (error || !data) return false;
  return data.value === 'true';
}


// ═══════════════════════════════════════════════════════════════
// POST /api/payments
// ═══════════════════════════════════════════════════════════════
export async function POST(request) {
  try {
    console.log('BUNI_TOKEN_URL:', process.env.BUNI_TOKEN_URL);
    console.log('BUNI_BASE_URL:', process.env.BUNI_BASE_URL);
    console.log('BUNI_CONSUMER_KEY length:', process.env.BUNI_CONSUMER_KEY?.length);

    const body = await request.json();
    const { action } = body;

    if (action === 'add_slots') return handleAddSlots(request, body);
    if (action === 'buni_callback') return handleBuniCallback(body);

    return NextResponse.json({ error: 'Unknown action.' }, { status: 400 });
  } catch {
    return NextResponse.json({ error: 'Bad request.' }, { status: 400 });
  }
}


// ═══════════════════════════════════════════════════════════════
// GET /api/payments
// ═══════════════════════════════════════════════════════════════
export async function GET(request) {
  const supabase = await createServerSupabaseClient();

  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) {
    return NextResponse.json({ error: 'Unauthenticated.' }, { status: 401 });
  }

  const checkoutId = request.nextUrl.searchParams.get('checkout_request_id');
  if (checkoutId) {
    const { data } = await supabase
      .from('Pending_Payments')
      .select('status')
      .eq('checkout_request_id', checkoutId)
      .single();
    return NextResponse.json({ payment_status: data?.status ?? 'pending' });
  }

  const { data: lister, error: listerErr } = await supabase
    .from('Listers_Info')
    .select('Slots')
    .eq('lister_UUID', user.id)
    .single();

  if (listerErr) {
    return NextResponse.json(
      { error: listerErr.message, code: listerErr.code, details: listerErr.details },
      { status: 500 }
    );
  }

  const { count: listingCount, error: countErr } = await supabase
    .from('Property_Listing')
    .select('listing_id', { count: 'exact', head: true })
    .eq('lister_UUID', user.id);

  if (countErr) {
    return NextResponse.json({ error: countErr.message, code: countErr.code }, { status: 500 });
  }

  const slots = lister?.Slots ?? 0;
  const listings = listingCount ?? 0;

  return NextResponse.json({ slots, listings, can_add: slots > listings });
}


// ─────────────────────────────────────────────────────────────
// HANDLER: add_slots
// ─────────────────────────────────────────────────────────────
async function handleAddSlots(request, body) {
  const supabase = await createServerSupabaseClient();

  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) {
    return NextResponse.json({ error: 'Unauthenticated.' }, { status: 401 });
  }

  const quantity = Math.max(1, Math.min(20, parseInt(body.quantity ?? 1, 10)));
  const mpesaEnabled = await isMpesaEnabled(supabase);

  // ── Simulated: increment only ──────────────────────────────
  if (!mpesaEnabled) {
    const result = await incrementSlots(supabase, user.id, quantity);
    if (result.error) return NextResponse.json({ error: result.error }, { status: 500 });

    return NextResponse.json({
      success: true,
      simulated: true,
      slots_added: quantity,
      new_total: result.new_total,
    });
  }

  // ── Real: fetch token, fire STK push ───────────────────────
  const phone = sanitisePhone(body.phone ?? '');
  if (!phone) return NextResponse.json({ error: 'Invalid phone number.' }, { status: 400 });

  const amount = quantity * SLOT_PRICE_KES;

  try {
    const token = await getBuniToken();

    const stkRes = await fetch(`${BUNI_BASE_URL}/mm/api/request/1.0.0/stkpush`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        phoneNumber: phone,
        amount: String(amount),          // Buni expects a string
        invoiceNumber: `slots-${user.id.slice(0, 8)}-${Date.now()}`,
        sharedShortCode: true,
        orgShortCode: BUNI_SHORTCODE,          // "522522" in sandbox
        orgPassKey: '',                      // leave blank in sandbox
        callbackUrl: BUNI_CALLBACK_URL,
        transactionDescription: `${quantity} listing slot(s)`,
      }),
    });

    const stkJson = await stkRes.json();

    // Success check: response.ResponseCode === "0"
    if (stkJson?.response?.ResponseCode !== '0') {
      return NextResponse.json(
        { error: stkJson?.response?.ResponseDescription ?? stkJson?.header?.statusDescription ?? 'Buni STK push rejected.' },
        { status: 502 }
      );
    }

    const checkoutRequestId = stkJson.response.CheckoutRequestID;

    await supabase.from('Pending_Payments').insert({
      lister_uuid: user.id,
      checkout_request_id: checkoutRequestId,
      phone,
      quantity,
      amount,
      status: 'pending',
    });

    return NextResponse.json({
      success: true,
      simulated: false,
      provider: 'buni',
      CheckoutRequestID: checkoutRequestId,
      CustomerMessage: stkJson.response.CustomerMessage,
    });

  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 502 });
  }
}


// ═══════════════════════════════════════════════════════════════
// HANDLER: buni_callback
// Buni POSTs: { Body: { stkCallback: { CheckoutRequestID, ResultCode,
//   CallbackMetadata: { Item: [{Name, Value}] } } } }
// ═══════════════════════════════════════════════════════════════
async function handleBuniCallback(body) {
  const supabase = createAdminClient();

  const cb = body?.Body?.stkCallback;
  if (!cb?.CheckoutRequestID) {
    return NextResponse.json({ error: 'Malformed callback.' }, { status: 400 });
  }

  const checkoutRequestId = cb.CheckoutRequestID;
  const succeeded = cb.ResultCode === 0;

  // Extract metadata items by name
  const items = cb.CallbackMetadata?.Item ?? [];
  const getMeta = (name) => items.find(i => i.Name === name)?.Value ?? null;

  const mpesaReceiptNumber = getMeta('MpesaReceiptNumber');
  const phoneNumber = String(getMeta('PhoneNumber') ?? '');

  // ── Payment failed ────────────────────────────────────────
  if (!succeeded) {
    const { data: pending } = await supabase
      .from('Pending_Payments')
      .select('lister_uuid, quantity, amount, phone')
      .eq('checkout_request_id', checkoutRequestId)
      .single();

    await supabase
      .from('Pending_Payments')
      .update({ status: 'failed', updated_at: new Date().toISOString() })
      .eq('checkout_request_id', checkoutRequestId);

    if (pending) {
      await supabase.from('Payment_Ledger').insert({
        lister_uuid: pending.lister_uuid,
        checkout_request_id: checkoutRequestId,
        mpesa_receipt: null,
        phone: pending.phone,
        quantity: pending.quantity,
        amount_kes: pending.amount,
        slots_before: null,
        slots_after: null,
        status: 'rejected',
      });
    }

    return NextResponse.json({ received: true });
  }

  // ── Payment succeeded ─────────────────────────────────────
  const { data: pending, error: pendingErr } = await supabase
    .from('Pending_Payments')
    .select('lister_uuid, quantity, amount')
    .eq('checkout_request_id', checkoutRequestId)
    .eq('status', 'pending')
    .single();

  if (pendingErr || !pending) return NextResponse.json({ received: true });

  const result = await incrementSlots(supabase, pending.lister_uuid, pending.quantity, {
    checkoutRequestId,
    mpesaReceipt: mpesaReceiptNumber,
    phone: phoneNumber,
    amount: pending.amount,
  });

  await supabase
    .from('Pending_Payments')
    .update({
      status: result.error ? 'slot_error' : 'complete',
      updated_at: new Date().toISOString(),
    })
    .eq('checkout_request_id', checkoutRequestId);

  return NextResponse.json({ received: true });
}


// ─────────────────────────────────────────────────────────────
// incrementSlots — unchanged logic
// ─────────────────────────────────────────────────────────────
async function incrementSlots(supabase, listerUUID, quantity, meta = null) {
  const { data: row, error: fetchErr } = await supabase
    .from('Listers_Info')
    .select('Slots')
    .eq('lister_UUID', listerUUID)
    .single();

  if (fetchErr) return { error: fetchErr.message };

  const slots_before = row?.Slots ?? 0;
  const slots_after = slots_before + quantity;

  const { error: updateErr } = await supabase
    .from('Listers_Info')
    .update({ Slots: slots_after })
    .eq('lister_UUID', listerUUID);

  if (updateErr) return { error: updateErr.message };

  if (meta !== null) {
    await supabase.from('Payment_Ledger').insert({
      lister_uuid: listerUUID,
      checkout_request_id: meta.checkoutRequestId ?? null,
      mpesa_receipt: meta.mpesaReceipt ?? null,
      phone: meta.phone ?? null,
      quantity,
      amount_kes: meta.amount ?? quantity * SLOT_PRICE_KES,
      slots_before,
      slots_after,
      status: 'complete',
    });
  }

  return { new_total: slots_after };
}


// ─────────────────────────────────────────────────────────────
// sanitisePhone
// ─────────────────────────────────────────────────────────────
function sanitisePhone(raw) {
  const digits = raw.replace(/\D/g, '');
  if (digits.startsWith('0') && digits.length === 10) return '254' + digits.slice(1);
  if (digits.startsWith('254') && digits.length === 12) return digits;
  return null;
}