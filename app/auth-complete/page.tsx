"use client";
import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import { invalidateMyListingsCache } from "@/lib/cache/myListingsCache";
import { invalidateAnalyticsCache } from "@/lib/cache/analyticsCache";
import AuthTransitionShell from "@/app/(auth)/Auth/transitionShell";
import { useUser } from "@clerk/nextjs";
import { homeForRole } from "@/lib/auth/routes";

// OAuth landing page: runs the account sync once the Clerk session is active,
// then enters the app. Mirrors what AuthForm does after OTP verification.
export default function AuthComplete() {
  const router = useRouter();
  const { isLoaded, isSignedIn, user } = useUser();
  const started = useRef(false);

  useEffect(() => {
    if (!isLoaded) return;

    if (!isSignedIn) {
      router.replace("/Auth");
      return;
    }

    if (started.current) return;
    started.current = true;

    let storedType = null;
    try {
      storedType = sessionStorage.getItem("pedu_account_type");
    } catch {}

    fetch("/api/v1/auth/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        accountType: storedType === "lister" ? "lister" : "user",
      }),
    })
      .then(async (res) => {
        if (!res.ok) {
          router.replace("/Auth?error=sync_failed");
          return;
        }
        const data = await res.json().catch(() => null);
        try {
          sessionStorage.removeItem("pedu_account_type");
        } catch {}
        invalidateAnalyticsCache();
        invalidateMyListingsCache();
        await user?.reload();
        router.replace(homeForRole(data?.role));
      })

      .catch(() => router.replace("/Auth?error=sync_failed"));
  }, [isLoaded, isSignedIn, user, router]);

  return (
    <AuthTransitionShell
      variant="finalizing"
      eyebrow="Account setup"
      heading="Finalizing your account."
      description="Your sign-in is confirmed. We’re syncing your profile and preparing your Pedu Rentals lister dashboard."
      status="Finalizing your account…"
      statusDetail="Your dashboard is the next stop."
    />
  );
}
