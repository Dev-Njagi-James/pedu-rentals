'use client';
import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import styles from "./css/ListerNav.module.css";

const ListingsIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
    <polyline points="9 22 9 12 15 12 15 22" />
  </svg>
);
const AnalyticsIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" />
    <line x1="6" y1="20" x2="6" y2="14" /><line x1="2" y1="20" x2="22" y2="20" />
  </svg>
);
const AddIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="16" /><line x1="8" y1="12" x2="16" y2="12" />
  </svg>
);
const AccountIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="8" r="3" /><path d="M3 19c0-4 3.6-7 9-7s9 3 9 7" />
    <circle cx="12" cy="8" r="3" />
  </svg>
);
const ChevronUp = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 15l-6-6-6 6" />
  </svg>
);
const ChevronDown = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6 9l6 6 6-6" />
  </svg>
);
const ChevronLeft = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M15 18l-6-6 6-6" />
  </svg>
);
const ChevronRight = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 18l6-6-6-6" />
  </svg>
);
const CameraIcon = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
    <circle cx="12" cy="13" r="4" />
  </svg>
);

const TABS = [
  { id: 'listings', label: 'Dashboard', Icon: ListingsIcon },
  { id: 'add', label: 'Add A Listing', Icon: AddIcon },
  { id: 'analytics', label: 'Analysis', Icon: AnalyticsIcon },
  { id: 'account', label: 'Account Management', Icon: AccountIcon },
];

const DefaultPanel = ({ label }) => (
  <div style={{ padding: '32px 24px', background: '#fafafa', borderRadius: 8, border: '1px dashed #ddd', color: '#666', fontSize: 14 }}>
    <strong>{label}</strong> panel — replace with your component.
  </div>
);

export default function ListerNav({
  panels = {},
  defaultTab = 'listings',
  activeTab: controlledTab,
  onTabChange,
  orgImage,
  orgName,
  onOrgImageChange,
}) {
  const [active, setActive]                   = useState(defaultTab);
  const [drawerOpen, setDrawerOpen]           = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [localOrgImage, setLocalOrgImage]     = useState(orgImage ?? null);

  const sheetRef    = useRef(null);
  const fileInputRef = useRef(null);

  const currentActive = controlledTab ?? active;
  const activeTabData = TABS.find(t => t.id === currentActive);

  // revoke previous blob URL on change to avoid memory leaks
  useEffect(() => {
    return () => {
      if (localOrgImage?.startsWith('blob:')) URL.revokeObjectURL(localOrgImage);
    };
  }, [localOrgImage]);

  // lock body scroll when sheet is open
  useEffect(() => {
    document.body.style.overflow = drawerOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [drawerOpen]);

  // close drawer on resize to desktop
  useEffect(() => {
    const handler = () => { if (window.innerWidth > 768) setDrawerOpen(false); };
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);

  const selectTab = (id) => {
    setActive(id);
    onTabChange?.(id);
    setDrawerOpen(false);
  };

  const close = () => setDrawerOpen(false);

  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setLocalOrgImage(url);
    onOrgImageChange?.(file, url);
    // reset so same file can be re-selected
    e.target.value = '';
  };

  const openFilePicker = () => fileInputRef.current?.click();

  return (
    <div className={styles.root}>

      {/* single hidden file input — shared by sidebar + sheet */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleImageChange}
        style={{ display: 'none' }}
      />

      {/* ── DESKTOP / TABLET SIDEBAR ── */}
      <aside className={`${styles.sidebar} ${sidebarCollapsed ? styles.sidebarCollapsed : ''}`}>

        {/* identity */}
        <div className={styles.identity}>

          {/* avatar upload — TikTok style */}
          <div className={styles.avatarRoot}>
            <div className={styles.identityImageWrap}>
              <button className={styles.avatarBtn} onClick={openFilePicker} aria-label="Upload logo">
                {localOrgImage ? (
                  <Image src={localOrgImage} alt={orgName ?? 'Organisation'} fill className={styles.identityImage} sizes="56px" />
                ) : (
                  <div className={styles.identityImagePlaceholder}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                      <polyline points="9 22 9 12 15 12 15 22" />
                    </svg>
                  </div>
                )}
                {/* hover overlay */}
                <div className={styles.avatarOverlay}>
                  <CameraIcon size={18} />
                </div>
              </button>
            </div>
            {/* always-visible badge — outside the circle's overflow clip */}
            <div className={styles.avatarBadge}>
              <CameraIcon size={9} />
            </div>
          </div>

          {orgName && <span className={styles.identityName}>{orgName}</span>}
        </div>

        <div className={styles.identityDivider} />

        <nav className={styles.nav}>
          {TABS.map(({ id, label, Icon }) => (
            <button
              key={id}
              className={`${styles.navItem} ${currentActive === id ? styles.navItemActive : ''}`}
              onClick={() => selectTab(id)}
            >
              <span className={styles.navIcon}><Icon /></span>
              <span className={styles.navLabel}>{label}</span>
            </button>
          ))}
        </nav>

        {/* collapse toggle */}
        <button
          className={styles.sidebarToggle}
          onClick={() => setSidebarCollapsed(p => !p)}
          aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {sidebarCollapsed ? <ChevronRight /> : <ChevronLeft />}
        </button>

      </aside>

      {/* ── CONTENT ── */}
      <div className={styles.content}>

        {/* ── MOBILE TRIGGER PILL ── */}
        <div className={styles.mobileBar}>
          <button
            className={styles.mobileBarBtn}
            onClick={() => setDrawerOpen(p => !p)}
          >
            <span className={styles.mobileBarIcon}><activeTabData.Icon /></span>
            <span className={styles.mobileBarLabel}>{activeTabData.label}</span>
            <span className={styles.mobileBarChevron}>
              {drawerOpen ? <ChevronDown /> : <ChevronUp />}
            </span>
          </button>
        </div>

        {/* ── BACKDROP — mobile only ── */}
        <div
          className={`${styles.backdrop} ${drawerOpen ? styles.backdropVisible : ''}`}
          onClick={close}
          aria-hidden="true"
        />

        {/* ── BOTTOM SHEET — mobile only ── */}
        <div
          ref={sheetRef}
          className={`${styles.drawer} ${drawerOpen ? styles.drawerOpen : ''}`}
          role="dialog"
          aria-modal="true"
          aria-label="Navigation menu"
        >
          <div className={styles.drawerHandle} />

          {/* identity: centred, stacked */}
          <div className={styles.sheetIdentity}>

            {/* avatar upload — TikTok style (larger) */}
            <div className={styles.sheetAvatarRoot}>
              <div className={styles.sheetImageWrap}>
                <button className={styles.avatarBtn} onClick={openFilePicker} aria-label="Upload logo">
                  {localOrgImage ? (
                    <Image src={localOrgImage} alt={orgName ?? 'Organisation'} fill className={styles.sheetImage} sizes="100px" />
                  ) : (
                    <div className={styles.sheetImagePlaceholder}>
                      <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                        <polyline points="9 22 9 12 15 12 15 22" />
                      </svg>
                    </div>
                  )}
                  <div className={styles.avatarOverlay}>
                    <CameraIcon size={28} />
                  </div>
                </button>
              </div>
              <div className={`${styles.avatarBadge} ${styles.avatarBadgeSheet}`}>
                <CameraIcon size={12} />
              </div>
            </div>

            {orgName && <span className={styles.sheetName}>{orgName}</span>}
          </div>

          <div className={styles.sheetDivider} />

          {TABS.map(({ id, label, Icon }) => (
            <button
              key={id}
              className={`${styles.drawerItem} ${currentActive === id ? styles.drawerItemActive : ''}`}
              onClick={() => selectTab(id)}
            >
              <span className={styles.drawerIcon}><Icon /></span>
              <span>{label}</span>
            </button>
          ))}
        </div>

        {/* panel */}
        <div className={styles.panelWrap}>
          {panels[currentActive] ?? <DefaultPanel label={activeTabData.label} />}
        </div>

      </div>
    </div>
  );
}