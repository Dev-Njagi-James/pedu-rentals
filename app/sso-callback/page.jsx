"use client";
import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useClerk } from "@clerk/nextjs";

export default function SSOCallback() {
  const router = useRouter();
  const { handleRedirectCallback } = useClerk();
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    handleRedirectCallback({
      signInForceRedirectUrl: "/auth-complete",
      signUpForceRedirectUrl: "/auth-complete",
    }).catch((err) => {
      console.error("SSO callback error:", err);
      router.push("/Auth?error=oauth_failed");
    });
  }, [handleRedirectCallback, router]);

  return (
    <>
      <p>Signing you in…</p>
      {/* Clerk bot protection mounts its CAPTCHA widget here. */}
      <div id="clerk-captcha" />
    </>
  );
}
