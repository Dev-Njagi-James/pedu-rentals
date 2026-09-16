import Ably from "ably";

let _ably = null;
function getAblyClient() {
  if (!_ably) {
    _ably = new Ably.Rest(process.env.ABLY_API_KEY);
  }
  return _ably;
}

export async function publishEvent({
  entity,
  action,
  id,
  listing_id,
  payload,
}) {
  const ably = getAblyClient();
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
