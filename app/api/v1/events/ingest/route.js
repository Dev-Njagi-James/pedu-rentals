import { publishEvent } from "@/lib/events/publish";

export async function POST(request) {
  const body = await request.json();

  // Supabase Database Webhook payload shape: { type, table, record, old_record, schema }
  const { type, table, record } = body;

  const entityMap = {
    reviews_table: "review",
    review_reactions: "reaction",
    listings_table: "listing",
  };

  const actionMap = {
    INSERT: "created",
    UPDATE: "updated",
    DELETE: "deleted",
  };

  const entity = entityMap[table];
  if (!entity) {
    return Response.json({ ignored: true }, { status: 200 });
  }

  const action = actionMap[type];
  const listing_id = record?.listing_id ?? record?.id;
  const id =
    record?.review_id ??
    record?.reaction_id ??
    record?.listing_id ??
    record?.id;

  // Gate unpaid listings out of the feed at this layer
  if (
    entity === "listing" &&
    action === "created" &&
    record?.payment_status !== "paid"
  ) {
    return Response.json({ ignored: true, reason: "unpaid" }, { status: 200 });
  }

  await publishEvent({ entity, action, id, listing_id, payload: record });

  return Response.json({ ok: true });
}
