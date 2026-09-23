"use client";

import { useState} from "react";
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
  const [sidebarHovered, setSidebarHovered] = useState(false);

  const currentActive = controlledTab ?? active;

  const selectTab = (id) => {
    if (disabled) return;

    setActive(id);
    onTabChange?.(id);
  };

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
