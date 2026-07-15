'use client'
import { useState, useRef, useEffect } from "react";
import styles from "../css/AdminNav.module.css";
import { toast } from 'sonner'
import { createBrowserSupabaseClient } from '@/lib/supabase/client'

const TABS = [
  {
    id: "dashboard",
    label: "Dashboard",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="14" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
      </svg>
    ),
  },
  {
    id: "analytics",
    label: "Analytics",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
      </svg>
    ),
  },
  {
    id: "verification",
    label: "Verification & Compliance",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        <polyline points="9 12 11 14 15 10" />
      </svg>
    ),
  },
  {
    id: "account",
    label: "Account Information",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </svg>
    ),
  },
];

const DefaultPanel = ({ label }) => (
  <div className={styles.defaultPanel}>
    <strong>{label}</strong> panel — replace with your component.
  </div>
);

function NavList({ active, setActive, collapsed, indicatorTop, indicatorHeight, tabRefs, listRef, onSelect }) {
  return (
    <ul className={styles.tabList} ref={listRef}>
      <div
        className={styles.indicator}
        style={{ top: indicatorTop, height: indicatorHeight }}
      />
      {TABS.map((tab) => (
        <li key={tab.id}>
          <button
            ref={(el) => (tabRefs.current[ tab.id ] = el)}
            className={`${styles.tab}${active === tab.id ? ` ${styles.tabActive}` : ""}`}
            onClick={() => { setActive(tab.id); onSelect?.(); }}
            title={collapsed ? tab.label : undefined}
          >
            <span className={styles.tabIcon}>{tab.icon}</span>
            {!collapsed && (
              <span className={styles.tabLabel}>{tab.label}</span>
            )}
          </button>
        </li>
      ))}
    </ul>
  );
}

const supabase = createBrowserSupabaseClient()

export default function AdminNav({ panels = {}, defaultTab = "dashboard" }) {
  const [ active, setActive ] = useState(defaultTab);
  const [ collapsed, setCollapsed ] = useState(false);
  const [ drawerOpen, setDrawerOpen ] = useState(false);
  const [ indicatorTop, setIndicatorTop ] = useState(0);
  const [ indicatorHeight, setIndicatorHeight ] = useState(0);

  const tabRefs = useRef({});
  const listRef = useRef(null);
  const drawerTabRefs = useRef({});
  const drawerListRef = useRef(null);

  const activeTab = TABS.find((t) => t.id === active);

  useEffect(() => {
    const el = tabRefs.current[ active ];
    const list = listRef.current;
    if (!el || !list) return;
    const listRect = list.getBoundingClientRect();
    const elRect = el.getBoundingClientRect();
    setIndicatorTop(elRect.top - listRect.top);
    setIndicatorHeight(elRect.height);
  }, [ active, collapsed ]);

  useEffect(() => {
    document.body.style.overflow = drawerOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [ drawerOpen ]);

  useEffect(() => {
    const channel = supabase
      .channel('admin-notifications-toast')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications' },
        (payload) => {
          const n = payload.new
          const isPositive = [ 'new_account', 'new_listing', 'slots_purchase' ].includes(n.type)

          let description = ''
          if (n.type === 'new_listing') {
            description = `${n.body?.property_name ?? 'A property'} · KSH ${Number(n.body?.price ?? 0).toLocaleString()}`
          }
          if (n.type === 'new_account') {
            description = `${n.body?.username ?? 'A user'} · ${n.body?.organization ?? ''}`
          }
          if (n.type === 'listing_deleted') {
            description = `${n.body?.property_name ?? 'A property'} was removed`
          }
          if (n.type === 'account_deleted') {
            description = `${n.body?.username ?? 'A user'} account was removed`
          }

          toast(n.title, {
            description: description
              ? `${description} — visit Account tab for details`
              : 'Visit the Account tab for details',
            duration: 6000,
            position: 'top-right',
            icon: isPositive ? '✅' : '🔴',
          })
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])

  return (
    <div className={`${styles.root}${collapsed ? ` ${styles.rootCollapsed}` : ""}`}>

      {/* ── Desktop Sidebar ── */}
      <aside className={`${styles.sidebar}${collapsed ? ` ${styles.sidebarCollapsed}` : ""}`}>
        <div className={styles.brand}>
          <svg className={styles.brandIcon} width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
            <polyline points="9 22 9 12 15 12 15 22" />
          </svg>
          {!collapsed && <span className={styles.brandName}>Golden Rentals</span>}
        </div>

        {!collapsed && <div className={styles.roleBadge}>ADMIN</div>}

        <nav className={styles.nav}>
          <NavList
            active={active}
            setActive={setActive}
            collapsed={collapsed}
            indicatorTop={indicatorTop}
            indicatorHeight={indicatorHeight}
            tabRefs={tabRefs}
            listRef={listRef}
          />
        </nav>

        <button
          className={styles.collapseBtn}
          onClick={() => setCollapsed((p) => !p)}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          <svg
            className={`${styles.collapseIcon}${collapsed ? ` ${styles.collapseIconFlipped}` : ""}`}
            width="16" height="16" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
          >
            <polyline points="15 18 9 12 15 6" />
          </svg>
          {!collapsed && <span className={styles.collapseBtnLabel}>Collapse</span>}
        </button>
      </aside>

      {/* ── Content ── */}
      <main className={styles.content}>
        <div className={styles.contentHeader}>
          <h1 className={styles.pageTitle}>{activeTab?.label}</h1>
        </div>
        <div className={styles.panelWrap}>
          {panels[ active ] ?? <DefaultPanel label={activeTab?.label} />}
        </div>
      </main>

      {/* ── Mobile floating trigger ── */}
      <button
        className={styles.mobileTrigger}
        onClick={() => setDrawerOpen(true)}
        aria-label="Open navigation"
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="3" y1="6" x2="21" y2="6" />
          <line x1="3" y1="12" x2="21" y2="12" />
          <line x1="3" y1="18" x2="21" y2="18" />
        </svg>
        {activeTab?.label}
      </button>

      {/* ── Mobile overlay ── */}
      {drawerOpen && (
        <div
          className={styles.overlay}
          onClick={() => setDrawerOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* ── Mobile bottom drawer ── */}
      <div className={`${styles.drawer}${drawerOpen ? ` ${styles.drawerOpen}` : ""}`}>
        <div className={styles.drawerHandle} />
        <div className={styles.drawerHeader}>
          <div className={styles.drawerBrand}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#f5c518" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
              <polyline points="9 22 9 12 15 12 15 22" />
            </svg>
            <span className={styles.drawerBrandName}>Golden Rentals</span>
            <span className={styles.drawerBadge}>ADMIN</span>
          </div>
          <button
            className={styles.drawerClose}
            onClick={() => setDrawerOpen(false)}
            aria-label="Close navigation"
          >
            &#x2715;
          </button>
        </div>
        <div className={styles.drawerScroll}>
          <NavList
            active={active}
            setActive={setActive}
            collapsed={false}
            indicatorTop={0}
            indicatorHeight={0}
            tabRefs={drawerTabRefs}
            listRef={drawerListRef}
            onSelect={() => setDrawerOpen(false)}
          />
        </div>
      </div>

    </div>
  );
}