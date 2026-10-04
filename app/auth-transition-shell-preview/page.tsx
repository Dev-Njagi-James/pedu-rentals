"use client";

import { useState } from "react";
import AuthTransitionShell, {
  type AuthTransitionVariant,
} from "../(auth)/Auth/transitionShell";

export default function AuthTransitionPreview() {
  const [variant, setVariant] = useState<AuthTransitionVariant>("callback");

  const finalizing = variant === "finalizing";

  return (
    <>
      <div
        style={{
          position: "fixed",
          zIndex: 10,
          bottom: 16,
          left: "50%",
          transform: "translateX(-50%)",
          display: "flex",
          gap: 8,
          padding: 8,
          borderRadius: 999,
          background: "white",
          boxShadow: "0 2px 16px #0003",
        }}>
        <button onClick={() => setVariant("callback")}>Callback</button>
        <button onClick={() => setVariant("finalizing")}>Finalizing</button>
      </div>

      <AuthTransitionShell
        variant={variant}
        eyebrow={finalizing ? "Account setup" : "For landlords & agents"}
        heading={
          finalizing ? "Finalizing your account." : "Signing you in securely."
        }
        description={
          finalizing
            ? "Your sign-in is confirmed. We’re syncing your profile and preparing your Pedu Rentals lister dashboard."
            : "One quick security check, then we’ll get your Pedu Rentals lister account ready."
        }
        status={finalizing ? "Finalizing your account…" : "Signing you in…"}
        statusDetail={
          finalizing
            ? "Your dashboard is the next stop."
            : "Your secure sign-in is in progress."
        }
      />
    </>
  );
}
