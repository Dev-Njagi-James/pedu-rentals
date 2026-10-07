"use client";
import { useEffect, useState } from "react";
import styles from "./css/nav.module.css";
import {
  useContactAccess,
  loadAccess,
  getRemainingMs,
} from "@/lib/contact/accessStore";
import { format } from "./AccessButton";

export default function AccessBadge() {
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

  if (!active) return null;

  return (
    <span className={styles.accessBadge} title="Subscription time remaining">
      <span className={styles.accessBadgeDot} aria-hidden="true" />
      {format(remaining)}
    </span>
  );
}
