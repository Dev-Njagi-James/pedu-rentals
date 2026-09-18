'use client';
import { useEffect, Suspense } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { PostHogProvider as PHProvider } from 'posthog-js/react';
import { initPostHogClient, posthog } from './posthog-client';

function PostHogPageview() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (!pathname) return;
    let url = window.origin + pathname;
    if (searchParams.toString()) url += `?${searchParams.toString()}`;
    posthog.capture('$pageview', { $current_url: url });
  }, [pathname, searchParams]);

  return null;
}

export function PostHogProvider({ children }) {
  useEffect(() => {
    initPostHogClient();
  }, []);

  return (
    <PHProvider client={posthog}>
      <Suspense fallback={null}>
        <PostHogPageview />
      </Suspense>
      {children}
    </PHProvider>
  );
}
