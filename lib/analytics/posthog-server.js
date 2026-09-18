import 'server-only';
import { PostHog } from 'posthog-node';

let posthogClient;

export function getPostHogServerClient() {
  if (!posthogClient) {
    posthogClient = new PostHog(process.env.POSTHOG_API_KEY, {
      host: process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com',
      flushAt: 1,
      flushInterval: 0,
    });
  }
  return posthogClient;
}

export function captureServerEvent(distinctId, event, properties = {}) {
  const client = getPostHogServerClient();
  client.capture({ distinctId, event, properties });
}

export async function shutdownPostHog() {
  if (posthogClient) {
    await posthogClient.shutdown();
  }
}
