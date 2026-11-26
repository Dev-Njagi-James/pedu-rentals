import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/requireAdmin";
import { scaleClient, AuthError, RateLimitError, QuotaExceededError, SubscriptionExpiredError } from "@/lib/scale/client";

export async function GET() {
  const gate = await requireAdmin();
  if (gate.error) return gate.error;

  try {
    const usage = await scaleClient.storage.usage();
    return NextResponse.json(usage, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: "Upstream authentication failed" }, { status: 502 });
    }
    if (err instanceof RateLimitError) {
      return NextResponse.json({ error: "Rate limited", retryAfterMs: err.retryAfterMs }, { status: 429 });
    }
    if (err instanceof QuotaExceededError || err instanceof SubscriptionExpiredError) {
      return NextResponse.json({ error: "Usage unavailable" }, { status: 502 });
    }
    return NextResponse.json({ error: "Failed to fetch usage" }, { status: 502 });
  }
}