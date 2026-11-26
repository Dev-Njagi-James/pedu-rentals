import { paymentsSupabase } from "@/lib/supabase/paymentsClient";
import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/session";

export const revalidate = 0;

const parseBody = (n) => ({
  ...n,
  body: typeof n.body === "string" ? JSON.parse(n.body) : n.body,
});

export async function GET(request) {
  try {
    const { error, status } = await requireRole("admin");
    if (error) {
      return NextResponse.json({ error }, { status });
    }

    const { searchParams } = new URL(request.url);

    const rawLimit = parseInt(searchParams.get("limit") ?? "50", 10);
    const limit = Number.isFinite(rawLimit)
      ? Math.min(Math.max(rawLimit, 1), 200)
      : 50;

    const afterParam = searchParams.get("after_id");
    const afterId = afterParam !== null ? parseInt(afterParam, 10) : null;
    if (afterParam !== null && !Number.isInteger(afterId)) {
      return NextResponse.json(
        { error: "after_id must be an integer" },
        { status: 400 },
      );
    }

    let query = paymentsSupabase.from("notifications").select("*");

    if (afterId !== null) {
      query = query.gt("id", afterId).order("id", { ascending: true });
    } else {
      query = query.order("created_at", { ascending: false });
    }

    const { data, error: dbError } = await query.limit(limit);
    if (dbError) {
      return NextResponse.json({ error: dbError.message }, { status: 500 });
    }

    const { count: unread, error: countError } = await paymentsSupabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("read", false);
    if (countError) {
      return NextResponse.json({ error: countError.message }, { status: 500 });
    }

    return NextResponse.json({
      data: (data ?? []).map(parseBody),
      unread: unread ?? 0,
    });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PATCH(request) {
  try {
    const { error, status } = await requireRole("admin");
    if (error) {
      return NextResponse.json({ error }, { status });
    }

    const { ids, all } = await request.json();

    let dbError;

    if (all) {
      ({ error: dbError } = await paymentsSupabase
        .from("notifications")
        .update({ read: true })
        .eq("read", false));
    } else if (Array.isArray(ids) && ids.length) {
      ({ error: dbError } = await paymentsSupabase
        .from("notifications")
        .update({ read: true })
        .in("id", ids));
    }

    if (dbError) {
      return NextResponse.json({ error: dbError.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
