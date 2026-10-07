import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/session";
import { getAccessExpiry } from "@/lib/auth/viewAccess";

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
    const expiresAt = await getAccessExpiry(user.id);
    return NextResponse.json(
      {
        data: { expires_at: expiresAt, server_time: new Date().toISOString() },
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
