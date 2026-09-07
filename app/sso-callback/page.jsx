"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useClerk, useAuth } from "@clerk/nextjs";

export default function SSOCallback() {
  const router = useRouter();
  const { handleRedirectCallback } = useClerk();
  const { isLoaded, isSignedIn } = useAuth();

  useEffect(() => {
    handleRedirectCallback({}).catch((err) => {
      console.error("SSO callback error:", err);
    });
  }, [handleRedirectCallback]);

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;

    fetch("/api/v1/auth/sync", { method: "POST" })
      .then((res) => {
        if (!res.ok) {
          router.push("/Auth?error=sync_failed");
          return;
        }
        router.push("/Lister");
      })
      .catch(() => router.push("/Auth?error=sync_failed"));
  }, [isLoaded, isSignedIn, router]);

  return <p>Signing you in…</p>;
}
