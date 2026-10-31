"use client";

import { useEffect } from "react";
import styles from "../css/CheckoutPopup.module.css";

function remainingLabel(listing) {
  const raw = listing.subscriptions_table;
  const subs = Array.isArray(raw) ? raw : raw ? [raw] : [];
  const active = subs.find(
    (s) => s.status === "active" && new Date(s.expires_at) > new Date(),
  );
  if (!active) return null;
  const ms = new Date(active.expires_at) - new Date();
  const days = Math.floor(ms / 86_400_000);
  const hours = Math.floor((ms % 86_400_000) / 3_600_000);
  return days > 0 ? `${days}d ${hours}h` : `${hours}h`;
}

export default function DeleteConfirm({
  listing,
  deleting,
  onConfirm,
  onCancel,
}) {
  const isPaid = listing.payment_status === "paid";
  const remaining = isPaid ? remainingLabel(listing) : null;

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape" && !deleting) onCancel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [deleting, onCancel]);

  return (
    <div
      className={styles.confirmOverlay}
      style={{ fontFamily: "var(--font-geist-sans)" }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !deleting) onCancel();
      }}>
      <div className={styles.confirmPopup}>
        <p className={styles.confirmTitle}>Delete this listing?</p>
        <p className={styles.confirmBody}>
          <strong>{listing.listing_name}</strong> and its photos and video will
          be permanently removed.{" "}
          {isPaid
            ? remaining
              ? `This listing has ${remaining} left on its paid plan. Deleting it forfeits that time, and no refund is issued.`
              : "This cannot be undone."
            : "This cannot be undone."}
        </p>
        <div className={styles.confirmActions}>
          <button
            className={styles.confirmDelist}
            style={{ fontFamily: "inherit" }}
            onClick={onConfirm}
            disabled={deleting}>
            {deleting ? "Deleting…" : "Delete listing"}
          </button>
          <button
            className={styles.confirmContinue}
            style={{ fontFamily: "inherit" }}
            onClick={onCancel}
            disabled={deleting}>
            Keep listing
          </button>
        </div>
      </div>
    </div>
  );
}
