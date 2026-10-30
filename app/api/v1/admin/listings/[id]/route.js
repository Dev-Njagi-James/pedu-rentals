//id
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/requireAdmin";
import { paymentsSupabase } from "@/lib/supabase/paymentsClient";
import { ScaleClient } from "@stravon/scale-sdk";

const scale = new ScaleClient({ apiKey: process.env.SCALE_API_KEY });

export async function GET(_request, { params }) {
  const gate = await requireAdmin();
  if (gate.error) return gate.error;

  const { id } = await params;
  if (!/^\d+$/.test(id)) {
    return NextResponse.json({ error: "Invalid listing id" }, { status: 400 });
  }

  const { data, error } = await paymentsSupabase
    .from("listings_table")
    .select(
      `*,
       images_table (images_url, video_url),
       users_table (lister_uuid, username, lister_email, phone_number)`,
    )
    .eq("listing_id", Number(id))
    .maybeSingle();

  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { users_table, ...item } = data;
  return NextResponse.json({
    ...item,
    lister: {
      uuid: item.lister_uuid,
      username: users_table?.username || users_table?.lister_email || "Lister",
      email: users_table?.lister_email ?? null,
      phone: users_table?.phone_number ?? null,
    },
  });
}

const ACTIONS = new Set(["unpublish", "republish", "tag"]);

function parseId(id) {
  return /^\d+$/.test(id) ? Number(id) : null;
}

function fail(error) {
  const status =
    error.code === "P0002"
      ? 404
      : error.code === "55000" || error.code === "23503"
        ? 409
        : error.code === "23514"
          ? 400
          : 500;
  return NextResponse.json({ error: error.message }, { status });
}

export async function PATCH(request, { params }) {
  const gate = await requireAdmin();
  if (gate.error) return gate.error;

  const listingId = parseId((await params).id);
  if (listingId == null)
    return NextResponse.json({ error: "Invalid listing id" }, { status: 400 });

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const { action, tag = null, note = null } = body ?? {};
  if (!ACTIONS.has(action))
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });

  const common = {
    p_listing_id: listingId,
    p_admin_clerk: gate.userId,
    p_admin_uuid: null,
    p_note: note ? String(note).slice(0, 500) : null,
  };

  const { data, error } =
    action === "tag"
      ? await paymentsSupabase.rpc("admin_set_review_tag", {
          ...common,
          p_tag: tag,
        })
      : await paymentsSupabase.rpc(`admin_${action}_listing`, common);

  if (error) return fail(error);
  return NextResponse.json(data);
}

export async function DELETE(request, { params }) {
  const gate = await requireAdmin();
  if (gate.error) return gate.error;

  const listingId = parseId((await params).id);
  if (listingId == null)
    return NextResponse.json({ error: "Invalid listing id" }, { status: 400 });

  const { data, error } = await paymentsSupabase.rpc("admin_delete_listing", {
    p_listing_id: listingId,
    p_admin_clerk: gate.userId,
    p_admin_uuid: null,
    p_note: null,
  });

  if (error) return fail(error);
  // DB is already committed. Storage cleanup is best-effort; orphans are invisible.
  const failedKeys = [];
  for (const key of data?.storage_keys ?? []) {
    try {
      const r = await scale.storage.delete({ key });
      if (!r?.success) failedKeys.push(key);
    } catch {
      failedKeys.push(key);
    }
  }
  if (failedKeys.length) {
    console.error(
      "Orphaned storage keys after admin delete",
      listingId,
      failedKeys,
    );
  }

  return NextResponse.json({ deleted: true, orphanedKeys: failedKeys.length });
}
