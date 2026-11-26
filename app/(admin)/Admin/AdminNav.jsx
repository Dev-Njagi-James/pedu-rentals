"use client";

import { useState, useRef, useEffect } from "react";
import { toast } from 'sonner'
import styles from "./css/AdminNav.module.css";

const TABS = [
  { id: "overview", label: "Overview", iconName: "dashboard-circle" },
  { id: "transactions", label: "Transactions", iconName: "money-exchange-02" },
  { id: "listings", label: "Listings", iconName: "building-06" },
  { id: "account", label: "Account", iconName: "user-circle" },
  { id: "pricing", label: "Pricing", iconName: "dollar-circle" },
];

const UTILITY_TABS = [{ id: "help", label: "Help", iconName: "help-circle" }];

const DefaultPanel = ({ label }) => (
  <div
    style={{
      padding: "32px 24px",
      background: "#fafafa",
      borderRadius: 8,
      border: "1px dashed #ddd",
      color: "#666",
      fontSize: 14,
    }}>
    <strong>{label}</strong> panel — replace with your component.
  </div>
);

/* Hugeicons web icon font — stylesheet loaded globally in app/layout.jsx
   (https://cdn.hugeicons.com/font/hgi-stroke-rounded.css).
   Renders one glyph given its icon name; size via font-size. */
const HugeIcon = ({ name, size = 20 }) => (
  <span
    className={`hgi-stroke hgi-${name}`}
    style={{ fontSize: size, lineHeight: 1 }}
    aria-hidden="true"
  />
);

export default function AdminNav({
  panels = {},
  defaultTab = "listings",
  activeTab: controlledTab,
  onTabChange,
  orgImage,
  orgName,
  onOrgImageChange,
  disabled = false,
}) {
  const [active, setActive] = useState(defaultTab);
  const [sidebarHovered, setSidebarHovered] = useState(false);

  const currentActive = controlledTab ?? active;

  const selectTab = (id) => {
    if (disabled) return;

    setActive(id);
    onTabChange?.(id);
  };

  const lastSeenIdRef = useRef(0);
  const initializedRef = useRef(false);

  useEffect(() => {
    let cancelled = false;

    const toastRow = (n) => {
      const isPositive = ['new_account', 'new_listing', 'payment_completed'].includes(n.type)

      let description = ''
      if (n.type === 'new_listing') {
        description = `${n.body?.property_name ?? 'A property'} · KSH ${Number(n.body?.price ?? 0).toLocaleString()}`
      }
      if (n.type === 'new_account') {
        description = `${n.body?.username ?? 'A user'} · ${n.body?.organization ?? ''}${n.body?.account_type ? ` · ${n.body.account_type}` : ''}`
      }
      if (n.type === 'payment_completed') {
        description = `${n.body?.property_name ?? 'A property'} · ${n.body?.plan ?? ''} · KES ${Number(n.body?.amount_kes ?? 0).toLocaleString('en-KE')}`
      }
      if (n.type === 'listing_deleted') {
        description = `${n.body?.property_name ?? 'A property'} was removed`
      }
      if (n.type === 'account_deleted') {
        description = `${n.body?.username ?? 'A user'} account was removed`
      }

      toast(n.title, {
        description: description || undefined,
        duration: 6000,
        position: 'top-right',
        icon: isPositive ? '✅' : '🔴',
      })
    }

    const fetchNewest = async () => {
      try {
        const res = await fetch('/api/adminRo/notifications?limit=1')
        if (!res.ok || cancelled) return
        const json = await res.json()
        const rows = json?.data ?? []
        lastSeenIdRef.current = rows.length ? (rows[0].id ?? 0) : 0
        initializedRef.current = true
      } catch {
        // ignore
      }
    }

    const poll = async () => {
      if (!initializedRef.current) {
        await fetchNewest()
        return
      }
      if (document.visibilityState !== 'visible') return
      try {
        const res = await fetch(`/api/adminRo/notifications?after_id=${lastSeenIdRef.current}`)
        if (!res.ok || cancelled) return
        const json = await res.json()
        const rows = json?.data ?? []
        if (rows.length === 0) return
        for (const n of rows) toastRow(n)
        const maxId = rows.reduce((m, r) => (r.id > m ? r.id : m), lastSeenIdRef.current)
        lastSeenIdRef.current = maxId
      } catch {
        // ignore, retry next tick
      }
    }

    fetchNewest()

    const interval = setInterval(poll, 30000)

    const onVisible = () => {
      if (document.visibilityState === 'visible') poll()
    }
    document.addEventListener('visibilitychange', onVisible)

    return () => {
      cancelled = true
      clearInterval(interval)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, []);

  return (
    <div className={styles.root}>
      {/* ── DESKTOP / TABLET SIDEBAR ── */}
      <aside
        className={`${styles.sidebar} ${sidebarHovered ? styles.sidebarExpanded : ""} ${disabled ? styles.sidebarDisabled : ""}`}
        onMouseEnter={() => setSidebarHovered(true)}
        onMouseLeave={() => setSidebarHovered(false)}
        onFocus={() => setSidebarHovered(true)}
        onBlur={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget)) {
            setSidebarHovered(false);
          }
        }}>
        {/* main tabs */}
        <nav className={styles.nav} aria-label="Main navigation">
          {TABS.map(({ id, label, iconName }) => (
            <button
              key={id}
              type="button"
              className={`${styles.navItem} ${currentActive === id ? styles.navItemActive : ""}`}
              onClick={() => selectTab(id)}
              aria-label={label}
              title={label}
              aria-current={currentActive === id ? "page" : undefined}>
              <span className={styles.navIcon}>
                <HugeIcon name={iconName} size={20} />
              </span>
              <span className={styles.navLabel}>{label}</span>
            </button>
          ))}
        </nav>

        {/* utility tabs — pinned to bottom */}
        <nav className={styles.navUtility} aria-label="Utility navigation">
          {UTILITY_TABS.map(({ id, label, iconName }) => (
            <button
              key={id}
              type="button"
              className={`${styles.navItem} ${currentActive === id ? styles.navItemActive : ""}`}
              onClick={() => selectTab(id)}
              aria-label={label}
              title={label}
              aria-current={currentActive === id ? "page" : undefined}>
              <span className={styles.navIcon}>
                <HugeIcon name={iconName} size={20} />
              </span>
              <span className={styles.navLabel}>{label}</span>
            </button>
          ))}
        </nav>
      </aside>

      {/* ── CONTENT ── */}
      <div className={styles.content}>
        {/* panel */}
        <div className={styles.panelWrap}>
          {panels[currentActive] ?? <DefaultPanel label={currentActive} />}
        </div>
      </div>
    </div>
  );
}
