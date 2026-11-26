"use client";

import { useEffect, useRef } from "react";
import { mountUsageWidget } from "@stravon/scale-sdk/widget";

export default function UsageWidget() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;

    const handle = mountUsageWidget(ref.current, {
      fetchUsage: async () => {
        const res = await fetch("/api/v1/admin/storage-usage", { cache: "no-store" });
        if (!res.ok) {
          throw new Error(`Could not load usage (${res.status})`);
        }
        return res.json();
      },
      onUpgrade: () => {
        const table = document.getElementById("pricing-table");
        if (table) {
          table.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      },
    });

    return () => handle.destroy();
  }, []);

  return <div ref={ref} />;
}