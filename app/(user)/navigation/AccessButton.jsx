"use client";
import { useEffect, useState } from "react";
import styles from "./css/nav.module.css";
import {
  useContactAccess,
  loadAccess,
  activateWithToast,
  getRemainingMs,
} from "@/lib/contact/accessStore";

export function format(ms) {
  const t = Math.max(0, Math.ceil(ms / 1000));
  const d = Math.floor(t / 86400);
  const h = Math.floor((t % 86400) / 3600);
  const m = Math.floor((t % 3600) / 60);
  const s = t % 60;
  const p = (n) => String(n).padStart(2, "0");
  if (d > 0) return `${d}d ${p(h)}:${p(m)}:${p(s)}`;
  if (h > 0) return `${h}:${p(m)}:${p(s)}`;
  return `${p(m)}:${p(s)}`;
}

export default function AccessButton({ onDone }) {
  const access = useContactAccess();
  const [, tick] = useState(0);

  useEffect(() => {
    loadAccess();
  }, []);

  const remaining = getRemainingMs(access);
  const active = remaining > 0;

  useEffect(() => {
    if (!active) return undefined;
    const id = setInterval(() => tick((n) => n + 1), 1000);
    return () => clearInterval(id);
  }, [active]);

  if (!access.loaded) return null;

  if (active) {
    return (
      <button
        type="button"
        className={`${styles.accessButton} ${styles.accessActive}`}
        disabled>
        {format(remaining)}
      </button>
    );
  }

  return (
    <button
      type="button"
      className={styles.accessButton}
      disabled={access.activating || Boolean(access.checkout)}
      onClick={async () => {
        const r = await activateWithToast();
        if (r.ok) onDone?.();
      }}>
      {access.activating || access.checkout
        ? "PROCESSING…"
        : "ACTIVATE SUBSCRIPTION"}
    </button>
  );
}
