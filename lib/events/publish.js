import Ably from "ably";

const ably = new Ably.Rest(process.env.ABLY_API_KEY);

export async function publishEvent({
  entity,
  action,
  id,
  listing_id,
  payload,
}) {
  const channelName =
    entity === "listing" ? "listings:feed" : `listing:${listing_id}`;
  const channel = ably.channels.get(channelName);
  await channel.publish(`${entity}.${action}`, {
    id,
    listing_id,
    payload,
    ts: Date.now(),
  });
}
