// app/payment/cancelled/page.jsx
"use client";
import { useEffect } from "react";

export default function PaymentCancelled() {
  useEffect(() => {
    if (window.parent !== window) {
      window.parent.postMessage(
        { source: "pedu-payment", type: "cancelled" },
        window.location.origin,
      );
    } else {
      window.location.replace("/");
    }
  }, []);
  return <p style={{ padding: 24 }}>Payment cancelled.</p>;
}
