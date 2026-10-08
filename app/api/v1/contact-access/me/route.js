import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/session";
import { getAccessExpiry } from "@/lib/auth/viewAccess";
import { paymentsSupabase } from "@/lib/supabase/paymentsClient";
import { isFlagEnabled } from "@/lib/flags";

export const revalidate = 0;
const NO_STORE = { "Cache-Control": "private, no-store" };

export async function GET() {
  const { user, error, status } = await requireAuth();
  if (error || !user) {
    return NextResponse.json(
      { error: error ?? "Unauthenticated" },
      { status: status ?? 401, headers: NO_STORE },
    );
  }

  try {
    const [expiresAt, paymentRequired, planRes] = await Promise.all([
      getAccessExpiry(user.id),
      isFlagEnabled("contact_access_payment_required"),
      paymentsSupabase
        .from("access_plans")
        .select("plan_name, duration_minutes, price_kes")
        .eq("is_active", true)
        .maybeSingle(),
    ]);

    return NextResponse.json(
      {
        data: {
          expires_at: expiresAt,
          server_time: new Date().toISOString(),
          payment_required: paymentRequired,
          plan: planRes.data ?? null,
        },
      },
      { headers: NO_STORE },
    );
  } catch {
    return NextResponse.json(
      { error: "Failed to read access" },
      { status: 500, headers: NO_STORE },
    );
  }
}
