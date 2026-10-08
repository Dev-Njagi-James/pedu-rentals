import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { paymentsSupabase } from "@/lib/supabase/paymentsClient";
import { requireAuth } from "@/lib/auth/session";
import { getAccessExpiry } from "@/lib/auth/viewAccess";
import { isFlagEnabled } from "@/lib/flags";
import { initiatePayment } from "@/lib/payments";

export const revalidate = 0;
const NO_STORE = { "Cache-Control": "private, no-store" };
const fail = (error, status, extra = {}) =>
  NextResponse.json({ error, ...extra }, { status, headers: NO_STORE });

export async function POST() {
  let payment_id = null;
  try {
    const { user, error, status } = await requireAuth();
    if (error || !user) return fail(error ?? "Unauthenticated", status ?? 401);

    if (!(await isFlagEnabled("contact_access_payment_required"))) {
      return fail("Payments are not enabled", 409, {
        code: "payments_disabled",
      });
    }

    const accessIpnId = process.env.PESAPAL_IPN_ID_ACCESS;
    if (!accessIpnId) {
      console.error("[access/pay] PESAPAL_IPN_ID_ACCESS missing");
      return fail("Payment is not configured", 503);
    }

    const { data: plan, error: planErr } = await paymentsSupabase
      .from("access_plans")
      .select("plan_name, duration_minutes, price_kes")
      .eq("is_active", true)
      .maybeSingle();
    if (planErr || !plan) return fail("No active plan", 503);
    if (!(plan.price_kes > 0)) {
      console.error("[access/pay] active plan has no price", plan.plan_name);
      return fail("Plan is misconfigured", 503);
    }

    try {
      const current = await getAccessExpiry(user.id);
      if (current && new Date(current).getTime() > Date.now()) {
        return fail("Already active", 409, { code: "already_active" });
      }
    } catch {
      return fail("Could not check access", 500);
    }

    // Throttle: max 3 unsettled attempts per 10 minutes.
    const since = new Date(Date.now() - 10 * 60_000).toISOString();
    const { count } = await paymentsSupabase
      .from("access_payments")
      .select("payment_id", { count: "exact", head: true })
      .eq("lister_uuid", user.id)
      .eq("status", "pending")
      .gte("created_at", since);
    if ((count ?? 0) >= 3) {
      return fail("Too many attempts. Wait a few minutes.", 429);
    }

    const { data: profile } = await paymentsSupabase
      .from("users_table")
      .select("username, lister_email, phone_number")
      .eq("lister_uuid", user.id)
      .maybeSingle();
    const billing = {
      email: profile?.lister_email ?? null,
      phone: profile?.phone_number ?? null,
      firstName: profile?.username ?? null,
    };
    if (!billing.email && !billing.phone) {
      return fail("Add an email or phone number to your account first.", 400);
    }

    const merchant_reference = `PEDUA-${randomUUID()}`;

    const { data: row, error: insertErr } = await paymentsSupabase
      .from("access_payments")
      .insert({
        lister_uuid: user.id,
        plan_name: plan.plan_name,
        duration_minutes: plan.duration_minutes,
        amount_kes: plan.price_kes,
        merchant_reference,
        status: "pending",
      })
      .select("payment_id")
      .single();
    if (insertErr) return fail(insertErr.message, 500);
    payment_id = row.payment_id;

    const base = process.env.NEXT_PUBLIC_BASE_URL;
    const { providerRef, redirectUrl } = await initiatePayment({
      merchantReference: merchant_reference,
      amountKes: plan.price_kes,
      description: `${plan.plan_name} contact access`,
      callbackUrl: `${base}/payment/return`,
      cancellationUrl: `${base}/payment/cancelled`,
      billing,
      ipnId: accessIpnId,
    });

    let saved = false;
    for (let i = 0; i < 3 && !saved; i++) {
      const { error: upErr } = await paymentsSupabase
        .from("access_payments")
        .update({
          provider_ref: providerRef,
          updated_at: new Date().toISOString(),
        })
        .eq("payment_id", payment_id);
      if (!upErr) saved = true;
      else await new Promise((r) => setTimeout(r, 300 * (i + 1)));
    }
    if (!saved) {
      await paymentsSupabase
        .from("access_payments")
        .update({
          status: "needs_review",
          failure_reason: `Order created at provider (${providerRef}) but ref not saved.`,
          updated_at: new Date().toISOString(),
        })
        .eq("payment_id", payment_id);
      return fail("Could not start payment. Contact support.", 500);
    }

    return NextResponse.json(
      { success: true, redirect_url: redirectUrl, provider_ref: providerRef },
      { headers: NO_STORE },
    );
  } catch (err) {
    console.error("[access/pay/initiate]", err);
    if (payment_id) {
      await paymentsSupabase
        .from("access_payments")
        .update({
          status: "failed",
          failure_reason: String(err.message).slice(0, 200),
          updated_at: new Date().toISOString(),
        })
        .eq("payment_id", payment_id)
        .eq("status", "pending");
    }
    return fail("Payment initiation failed. Try again.", 502);
  }
}
