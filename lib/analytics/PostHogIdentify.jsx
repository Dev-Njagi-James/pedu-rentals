"use client";

import { useEffect, useRef } from "react";
import { useUser } from "@clerk/nextjs";
import { initPostHogClient, posthog } from "./posthog-client";

export default function PostHogIdentify() {
  const { isLoaded, isSignedIn, user } = useUser();
  const wasSignedIn = useRef(false);
  const userId = user?.id;
  const isAdmin = user?.publicMetadata?.role === "admin";

  useEffect(() => {
    if (!isLoaded) return;
    // Child effects run before the provider's init effect, so init here too.
    initPostHogClient();

    if (isSignedIn && userId) {
      posthog.identify(userId, { is_admin: isAdmin });
      wasSignedIn.current = true;
    } else if (wasSignedIn.current) {
      // Sign-out: start a fresh anonymous id so two people on a shared
      // device are not merged into one person.
      posthog.reset();
      wasSignedIn.current = false;
    }
  }, [isLoaded, isSignedIn, userId, isAdmin]);

  return null;
}
