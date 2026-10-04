"use client";
import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useClerk } from "@clerk/nextjs";
import AuthTransitionShell from "@/app/(auth)/Auth/transitionShell";


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
    <AuthTransitionShell
      variant="callback"
      eyebrow="For landlords & agents"
      heading="Signing you in securely."
      description="One quick security check, then we’ll get your Pedu Rentals lister account ready."
      status="Signing you in…"
      statusDetail="Your secure sign-in is in progress."
    />
  );
}
