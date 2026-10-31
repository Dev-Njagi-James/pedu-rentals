import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/requireAdmin";
import { paymentsSupabase } from "@/lib/supabase/paymentsClient";

const MAX_CHANGES = 100;
const MIN_PRICE = 1;
const MAX_PRICE = 1_000_000;

export async function GET() {
  const gate = await requireAdmin();
  if (gate.error) return gate.error;

  const { data, error } = await paymentsSupabase
    .from("plan_category_pricing")
    .select(
      `plan_name, category_name, price_kes,
       plans_table (visibility_label, priority_rank)`,
    );

  if (error) {
    console.error("[admin/pricing GET]", error);
    return NextResponse.json(
      { error: "Failed to load pricing." },
      { status: 500 },
    );
  }

  const pricing = (data ?? [])
    .map((row) => ({
      plan_name: row.plan_name,
      category_name: row.category_name,
      price_kes: row.price_kes,
      priority_rank: row.plans_table?.priority_rank ?? 0,
    }))
    .sort(
      (a, b) =>
        a.category_name.localeCompare(b.category_name) ||
        a.priority_rank - b.priority_rank,
    )
    .map(({ priority_rank, ...row }) => row);

  return NextResponse.json(
    { pricing },
    { headers: { "Cache-Control": "no-store" } },
  );
}

export async function PATCH(request) {
  const gate = await requireAdmin();
  if (gate.error) return gate.error;

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Malformed JSON body." },
      { status: 400 },
    );
  }

  const changes = body?.changes;
  if (!Array.isArray(changes) || changes.length < 1) {
    return NextResponse.json(
      { error: "changes must be a non-empty array." },
      { status: 400 },
    );
  }
  if (changes.length > MAX_CHANGES) {
    return NextResponse.json({ error: "Too many changes." }, { status: 400 });
  }

  const seen = new Set();
  const clean = [];
  for (const c of changes) {
    const plan_name =
      typeof c?.plan_name === "string" ? c.plan_name.trim() : "";
    const category_name =
      typeof c?.category_name === "string" ? c.category_name.trim() : "";
    const oldP = c?.old_price_kes;
    const newP = c?.new_price_kes;

    if (!plan_name || !category_name) {
      return NextResponse.json(
        { error: "plan_name and category_name are required." },
        { status: 400 },
      );
    }
    if (!Number.isInteger(oldP) || !Number.isInteger(newP)) {
      return NextResponse.json(
        { error: "Prices must be whole numbers." },
        { status: 400 },
      );
    }
    if (newP < MIN_PRICE || newP > MAX_PRICE) {
      return NextResponse.json(
        { error: `Price must be between ${MIN_PRICE} and ${MAX_PRICE}.` },
        { status: 400 },
      );
    }
    if (newP === oldP) {
      return NextResponse.json(
        { error: "Unchanged rows must not be submitted." },
        { status: 400 },
      );
    }
    const key = `${plan_name}::${category_name}`;
    if (seen.has(key)) {
      return NextResponse.json(
        { error: "Duplicate plan/category in one batch." },
        { status: 400 },
      );
    }
    seen.add(key);
    clean.push({
      plan_name,
      category_name,
      old_price_kes: oldP,
      new_price_kes: newP,
    });
  }

  const { error } = await paymentsSupabase.rpc("admin_update_pricing", {
    p_changes: clean,
    p_admin_clerk_id: gate.userId,
  });

  if (error) {
    if (error.code === "40001") {
      return NextResponse.json(
        {
          error: "Prices changed since you loaded this page. Reload and retry.",
        },
        { status: 409 },
      );
    }
    console.error("[admin/pricing PATCH]", error);
    return NextResponse.json(
      { error: "Failed to save pricing." },
      { status: 500 },
    );
  }

  return NextResponse.json({ success: true, updated: clean.length });
}
