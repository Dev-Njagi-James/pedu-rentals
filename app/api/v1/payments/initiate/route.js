import { NextResponse } from "next/server";
import { paymentsSupabase } from "@/lib/supabase/paymentsClient";
import { requireAuth } from "@/lib/auth/session";
import { randomUUID } from "crypto";
import { initiatePayment } from "@/lib/payments";
import { MIN_LISTING_IMAGES, PAYMENT_PENDING_WINDOW_MINUTES } from "@/lib/constants";

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
      .select(
        "listing_category, lister_uuid, payment_status, phone_number, admin_unpublished_at, subscriptions_table (status, expires_at)",
      )
      .eq("listing_id", listing_id)
      .single();

    if (listingErr) {
      if (listingErr.code === "PGRST116") {
        return NextResponse.json(
          { success: false, error: "Listing not found." },
          { status: 404 },
        );
      }
      //console.error("[payments/initiate] listing lookup", listingErr);
      return NextResponse.json(
        { success: false, error: "Could not load listing." },
        { status: 500 },
      );
    }

    if (listingRow.lister_uuid !== user.id) {
      return NextResponse.json(
        { success: false, error: "Forbidden" },
        { status: 403 },
      );
    }

    const hasActiveSub = (subs) => {
      if (!Array.isArray(subs)) return false;
      const now = new Date();
      return subs.some(
        (s) => s.status === "active" && s.expires_at && new Date(s.expires_at) > now,
      );
    };

    if (listingRow.admin_unpublished_at != null) {
      return NextResponse.json(
        { success: false, error: "Listing is unpublished by admin." },
        { status: 409 },
      );
    }
    if (
      listingRow.payment_status === "paid" &&
      hasActiveSub(listingRow.subscriptions_table)
    ) {
      return NextResponse.json(
        { success: false, error: "Listing already has an active subscription." },
        { status: 409 },
      );
    }

    const { data: media } = await paymentsSupabase
      .from("images_table")
      .select("images_url")
      .eq("listing_id", listing_id)
      .maybeSingle();
    if (
      !Array.isArray(media?.images_url) ||
      media.images_url.length < MIN_LISTING_IMAGES
    ) {
      return NextResponse.json(
        { success: false, error: "Upload listing images before payment." },
        { status: 409 },
      );
    }

    // REMOVABLE: temporary free pass. Delete this block to end the promotion.
    if (listingRow.listing_category === "Rentals" && plan_name === "Regular") {
      let paid = false;

      if (listingRow.payment_status === "pending") {
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
        paid = true;
      } else {
        const { error: freeErr } = await paymentsSupabase
          .from("listings_table")
          .update({
            plan_name: "Regular",
            updated_at: new Date().toISOString(),
          })
          .eq("listing_id", listing_id)
          .eq("lister_uuid", user.id);

        if (freeErr) {
          return NextResponse.json(
            { success: false, error: freeErr.message },
            { status: 500 },
          );
        }
      }

      // Re-query for an active subscription before inserting.
      const now = new Date();
      const { data: activeSubs } = await paymentsSupabase
        .from("subscriptions_table")
        .select("subscription_id")
        .eq("listing_id", listing_id)
        .eq("status", "active")
        .gte("expires_at", now.toISOString())
        .limit(1);

      if (!activeSubs?.length) {
        const expires_at = new Date(
          Date.now() + 30 * 24 * 60 * 60 * 1000,
        ).toISOString();
        const { error: subErr } = await paymentsSupabase
          .from("subscriptions_table")
          .insert({
            listing_id,
            plan_name: "Regular",
            payment_id: null,
            status: "active",
            expires_at,
          });

        if (subErr) {
          return NextResponse.json(
            { success: false, error: "Could not activate listing." },
            { status: 500 },
          );
        }
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
          {
            success: false,
            error: "No pricing found for this plan and category.",
          },
          { status: 400 },
        );
      }
      return NextResponse.json(
        { success: false, error: planErr.message },
        { status: 500 },
      );
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
        {
          success: false,
          error: "Add an email or phone number to your account first.",
        },
        { status: 400 },
      );
    }

    const windowStart = new Date(
      Date.now() - PAYMENT_PENDING_WINDOW_MINUTES * 60 * 1000,
    ).toISOString();

    const { data: existingRows, error: existingErr } = await paymentsSupabase
      .from("payments_table")
      .select("payment_id")
      .eq("listing_id", listing_id)
      .eq("status", "pending")
      .gte("created_at", windowStart)
      .limit(1);

    if (existingErr) {
      return NextResponse.json(
        { success: false, error: "Could not start payment." },
        { status: 500 },
      );
    }

    if (existingRows?.length) {
      return NextResponse.json(
        {
          success: false,
          error: "A payment is already in progress for this listing.",
        },
        { status: 409 },
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
      //console.error("[payments/initiate] payment insert", insertErr);
      return NextResponse.json({ success: false, error: "Could not start payment." }, { status: 500 });
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
        .update({
          provider_ref: providerRef,
          updated_at: new Date().toISOString(),
        })
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
        {
          success: false,
          error: "Could not start payment. Contact support.",
          payment_id,
        },
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
