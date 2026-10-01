import { NextResponse } from "next/server";
import { paymentsSupabase } from "@/lib/supabase/paymentsClient";
import { requireAuth } from "@/lib/auth/session";
import { randomUUID } from "crypto";
import { initiatePayment } from "@/lib/payments";


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
      return NextResponse.json(
        { success: false, error: "Malformed JSON body." },
        { status: 400 },
      );
    }

    const { listing_id, plan_name } = body;
    if (!listing_id || !plan_name) {
      return NextResponse.json(
        { success: false, error: "listing_id and plan_name are required." },
        { status: 400 },
      );
    }

    const { data: listingRow, error: listingErr } = await paymentsSupabase
      .from("listings_table")
      .select("listing_category, lister_uuid, payment_status, phone_number")
      .eq("listing_id", listing_id)
      .single();

    if (listingErr) {
      if (listingErr.code === "PGRST116") {
        return NextResponse.json(
          { success: false, error: "Listing not found." },
          { status: 404 },
        );
      }
      return NextResponse.json(
        { success: false, error: listingErr.message },
        { status: 500 },
      );
    }

    if (listingRow.lister_uuid !== user.id) {
      return NextResponse.json(
        { success: false, error: "Forbidden" },
        { status: 403 },
      );
    }
    if (listingRow.payment_status === "paid") {
      return NextResponse.json(
        { success: false, error: "Listing is already published." },
        { status: 409 },
      );
    }

    // REMOVABLE: temporary free pass. Delete this block to end the promotion.
    if (listingRow.listing_category === "Rentals" && plan_name === "Regular") {
      const { data: updated, error: freeErr } = await paymentsSupabase
        .from("listings_table")
        .update({
          payment_status: "paid",
          plan_name: "Regular",
          updated_at: new Date().toISOString(),
        })
        .eq("listing_id", listing_id)
        .eq("lister_uuid", user.id)
        .eq("payment_status", "pending")
        .select("listing_id");

      if (freeErr) {
        return NextResponse.json(
          { success: false, error: freeErr.message },
          { status: 500 },
        );
      }
      if (!updated?.length) {
        return NextResponse.json(
          { success: false, error: "Listing is no longer pending." },
          { status: 409 },
        );
      }
      return NextResponse.json({ success: true, free_pass: true });
    }

        const { data: plan, error: planErr } = await paymentsSupabase
      .from("plan_category_pricing")
      .select("price_kes")
      .eq("plan_name", plan_name)
      .eq("category_name", listingRow.listing_category)
      .single();

    if (planErr) {
      if (planErr.code === "PGRST116") {
        return NextResponse.json(
          { success: false, error: "No pricing found for this plan and category." },
          { status: 400 },
        );
      }
      return NextResponse.json({ success: false, error: planErr.message }, { status: 500 });
    }

    const amount_kes = plan.price_kes;

    // Billing details come from the server, never the client.
    const { data: profile } = await paymentsSupabase
      .from("users_table")
      .select("username, lister_email, phone_number")
      .eq("lister_uuid", user.id)
      .maybeSingle();
    const billing = {
      email: profile?.lister_email ?? null,
      phone: profile?.phone_number ?? listingRow.phone_number ?? null,
      firstName: profile?.username ?? null,
    };
    if (!billing.email && !billing.phone) {
      return NextResponse.json(
        { success: false, error: "Add an email or phone number to your account first." },
        { status: 400 },
      );
    }

    const merchant_reference = `PEDU-${randomUUID()}`;

    const { data: paymentRecord, error: insertErr } = await paymentsSupabase
      .from("payments_table")
      .insert({
        lister_uuid: user.id,
        listing_id,
        plan_name,
        category_name: listingRow.listing_category,
        amount_kes,
        merchant_reference,
        status: "pending",
        provider_ref: null,
      })
      .select("payment_id")
      .single();

    if (insertErr) {
      return NextResponse.json({ success: false, error: insertErr.message }, { status: 500 });
    }
    payment_id = paymentRecord.payment_id;

    const base = process.env.NEXT_PUBLIC_BASE_URL;
    const { providerRef, redirectUrl } = await initiatePayment({
      merchantReference: merchant_reference,
      amountKes: amount_kes,
      description: `${plan_name} listing`,
      callbackUrl: `${base}/payment/return`,
      cancellationUrl: `${base}/payment/cancelled`,
      billing,
    });

    let saved = false;
    for (let attempt = 0; attempt < 3 && !saved; attempt++) {
      const { error: updateErr } = await paymentsSupabase
        .from("payments_table")
        .update({ provider_ref: providerRef, updated_at: new Date().toISOString() })
        .eq("payment_id", payment_id);
      if (!updateErr) saved = true;
      else await new Promise((r) => setTimeout(r, 300 * (attempt + 1)));
    }

    if (!saved) {
      await paymentsSupabase
        .from("payments_table")
        .update({
          status: "needs_review",
          failure_reason: `Order created at provider (${providerRef}) but ref not saved.`,
          updated_at: new Date().toISOString(),
        })
        .eq("payment_id", payment_id);
      return NextResponse.json(
        { success: false, error: "Could not start payment. Contact support.", payment_id },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      redirect_url: redirectUrl,
      provider_ref: providerRef,
    });
  } catch (err) {
    console.error("[payments/initiate]", err);
    if (payment_id) {
      await paymentsSupabase
        .from("payments_table")
        .update({
          status: "failed",
          failure_reason: String(err.message).slice(0, 200),
          updated_at: new Date().toISOString(),
        })
        .eq("payment_id", payment_id)
        .eq("status", "pending");
    }
    return NextResponse.json(
      { success: false, error: "Payment initiation failed. Try again." },
      { status: 502 },
    );
  }
}
