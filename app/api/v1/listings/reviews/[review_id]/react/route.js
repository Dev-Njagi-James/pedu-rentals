import { paymentsSupabase } from "@/lib/supabase/paymentsClient";
import { NextResponse } from "next/server";

export async function POST(request, { params }) {
  const { review_id } = await params;
  const { fingerprint, reaction_type } = await request.json();

  if (!fingerprint || !["like", "dislike"].includes(reaction_type)) {
    return NextResponse.json(
      { error: "fingerprint and valid reaction_type are required" },
      { status: 400 },
    );
  }

  const { data: existing, error: fetchError } = await paymentsSupabase
    .from("review_reactions")
    .select("reaction_id, reaction_type")
    .eq("review_id", review_id)
    .eq("fingerprint", fingerprint)
    .maybeSingle();

  if (fetchError) {
    return NextResponse.json(
      {
        error: "Failed to check existing reaction",
        details: fetchError.message,
      },
      { status: 500 },
    );
  }

  if (existing && existing.reaction_type === reaction_type) {
    const { error: deleteError } = await paymentsSupabase
      .from("review_reactions")
      .delete()
      .eq("reaction_id", existing.reaction_id);

    if (deleteError) {
      return NextResponse.json(
        { error: "Failed to remove reaction", details: deleteError.message },
        { status: 500 },
      );
    }

    return NextResponse.json(
      { data: { removed: true, reaction_type: null } },
      { status: 200 },
    );
  }

  if (existing && existing.reaction_type !== reaction_type) {
    const { data: updated, error: updateError } = await paymentsSupabase
      .from("review_reactions")
      .update({ reaction_type })
      .eq("reaction_id", existing.reaction_id)
      .select()
      .single();

    if (updateError) {
      return NextResponse.json(
        { error: "Failed to update reaction", details: updateError.message },
        { status: 500 },
      );
    }

    return NextResponse.json({ data: updated }, { status: 200 });
  }

  const { data: inserted, error: insertError } = await paymentsSupabase
    .from("review_reactions")
    .insert({ review_id, fingerprint, reaction_type })
    .select()
    .single();

  if (insertError) {
    if (insertError.code === "23505") {
      return NextResponse.json(
        { error: "Already reacted to this review" },
        { status: 409 },
      );
    }
    return NextResponse.json(
      { error: "Failed to submit reaction", details: insertError.message },
      { status: 500 },
    );
  }

  return NextResponse.json({ data: inserted }, { status: 201 });
}
