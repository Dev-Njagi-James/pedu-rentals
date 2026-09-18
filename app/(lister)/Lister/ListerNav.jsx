"use client";

import { useState, useEffect, useRef } from "react";
import styles from "./css/ListerNav.module.css";

const TABS = [
  { id: "listings", label: "Listings", iconName: "building-06" },
  { id: "add", label: "Add Listing", iconName: "add-circle" },
  { id: "analytics", label: "Analytics", iconName: "analytics-up" },
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

const ChevronUp = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true">
    <path d="M18 15l-6-6-6 6" />
  </svg>
);

const ChevronDown = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true">
    <path d="M6 9l6 6 6-6" />
  </svg>
);

export default function ListerNav({
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
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [sidebarHovered, setSidebarHovered] = useState(false);

  const sheetRef = useRef(null);

  const currentActive = controlledTab ?? active;
  const activeTabData = [...TABS, ...UTILITY_TABS].find(
    (tab) => tab.id === currentActive,
  );

  // Lock body scroll when the mobile sheet is open.
  useEffect(() => {
    document.body.style.overflow = drawerOpen ? "hidden" : "";

    return () => {
      document.body.style.overflow = "";
    };
  }, [drawerOpen]);

  // Close drawer on resize to desktop.
  useEffect(() => {
    const handler = () => {
      if (window.innerWidth > 768) setDrawerOpen(false);
    };

    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);

  const selectTab = (id) => {
    if (disabled) return;

    setActive(id);
    onTabChange?.(id);
    setDrawerOpen(false);
  };

  const close = () => setDrawerOpen(false);

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
        {/* ── MOBILE TRIGGER PILL ── */}
        <div className={styles.mobileBar}>
          <button
            type="button"
            className={styles.mobileBarBtn}
            onClick={() => !disabled && setDrawerOpen((previous) => !previous)}
            disabled={disabled}
            aria-expanded={drawerOpen}
            aria-controls="mobile-navigation-drawer">
            <span className={styles.mobileBarIcon}>
              <HugeIcon name={activeTabData.iconName} size={18} />
            </span>
            <span className={styles.mobileBarLabel}>{activeTabData.label}</span>
            <span className={styles.mobileBarChevron}>
              {drawerOpen ? <ChevronDown /> : <ChevronUp />}
            </span>
          </button>
        </div>

        {/* ── BACKDROP — mobile only ── */}
        <div
          className={`${styles.backdrop} ${drawerOpen ? styles.backdropVisible : ""}`}
          onClick={close}
          aria-hidden="true"
        />

        {/* ── BOTTOM SHEET — mobile only ── */}
        <div
          id="mobile-navigation-drawer"
          ref={sheetRef}
          className={`${styles.drawer} ${drawerOpen ? styles.drawerOpen : ""} ${disabled ? styles.drawerDisabled : ""}`}
          role="dialog"
          aria-modal="true"
          aria-label="Navigation menu">
          <div className={styles.drawerHandle} />

          {[...TABS, ...UTILITY_TABS].map(({ id, label, iconName }) => (
            <button
              key={id}
              type="button"
              className={`${styles.drawerItem} ${currentActive === id ? styles.drawerItemActive : ""}`}
              onClick={() => selectTab(id)}>
              <span className={styles.drawerIcon}>
                <HugeIcon name={iconName} size={18} />
              </span>
              <span>{label}</span>
            </button>
          ))}
        </div>

        {/* panel */}
        <div className={styles.panelWrap}>
          {panels[currentActive] ?? (
            <DefaultPanel label={activeTabData.label} />
          )}
        </div>
      </div>
    </div>
  );
}
