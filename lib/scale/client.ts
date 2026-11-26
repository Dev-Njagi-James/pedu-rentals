import "server-only";
import { ScaleClient, AuthError, RateLimitError, QuotaExceededError, SubscriptionExpiredError } from "@stravon/scale-sdk";

let _scaleClient: ScaleClient | null = null;

function getScaleClient(): ScaleClient {
  if (!_scaleClient) {
    const apiKey = process.env.SCALE_API_KEY;
    if (!apiKey) {
      throw new Error("SCALE_API_KEY is not set");
    }
    _scaleClient = new ScaleClient({ apiKey });
  }
  return _scaleClient;
}

export const scaleClient = new Proxy({} as ScaleClient, {
  get(_target, prop) {
    return getScaleClient()[prop as keyof ScaleClient];
  },
});

export { AuthError, RateLimitError, QuotaExceededError, SubscriptionExpiredError };