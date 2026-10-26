"use client";

import { useState, useEffect } from "react";
import { GoogleOneTap } from "@clerk/nextjs";

export default function SafeGoogleOneTap() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <GoogleOneTap
      signInForceRedirectUrl="/auth-complete"
      signUpForceRedirectUrl="/auth-complete"
    />
  );
}
