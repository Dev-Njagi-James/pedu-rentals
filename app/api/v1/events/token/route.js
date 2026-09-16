import Ably from "ably";
import crypto from "crypto";

let _ablyRest = null;
function getAblyRestClient() {
  if (!_ablyRest) {
    _ablyRest = new Ably.Rest(process.env.ABLY_API_KEY);
  }
  return _ablyRest;
}

export async function GET() {
  try {
    const ably = getAblyRestClient();

    const tokenRequest = await ably.auth.createTokenRequest({
      clientId: `anon-${crypto.randomUUID()}`,
      capability: JSON.stringify({
        "listings:feed": ["subscribe"],
        "listing:*": ["subscribe"],
      }),
      ttl: 60 * 60 * 1000, // 1 hour
    });

    return Response.json(tokenRequest);
  } catch (err) {
    console.error("Ably token request error:", err);
    return Response.json(
      { error: "Failed to create realtime token" },
      { status: 500 },
    );
  }
}
