import { NextResponse } from "next/server";
import { paymentsSupabase } from "@/lib/supabase/paymentsClient";
import { requireAuth } from "@/lib/auth/session";
import { getAccessExpiry } from "@/lib/auth/viewAccess";
import { isFlagEnabled } from "@/lib/flags";

export const revalidate = 0;
const NO_STORE = { "Cache-Control": "private, no-store" };

export async function POST() {
 if (await isFlagEnabled("contact_access_payment_required")) {
    return NextResponse.json(
      { error: "Payment required", code: "payment_required" },
      { status: 403, headers: NO_STORE },
    );
  }

  const { user, error, status } = await requireAuth();
  if (error || !user) {
    return NextResponse.json(
      { error: error ?? "Unauthenticated" },
      { status: status ?? 401, headers: NO_STORE },
    );
  }

  const { data: plan, error: planError } = await paymentsSupabase
    .from("access_plans")
    .select("plan_name")
    .eq("is_active", true)
    .maybeSingle();

  if (planError || !plan) {
    return NextResponse.json(
      { error: "No active plan" },
      { status: 503, headers: NO_STORE },
    );
  }

  try {
    const current = await getAccessExpiry(user.id);
    if (current && new Date(current).getTime() > Date.now()) {
      return NextResponse.json(
        { error: "Already active", code: "already_active" },
        { status: 409, headers: NO_STORE },
      );
    }
  } catch {
    return NextResponse.json(
      { error: "Could not check access" },
      { status: 500, headers: NO_STORE },
    );
  }

  const { data: expiresAt, error: grantError } = await paymentsSupabase.rpc(
    "grant_contact_access",
    { p_lister: user.id, p_plan: plan.plan_name, p_source: "free" },
  );

  if (grantError) {
    return NextResponse.json(
      { error: "Could not activate" },
      { status: 500, headers: NO_STORE },
    );
  }

  return NextResponse.json(
    { data: { expires_at: expiresAt, server_time: new Date().toISOString() } },
    { headers: NO_STORE },
  );
}
