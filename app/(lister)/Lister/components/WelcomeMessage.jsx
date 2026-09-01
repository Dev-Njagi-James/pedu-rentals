'use client';

import { useState, useEffect, useRef, useId } from 'react';
import { createBrowserSupabaseClient } from '@/lib/supabase/client';
import styles from '../css/WelcomeMessage.module.css';

const supabase = createBrowserSupabaseClient();

const UNREAD_NOTIFICATIONS = 2;

export default function WelcomeBanner() {
  const [displayName, setDisplayName] = useState('');
  const [orgName, setOrgName] = useState('');
  const [userInitial, setUserInitial] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const [wsExpanded, setWsExpanded] = useState(false);
  const [accountExpanded, setAccountExpanded] = useState(false);
  const [insightsActive, setInsightsActive] = useState(false);
  const [boardsActive, setBoardsActive] = useState(false);
  const [bellActive, setBellActive] = useState(false);
  const [unreadCount, setUnreadCount] = useState(UNREAD_NOTIFICATIONS);
  const [searchForced, setSearchForced] = useState(false);

  const searchRef = useRef(null);
  const searchToggleRef = useRef(null);
  const searchInputRef = useRef(null);

  const panelId = useId();

  useEffect(() => {
    const init = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const res = await fetch('/api/account');
        const json = await res.json();

        setDisplayName(json.username || '');
        setOrgName(json.organisationName || '');
        setUserInitial((json.username || json.organisationName || '').charAt(0).toUpperCase());
      } catch { }
    };
    init();
  }, []);

  // Search toggle at narrow widths: reveal the field below the bar and focus it.
  useEffect(() => {
    if (searchForced) {
      searchInputRef.current?.focus();
    }
  }, [searchForced]);

  // Click outside closes the forced-open search.
  useEffect(() => {
    if (!searchForced) return;

    function handleClick(e) {
      if (
        searchRef.current &&
        !searchRef.current.contains(e.target) &&
        searchToggleRef.current &&
        !searchToggleRef.current.contains(e.target)
      ) {
        setSearchForced(false);
      }
    }

    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, [searchForced]);

  return (
    <div className={styles.topbarWrap}>
      <div className={styles.topbar}>
        {/* ── Workspace switcher ── */}
        <button
          type="button"
          className={styles.workspace}
          aria-expanded={wsExpanded}
          aria-haspopup="true"
          onClick={() => setWsExpanded((v) => !v)}
        >
          <div className={styles.wsMark}>
            <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round">
              <path d="M4 17l6-6-6-6M12 19h8" />
            </svg>
          </div>
          <div className={styles.wsText}>
            <div className={styles.wsName}>{displayName}</div>
            <div className={styles.wsPlan}>{orgName}</div>
          </div>
          <svg
            className={styles.wsChevron}
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M8 9l4-4 4 4M8 15l4 4 4-4" />
          </svg>
        </button>

        {/* ── Section title ── */}
        <div className={styles.sectionTitle}>Listings</div>

        {/* ── Search ── */}
        <div
          ref={searchRef}
          className={`${styles.search} ${searchForced ? styles.searchForced : ''}`}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="7" />
            <path d="M21 21l-4.35-4.35" />
          </svg>
          <input ref={searchInputRef} type="text" placeholder="e.g Getrude Heights" hint=""/>
        </div>

        <button
          type="button"
          ref={searchToggleRef}
          className={styles.searchToggle}
          aria-label="Open search"
          onClick={() => setSearchForced((v) => !v)}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="7" />
            <path d="M21 21l-4.35-4.35" />
          </svg>
        </button>

        {/* ── Nav icons ── */}
        <div className={styles.navIcons}>
          <button
            type="button"
            data-tip="Insights"
            className={`${styles.iconBtn} ${insightsActive ? styles.isActive : ''}`}
            onClick={() => setInsightsActive((v) => !v)}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 2a5 5 0 015 5c0 3-2 4-2 7H9c0-3-2-4-2-7a5 5 0 015-5z" />
              <path d="M9 18h6" />
            </svg>
          </button>
          
          <button
            type="button"
            data-tip="Notifications"
            className={`${styles.iconBtn} ${bellActive ? styles.isActive : ''}`}
            onClick={() => {
              setUnreadCount(0); // clears the unread badge
              setBellActive((v) => !v);
            }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 8a6 6 0 00-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.73 21a2 2 0 01-3.46 0" />
            </svg>
            <div className={`${styles.badge} ${unreadCount === 0 ? styles.isCleared : ''}`}>
              {unreadCount}
            </div>
          </button>
        </div>

        <div className={styles.navDivider} />

        {/* ── Mobile hamburger ── */}
        <button
          type="button"
          className={styles.menuBtn}
          aria-expanded={menuOpen}
          aria-controls={panelId}
          aria-label="Open menu"
          onClick={() => setMenuOpen((v) => !v)}
        >
          <svg
            className={styles.iconBurger}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M4 6h16M4 12h16M4 18h16" />
          </svg>
          <svg
            className={styles.iconClose}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>

        {/* ── Account ── */}
        <button
          type="button"
          className={styles.account}
          aria-expanded={accountExpanded}
          aria-haspopup="true"
          onClick={() => setAccountExpanded((v) => !v)}
        >
          <div className={styles.navAvatar}>
            {userInitial}
            <div className={styles.status} />
          </div>
          <svg
            className={styles.navCaret}
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M6 9l6 6 6-6" />
          </svg>
        </button>
      </div>

      {/* ── Mobile dropdown panel: icons hidden by the breakpoint ── */}
      <div id={panelId} className={`${styles.mobilePanel} ${menuOpen ? styles.isOpen : ''}`}>
        <div className={styles.mobilePanelInner}>
          <button type="button" className={styles.mobileItem}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 2a5 5 0 015 5c0 3-2 4-2 7H9c0-3-2-4-2-7a5 5 0 015-5z" />
              <path d="M9 18h6" />
            </svg>
            Insights
          </button>

          <button type="button" className={styles.mobileItem}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="4" width="18" height="14" rx="2" />
              <path d="M3 9h18" />
            </svg>
            Boards
          </button>

          <button type="button" className={styles.mobileItem}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 8a6 6 0 00-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.73 21a2 2 0 01-3.46 0" />
            </svg>
            Notifications
            <span className={styles.miBadge}>{unreadCount}</span>
          </button>
        </div>
      </div>
    </div>
  );
}