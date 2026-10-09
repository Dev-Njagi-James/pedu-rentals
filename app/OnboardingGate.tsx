"use client";

import { useUser } from "@clerk/nextjs";
import OnboardingModal from "./OnboardingModal/onBoarding";



export default function OnboardingGate() {
  const { isLoaded, isSignedIn } = useUser();

  // Wait for Clerk, so a signed-in visitor isn't briefly treated as a guest.
  if (!isLoaded) return null;

  return <OnboardingModal isAuthenticated={Boolean(isSignedIn)} />;
}
