'use client';
import posthog from 'posthog-js';

export function initPostHogClient() {
  if (typeof window === 'undefined') return;
  if (posthog.__loaded) return;

  posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY, {
    api_host: '/ingest',
    ui_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.posthog.com',
    person_profiles: 'identified_only',
    capture_pageview: false,
  });
}

export { posthog };
