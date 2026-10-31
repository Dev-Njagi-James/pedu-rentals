"use client";
import posthog from "posthog-js";

export function initPostHogClient() {
  if (typeof window === "undefined") return;
  if (posthog.__loaded) return;

  posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY, {
    api_host: "/ingest",
    ui_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://us.posthog.com",
    person_profiles: "identified_only",
    capture_pageview: false,
    sanitize_properties: (props) => {
      for (const key of ["$current_url", "$referrer"]) {
        if (typeof props[key] === "string") {
          props[key] = props[key]
            .replace(/([?&])__clerk_[a-z_]+=[^&]*&?/gi, "$1")
            .replace(/[?&]$/, "");
        }
      }
      return props;
    },
    loaded: (ph) => {
      if (window.location.hostname !== "www.pedurentals.com") {
        ph.opt_out_capturing();
      }
    },
  });
}

export { posthog };
