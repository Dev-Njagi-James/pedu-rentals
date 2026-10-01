// app/payment/return/page.jsx
"use client";
import { useEffect } from "react";

export default function PaymentReturn() {
  useEffect(() => {
    if (window.parent !== window) {
      window.parent.postMessage(
        { source: "pedu-payment", type: "returned" },
        window.location.origin,
      );
    } else {
      window.location.replace("/"); // opened top-level (3DS fallback): set your lister dashboard path
    }
  }, []);
  return <p style={{ padding: 24 }}>Confirming payment…</p>;
}
