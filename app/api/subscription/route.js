// app/api/subscription/route.js

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createServerSupabaseClient, createAdminClient } from '@/lib/supabase/server';

const paymentsSupabase = createClient(
   process.env.PAYMENTS_SUPABASE_URL,
   process.env.PAYMENTS_SUPABASE_SERVICE_ROLE_KEY
);

const SLOT_PRICE_KES = 1;
const DARAJA_BASE_URL = process.env.DARAJA_BASE_URL ?? 'https://sandbox.safaricom.co.ke';
const DARAJA_CONSUMER_KEY = process.env.DARAJA_CONSUMER_KEY ?? '';
const DARAJA_CONSUMER_SECRET = process.env.DARAJA_CONSUMER_SECRET ?? '';
const DARAJA_SHORTCODE = process.env.DARAJA_SHORTCODE ?? '';
const DARAJA_PASSKEY = process.env.DARAJA_PASSKEY ?? '';
const DARAJA_TILL_NUMBER = process.env.DARAJA_TILL_NUMBER ?? '';
const DARAJA_CALLBACK_URL = process.env.DARAJA_CALLBACK_URL ?? '';


// ── Toggle ────────────────────────────────────────────────────
// false → increment Slots only, skip all payment tables
// true  → full Daraja STK push + Pending_Payments + Payment_Ledger
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
// POST /api/subscription
// ═══════════════════════════════════════════════════════════════
export async function POST(request) {
   try {
      const raw = await request.clone().text();
      console.log('[mpesa_callback] RAW BODY:', raw);
      const body = JSON.parse(raw);
      const { action } = body;

      // Safaricom's callback POST has no action field — detect by payload shape
      if (body?.Body?.stkCallback) return handleMpesaCallback(body);
      if (action === 'add_slots') return handleAddSlots(request, body);

      return NextResponse.json({ error: 'Unknown action.' }, { status: 400 });
   } catch {
      return NextResponse.json({ error: 'Bad request.' }, { status: 400 });
   }
}


// ═══════════════════════════════════════════════════════════════
// GET /api/subscription
// Returns slot count, listing count, and can_add flag
// ═══════════════════════════════════════════════════════════════
export async function GET(request) {
   const supabase = await createServerSupabaseClient();

   const { data: { user }, error: authErr } = await supabase.auth.getUser();
   if (authErr || !user) {
      return NextResponse.json({ error: 'Unauthenticated.' }, { status: 401 });
   }

   const checkoutId = request.nextUrl.searchParams.get('checkout_request_id');
   if (checkoutId) {
      const { data } = await paymentsSupabase
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

   if (listerErr) return NextResponse.json({ error: listerErr.message, code: listerErr.code, details: listerErr.details }, { status: 500 });

   const { count: listingCount, error: countErr } = await supabase
      .from('Property_Listing')
      .select('listing_id', { count: 'exact', head: true })
      .eq('lister_UUID', user.id);

   if (countErr) return NextResponse.json({ error: countErr.message, code: countErr.code }, { status: 500 });

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

   // ── Simulated: increment only, no payment tables touched ──
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

   // ── Real: validate phone, fire STK push, write Pending_Payments ──
   const phone = sanitisePhone(body.phone ?? '');
   if (!phone) return NextResponse.json({ error: 'Invalid phone number.' }, { status: 400 });

   const amount = quantity * SLOT_PRICE_KES;

   try {
      const token = await getDarajaToken();
      const timestamp = getDarajaTimestamp();
      const password = getDarajaPassword(timestamp);

      const stkRes = await fetch(`${DARAJA_BASE_URL}/mpesa/stkpush/v1/processrequest`, {
         method: 'POST',
         headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
         body: JSON.stringify({
            BusinessShortCode: DARAJA_TILL_NUMBER,
            Password: password,
            Timestamp: timestamp,
            TransactionType: 'CustomerBuyGoodsOnline',
            Amount: amount,
            PartyA: phone,
            PartyB: DARAJA_TILL_NUMBER,
            PhoneNumber: phone,
            CallBackURL: DARAJA_CALLBACK_URL,
            AccountReference: 'ListingSlots',
            TransactionDesc: `${quantity} listing slot(s)`,
         }),
      });

      const stkJson = await stkRes.json();
      if (stkJson.ResponseCode !== '0') {
         return NextResponse.json({ error: stkJson.errorMessage ?? 'STK push rejected.' }, { status: 502 });
      }

      // Write in-flight record
      await paymentsSupabase.from('Pending_Payments').insert({
         lister_uuid: user.id,
         checkout_request_id: stkJson.CheckoutRequestID,
         phone,
         quantity,
         amount,
         status: 'pending',
      });

      return NextResponse.json({
         success: true,
         simulated: false,
         CheckoutRequestID: stkJson.CheckoutRequestID,
         CustomerMessage: stkJson.CustomerMessage,
      });

   } catch (err) {
      return NextResponse.json({ error: err.message }, { status: 502 });
   }
}


// ─────────────────────────────────────────────────────────────
// HANDLER: mpesa_callback
// Safaricom POST — no user session, uses service role
// ─────────────────────────────────────────────────────────────
async function handleMpesaCallback(body) {
   const supabase = createAdminClient();

   const callback = body?.Body?.stkCallback;
   const resultCode = String(callback?.ResultCode ?? '');
   const checkoutId = callback?.CheckoutRequestID;

   if (!checkoutId) return NextResponse.json({ error: 'Malformed callback.' }, { status: 400 });

   if (resultCode !== '0') {
      // Query first — update wipes the row state we need for the ledger
      const { data: pending } = await paymentsSupabase
         .from('Pending_Payments')
         .select('lister_uuid, quantity, amount, phone')
         .eq('checkout_request_id', checkoutId)
         .single();

      await paymentsSupabase
         .from('Pending_Payments')
         .update({ status: 'failed', updated_at: new Date().toISOString() })
         .eq('checkout_request_id', checkoutId);

      if (pending) {
         await paymentsSupabase.from('Payment_Ledger').insert({
            lister_uuid: pending.lister_uuid,
            checkout_request_id: checkoutId,
            mpesa_receipt: null,
            phone: pending.phone,
            quantity: pending.quantity,
            amount_kes: pending.amount,
            slots_before: null,
            slots_after: null,
            status: 'rejected',
            raw_callback: body,
         });
      }

      return NextResponse.json({ received: true });
   }

   // Extract Safaricom metadata
   const items = callback?.CallbackMetadata?.Item ?? [];
   const mpesaReceipt = items.find(i => i.Name === 'MpesaReceiptNumber')?.Value ?? null;
   const mpesaPhone = items.find(i => i.Name === 'PhoneNumber')?.Value?.toString() ?? null;

   // Resolve pending row — unique constraint prevents double-processing
   const { data: pending, error: pendingErr } = await paymentsSupabase
      .from('Pending_Payments')
      .select('lister_uuid, quantity, amount')
      .eq('checkout_request_id', checkoutId)
      .eq('status', 'pending')
      .single();

   if (pendingErr || !pending) return NextResponse.json({ received: true });

   // Increment slots and write ledger atomically
   const result = await incrementSlots(supabase, pending.lister_uuid, pending.quantity, {
      checkoutRequestId: checkoutId,
      mpesaReceipt,
      phone: mpesaPhone,
      amount: pending.amount,
   });

   // Mark pending row resolved
   await paymentsSupabase
      .from('Pending_Payments')
      .update({
         status: result.error ? 'slot_error' : 'complete',
         updated_at: new Date().toISOString(),
      })
      .eq('checkout_request_id', checkoutId);

   return NextResponse.json({ received: true });
}


// ─────────────────────────────────────────────────────────────
// incrementSlots
// Simulated path: no meta arg → skips ledger write
// Real path:      meta provided → writes Payment_Ledger
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

   // Only write ledger for real payments (meta is null when simulated)
   if (meta !== null) {
      await paymentsSupabase.from('Payment_Ledger').insert({
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
// Daraja helpers
// ─────────────────────────────────────────────────────────────
async function getDarajaToken() {
   const credentials = Buffer.from(`${DARAJA_CONSUMER_KEY}:${DARAJA_CONSUMER_SECRET}`).toString('base64');
   const res = await fetch(`${DARAJA_BASE_URL}/oauth/v1/generate?grant_type=client_credentials`, {
      headers: { Authorization: `Basic ${credentials}` },
   });
   const json = await res.json();
   if (!json.access_token) throw new Error('Failed to obtain Daraja token.');
   return json.access_token;
}

function getDarajaTimestamp() {
   const now = new Date();
   const eatOffsetMs = 3 * 60 * 60 * 1000;
   const eat = new Date(now.getTime() + eatOffsetMs);
   return eat.toISOString().replace(/[-T:.Z]/g, '').slice(0, 14);
}

function getDarajaPassword(timestamp) {
   return Buffer.from(`${DARAJA_TILL_NUMBER}${DARAJA_PASSKEY}${timestamp}`).toString('base64');
}

function sanitisePhone(raw) {
   const digits = raw.replace(/\D/g, '');
   if (digits.startsWith('0') && digits.length === 10) return '254' + digits.slice(1);
   if (digits.startsWith('254') && digits.length === 12) return digits;
   return null;
}