"use client";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import styles from "./css/AccessCheckoutModal.module.css";
import {
  useContactAccess,
  closeCheckout,
  checkoutReturned,
} from "@/lib/contact/accessStore";

export default function AccessCheckoutModal() {
  const { checkout } = useContactAccess();
  const [mounted, setMounted] = useState(false);
  const open = Boolean(checkout);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return undefined;

    const onMessage = (e) => {
      if (e.origin !== window.location.origin) return;
      if (e.data?.source !== "pedu-payment") return;
      if (e.data.type === "returned") checkoutReturned();
      if (e.data.type === "cancelled") closeCheckout({ cancelled: true });
    };
    window.addEventListener("message", onMessage);

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      window.removeEventListener("message", onMessage);
      document.body.style.overflow = prevOverflow;
    };
  }, [open]);

  if (!mounted || !checkout) return null;

  return createPortal(
    <div
      className={styles.overlay}
      role="dialog"
      aria-modal="true"
      aria-label="Pay for subscription">
      <div className={styles.modal}>
        <button
          type="button"
          className={styles.close}
          onClick={() => closeCheckout()}
          aria-label="Close payment window">
          ×
        </button>
        {checkout.phase === "verifying" ? (
          <div className={styles.verifying}>
            <span className={styles.spinner} aria-hidden="true" />
            Confirming payment…
          </div>
        ) : (
          <iframe
            src={checkout.url}
            title="Pesapal checkout"
            className={styles.frame}
            allow="payment"
          />
        )}
      </div>
    </div>,
    document.body,
  );
}
