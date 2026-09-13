import { paymentsSupabase } from "@/lib/supabase/paymentsClient";
import { recalculateListingRating } from "@/lib/reviews/sync";
import { NextResponse } from "next/server";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const listing_id = searchParams.get("listing_id");
  const fingerprint = searchParams.get("fingerprint");

  if (!listing_id) {
    return NextResponse.json(
      { error: "listing_id is required" },
      { status: 400 },
    );
  }

  const { data, error } = await paymentsSupabase
    .from("reviews_table")
    .select(
      "review_id, listing_id, fingerprint, rating, review_text, created_at",
    )
    .eq("listing_id", listing_id)
    .eq("status", "visible")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json(
      { error: "Failed to fetch reviews", details: error.message },
      { status: 500 },
    );
  }

  const reviewIds = data.map((r) => r.review_id);
  const counts = {};
  const userReactions = {};

  if (reviewIds.length > 0) {
    const { data: reactions, error: reactionsError } = await paymentsSupabase
      .from("review_reactions")
      .select("review_id, reaction_type, fingerprint")
      .in("review_id", reviewIds);

    if (!reactionsError && reactions) {
      for (const r of reactions) {
        if (!counts[r.review_id]) {
          counts[r.review_id] = { like_count: 0, dislike_count: 0 };
        }
        counts[r.review_id][`${r.reaction_type}_count`]++;
        if (fingerprint && r.fingerprint === fingerprint) {
          userReactions[r.review_id] = r.reaction_type;
        }
      }
    }
  }

  const enriched = data.map((r) => ({
    ...r,
    like_count: counts[r.review_id]?.like_count ?? 0,
    dislike_count: counts[r.review_id]?.dislike_count ?? 0,
    user_reaction: userReactions[r.review_id] ?? null,
  }));

  return NextResponse.json({ data: enriched });
}

export async function POST(request) {
  const body = await request.json();
  const { listing_id, fingerprint, rating, review_text, account_uuid } = body;

  if (!listing_id || !fingerprint || !rating) {
    return NextResponse.json(
      { error: "listing_id, fingerprint, and rating are required" },
      { status: 400 },
    );
  }
  if (rating < 1 || rating > 5) {
    return NextResponse.json(
      { error: "rating must be between 1 and 5" },
      { status: 400 },
    );
  }

  const { data: listing, error: listingError } = await paymentsSupabase
    .from("listings_table")
    .select("listing_id, payment_status")
    .eq("listing_id", listing_id)
    .single();

  if (listingError || !listing) {
    return NextResponse.json({ error: "Listing not found" }, { status: 404 });
  }
  if (listing.payment_status !== "paid") {
    return NextResponse.json(
      { error: "Reviews are only accepted on live listings" },
      { status: 403 },
    );
  }

  const { data: inserted, error: insertError } = await paymentsSupabase
    .from("reviews_table")
    .insert({
      listing_id,
      fingerprint,
      rating,
      review_text: review_text ?? null,
      account_uuid: account_uuid ?? null,
    })
    .select()
    .single();

  if (insertError) {
    if (insertError.code === "23505") {
      return NextResponse.json(
        { error: "You have already reviewed this listing" },
        { status: 409 },
      );
    }
    return NextResponse.json(
      { error: "Failed to submit review", details: insertError.message },
      { status: 500 },
    );
  }

  await recalculateListingRating(listing_id);

  return NextResponse.json({ data: inserted }, { status: 201 });
}
