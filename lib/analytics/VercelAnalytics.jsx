"use client";

import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";

const STRIP = ["__clerk_handshake", "__clerk_db_jwt", "__clerk_synced"];

function clean(event) {
  try {
    const url = new URL(event.url);
    STRIP.forEach((k) => url.searchParams.delete(k));
    return { ...event, url: url.toString() };
  } catch {
    return event;
  }
}

export default function VercelAnalytics() {
  return (
    <>
      <Analytics debug={false} beforeSend={clean} />
      <SpeedInsights debug={false} beforeSend={clean} />
    </>
  );
}
