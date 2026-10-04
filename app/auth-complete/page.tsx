"use client";
import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import { invalidateMyListingsCache } from "@/lib/cache/myListingsCache";
import { invalidateAnalyticsCache } from "@/lib/cache/analyticsCache";

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

  return <p>Finishing sign-in…</p>;
}
