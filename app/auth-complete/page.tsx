"use client";
import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import { invalidateMyListingsCache } from "@/lib/cache/myListingsCache";
import { invalidateAnalyticsCache } from "@/lib/cache/analyticsCache";
import AuthTransitionShell from "@/app/(auth)/Auth/transitionShell";


// OAuth landing page: runs the account sync once the Clerk session is active,
// then enters the app. Mirrors what AuthForm does after OTP verification.
export default function AuthComplete() {
  const router = useRouter();
  const { isLoaded, isSignedIn } = useAuth();
  const started = useRef(false);

  useEffect(() => {
    if (!isLoaded) return;

    if (!isSignedIn) {
      router.replace("/Auth");
      return;
    }

    if (started.current) return;
    started.current = true;

    fetch("/api/v1/auth/sync", { method: "POST" })
      .then((res) => {
        if (!res.ok) {
          router.replace("/Auth?error=sync_failed");
          return;
        }
        invalidateAnalyticsCache();
        invalidateMyListingsCache();
        router.replace("/Lister");
      })
      .catch(() => router.replace("/Auth?error=sync_failed"));
  }, [isLoaded, isSignedIn, router]);

  return(
    <AuthTransitionShell
      variant="finalizing"
      eyebrow="Account setup"
      heading="Finalizing your account."
      description="Your sign-in is confirmed. We’re syncing your profile and preparing your Pedu Rentals lister dashboard."
      status="Finalizing your account…"
      statusDetail="Your dashboard is the next stop."
    />
  );;
}
