"use client";

import {
  useState,
  useEffect,
  useLayoutEffect,
  useRef,
  useMemo,
  useCallback,
} from "react";
import styles from "./css/nav.module.css";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { useNavVisibility } from "@/app/hooks/useNavVisibility";
import { useUser, useClerk } from "@clerk/nextjs";

// ────────────────────────────────────────────────────────────────────────
// Config — single source of truth for nav content. Desktop bar, mobile
// header, and mobile drawer are all rendered from this, so there is no
// way for them to drift out of sync with each other.
// ────────────────────────────────────────────────────────────────────────

const NAV_BREAKPOINT = 1024; // matches CSS module — keep both in sync

function getPrimaryNavItems(role) {
  const dashboardHref = role === "admin" ? "/Admin" : "/Lister";
  return [
    {
      key: "dashboard",
      label: "Dashboard",
      href: dashboardHref,
      requiresAuth: true,
    },
    { key: "properties", label: "Properties", href: "/", requiresAuth: false },
    { key: "home", label: "Home", href: "/properties", requiresAuth: false },
    { key: "about", label: "About", href: "/about", requiresAuth: false },
  ];
}

// Insights and Notifications used to be their own top-bar icons. They now
// live here instead, alongside the account-management links — one list
// feeds both the desktop dropdown and the mobile drawer's account section.
const ACCOUNT_MENU_ITEMS = [
  { key: "insights", label: "Insights", href: "/insights", icon: "insights" },
  {
    key: "notifications",
    label: "Notifications",
    href: "/notifications",
    icon: "bell",
    showBadge: true,
  },
  { key: "profile", label: "Profile", href: "/profile", icon: "user" },
  { key: "settings", label: "Settings", href: "/settings", icon: "settings" },
  { key: "support", label: "Help & Support", href: "/support", icon: "help" },
];

// Anything signed-in-only that ISN'T an account concern stays a plain nav item.
const STANDALONE_UTILITY_ITEMS = [
  { key: "boards", label: "Boards", href: "/boards", icon: "boards" },
];

// ────────────────────────────────────────────────────────────────────────
// Tiny inline icon set — outline style, no external icon dependency.
// ────────────────────────────────────────────────────────────────────────

const Icon = {
  bell: (p) => (
    <svg
      viewBox="0 0 24 24"
      width="18"
      height="18"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...p}>
      <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  ),
  insights: (p) => (
    <svg
      viewBox="0 0 24 24"
      width="18"
      height="18"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...p}>
      <path d="M9 18h6" />
      <path d="M10 22h4" />
      <path d="M12 2a7 7 0 0 0-4 12.7c.5.4.9 1 1 1.7v.6h6v-.6c.1-.7.5-1.3 1-1.7A7 7 0 0 0 12 2Z" />
    </svg>
  ),
  boards: (p) => (
    <svg
      viewBox="0 0 24 24"
      width="18"
      height="18"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...p}>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <line x1="3" y1="10" x2="21" y2="10" />
      <line x1="9" y1="10" x2="9" y2="20" />
    </svg>
  ),
  chevronDown: (p) => (
    <svg
      viewBox="0 0 24 24"
      width="16"
      height="16"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...p}>
      <polyline points="6 9 12 15 18 9" />
    </svg>
  ),
  chevronRight: (p) => (
    <svg
      viewBox="0 0 24 24"
      width="16"
      height="16"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...p}>
      <polyline points="9 6 15 12 9 18" />
    </svg>
  ),
  x: (p) => (
    <svg
      viewBox="0 0 24 24"
      width="14"
      height="14"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...p}>
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  ),
  user: (p) => (
    <svg
      viewBox="0 0 24 24"
      width="18"
      height="18"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...p}>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20c0-3.3 3.6-6 8-6s8 2.7 8 6" />
    </svg>
  ),
  settings: (p) => (
    <svg
      viewBox="0 0 24 24"
      width="18"
      height="18"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...p}>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.6 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" />
    </svg>
  ),
  help: (p) => (
    <svg
      viewBox="0 0 24 24"
      width="18"
      height="18"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...p}>
      <circle cx="12" cy="12" r="9" />
      <path d="M9.5 9a2.5 2.5 0 0 1 4.9.8c0 1.7-2.4 1.9-2.4 3.5" />
      <line x1="12" y1="17" x2="12" y2="17" />
    </svg>
  ),
  hamburger: (p) => (
    <svg
      viewBox="0 0 24 24"
      width="20"
      height="20"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      {...p}>
      <line x1="3" y1="6" x2="21" y2="6" />
      <line x1="3" y1="12" x2="21" y2="12" />
      <line x1="3" y1="18" x2="21" y2="18" />
    </svg>
  ),
};

// ────────────────────────────────────────────────────────────────────────
// Data hooks — placeholders that own their own fetching. Swap the bodies
// for real calls (SWR/React Query/etc); every consumer below only reads
// from this hook, so there's one source of truth either way.
// ────────────────────────────────────────────────────────────────────────

function useNotifications() {
  // TODO: replace with the real notification data source (e.g. useSWR("/api/notifications"))
  const [count] = useState(2);
  return { count, hasUnread: count > 0 };
}

function useIsMobile(breakpoint = NAV_BREAKPOINT) {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${breakpoint - 1}px)`);
    const update = () => setIsMobile(mql.matches);
    update();
    mql.addEventListener("change", update);
    return () => mql.removeEventListener("change", update);
  }, [breakpoint]);
  return isMobile;
}

// ────────────────────────────────────────────────────────────────────────

export default function AppNav() {
  const [menuOpen, setMenuOpen] = useState(false); // mobile drawer
  const [accountMenuOpen, setAccountMenuOpen] = useState(false); // desktop avatar dropdown
  const [scrolled, setScrolled] = useState(false);

  const navbarRef = useRef(null);
  const accountMenuRef = useRef(null);

  const { isLoaded, isSignedIn, user } = useUser();
  const { signOut } = useClerk();
  const { count: notificationCount, hasUnread } = useNotifications();

  const pathname = usePathname();
  const router = useRouter();
  const visible = useNavVisibility();
  const isMobile = useIsMobile();

  const role = user?.publicMetadata?.role;
  const primaryNavItems = useMemo(() => getPrimaryNavItems(role), [role]);
  const visiblePrimaryItems = primaryNavItems.filter(
    (item) => !item.requiresAuth || isSignedIn,
  );

  const orgName = user?.publicMetadata?.orgName || "Account";
  const orgSubtitle = user?.publicMetadata?.orgSubtitle || "";
  const displayName = user?.firstName || user?.username || "Account";
  const initial = (displayName || "?").charAt(0).toUpperCase();

  // ── scroll shadow ──
  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 10);
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // ── publish navbar height as a CSS var for page offset ──
  useLayoutEffect(() => {
    const navbar = navbarRef.current;
    if (!navbar) return undefined;
    let frameId;
    const updateNavbarHeight = () => {
      cancelAnimationFrame(frameId);
      frameId = requestAnimationFrame(() => {
        const height = Math.ceil(navbar.getBoundingClientRect().height);
        document.documentElement.style.setProperty(
          "--page-top-offset",
          `${height}px`,
        );
      });
    };
    updateNavbarHeight();
    const resizeObserver = new ResizeObserver(updateNavbarHeight);
    resizeObserver.observe(navbar);
    window.addEventListener("resize", updateNavbarHeight);
    return () => {
      cancelAnimationFrame(frameId);
      resizeObserver.disconnect();
      window.removeEventListener("resize", updateNavbarHeight);
    };
  }, [isSignedIn, menuOpen, pathname, visible]);

  // ── lock body scroll while drawer is open ──
  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  // ── everything changes mode together: closing states when crossing the breakpoint ──
  useEffect(() => {
    if (!isMobile) {
      setMenuOpen(false);
    } else {
      setAccountMenuOpen(false);
    }
  }, [isMobile]);

  // ── close the desktop account menu on outside click / Escape ──
  useEffect(() => {
    if (!accountMenuOpen) return undefined;
    const handleClick = (e) => {
      if (
        accountMenuRef.current &&
        !accountMenuRef.current.contains(e.target)
      ) {
        setAccountMenuOpen(false);
      }
    };
    const handleKey = (e) => {
      if (e.key === "Escape") setAccountMenuOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [accountMenuOpen]);

  const closeMenu = () => setMenuOpen(false);
  const closeAccountMenu = () => setAccountMenuOpen(false);

  const handleSignOut = async () => {
    closeMenu();
    closeAccountMenu();
    await signOut();
    router.push("/Auth");
  };

  const isActive = (href) => pathname === href;

  const BrandMark = () => (
    <Link href="/" className={styles.brand} onClick={closeMenu}>
      <span className={styles.logoIcon}>
        <Image width={32} height={32} alt="Logo" src="/logo2.png" />
      </span>
      <span className={styles.brandName}>Pedu Rentals</span>
    </Link>
  );

  const Avatar = ({ showDot }) => (
    <span className={styles.avatarWrap}>
      <span className={styles.avatar}>{initial}</span>
      {showDot && <span className={styles.avatarDot} aria-hidden="true" />}
    </span>
  );

  const AccountMenuList = ({ onItemClick }) => (
    <>
      {ACCOUNT_MENU_ITEMS.map((item) => {
        const ItemIcon = Icon[item.icon];
        return (
          <Link
            key={item.key}
            href={item.href}
            className={styles.accountMenuItem}
            onClick={onItemClick}>
            <ItemIcon />
            {item.label}
            {item.showBadge && notificationCount > 0 && (
              <span className={styles.accountMenuBadge}>
                {notificationCount}
              </span>
            )}
          </Link>
        );
      })}
    </>
  );

  return (
    <>
      <nav
        ref={navbarRef}
        className={`${styles.navbar} ${scrolled ? styles.scrolled : ""} ${visible ? "" : styles.navHidden}`}>
        <BrandMark />

        {/* ── Desktop primary nav — centered on the bar ── */}
        <ul className={styles.navLinks}>
          {visiblePrimaryItems.map((item) => (
            <li key={item.key}>
              <Link
                href={item.href}
                className={`${styles.navLink} ${isActive(item.href) ? styles.navLinkActive : ""}`}>
                {item.label}
              </Link>
            </li>
          ))}
        </ul>

        {/* ── Right-hand actions ── */}
        <div className={styles.actions}>
          {!isSignedIn && (
            <>
              <Link href="/Auth" className={styles.ctaButtonSecondary}>
                BECOME A LISTER
              </Link>
              <Link href="/Auth" className={styles.ctaButtonOutline}>
                LOG IN
              </Link>
            </>
          )}

          {isLoaded && isSignedIn && (
            <div className={styles.accountMenuWrap} ref={accountMenuRef}>
              <button
                type="button"
                className={styles.accountTrigger}
                onClick={() => setAccountMenuOpen((v) => !v)}
                aria-haspopup="menu"
                aria-expanded={accountMenuOpen}
                aria-label="Account menu">
                <Avatar showDot={hasUnread} />
                <Icon.chevronDown />
              </button>

              {accountMenuOpen && (
                <div className={styles.accountMenu} role="menu">
                  <div className={styles.accountMenuHeader}>
                    <Avatar />
                    <div>
                      <div className={styles.accountMenuName}>
                        {displayName}
                      </div>
                      <div className={styles.accountMenuEmail}>
                        {user?.primaryEmailAddress?.emailAddress}
                      </div>
                    </div>
                  </div>

                  <Link
                    href="/account"
                    className={styles.accountSwitcherRow}
                    onClick={closeAccountMenu}>
                    <Avatar />
                    <span className={styles.accountSwitcherText}>
                      <span className={styles.accountSwitcherOrg}>
                        {orgName}
                      </span>
                      {orgSubtitle && (
                        <span className={styles.accountSwitcherSub}>
                          {orgSubtitle}
                        </span>
                      )}
                    </span>
                    <Icon.chevronRight />
                  </Link>

                  <div className={styles.accountMenuDivider} />
                  <AccountMenuList onItemClick={closeAccountMenu} />

                  <div className={styles.accountMenuDivider} />
                  <button
                    type="button"
                    className={styles.signOutRow}
                    onClick={handleSignOut}>
                    SIGN OUT
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Mobile-only icon row: hamburger only ── */}
        <div className={styles.mobileHeaderRight}>
          <button
            type="button"
            className={styles.hamburger}
            onClick={() => setMenuOpen((v) => !v)}
            aria-label="Toggle menu"
            aria-expanded={menuOpen}>
            <Icon.hamburger />
          </button>
        </div>
      </nav>

      {/* ── Mobile drawer backdrop + panel — one drawer, contents vary by auth state ── */}
      <div
        className={`${styles.backdrop} ${menuOpen ? styles.backdropVisible : ""}`}
        onClick={closeMenu}
        aria-hidden="true"
      />

      <aside
        className={`${styles.drawer} ${menuOpen ? styles.drawerOpen : ""}`}
        role="dialog"
        aria-modal="true"
        aria-label="Navigation menu">
        <div className={styles.drawerHeader}>
          <BrandMark />
          <button
            type="button"
            className={styles.drawerClose}
            onClick={closeMenu}
            aria-label="Close menu">
            <Icon.x width="18" height="18" />
          </button>
        </div>

        <div className={styles.drawerBody}>
          {isSignedIn && (
            <Link
              href="/account"
              className={styles.drawerAccountSwitcher}
              onClick={closeMenu}>
              <Avatar />
              <span className={styles.accountSwitcherText}>
                <span className={styles.accountSwitcherOrg}>{orgName}</span>
                {orgSubtitle && (
                  <span className={styles.accountSwitcherSub}>
                    {orgSubtitle}
                  </span>
                )}
              </span>
              <Icon.chevronRight />
            </Link>
          )}

          <ul className={styles.drawerLinks}>
            {visiblePrimaryItems.map((item) => (
              <li key={item.key}>
                <Link
                  href={item.href}
                  className={`${styles.drawerLink} ${isActive(item.href) ? styles.drawerLinkActive : ""}`}
                  onClick={closeMenu}>
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>

          {isSignedIn && (
            <>
              <div className={styles.drawerDivider} />
              <ul className={styles.drawerLinks}>
                {STANDALONE_UTILITY_ITEMS.map((item) => {
                  const ItemIcon = Icon[item.icon];
                  return (
                    <li key={item.key}>
                      <Link
                        href={item.href}
                        className={styles.drawerLink}
                        onClick={closeMenu}>
                        <span className={styles.drawerLinkIcon}>
                          <ItemIcon />
                        </span>
                        {item.label}
                      </Link>
                    </li>
                  );
                })}
              </ul>

              <div className={styles.drawerDivider} />
              <div className={styles.drawerAccountHeader}>
                <Avatar showDot={hasUnread} />
                {displayName}
              </div>
              <ul className={styles.drawerLinks}>
                {ACCOUNT_MENU_ITEMS.map((item) => {
                  const ItemIcon = Icon[item.icon];
                  return (
                    <li key={item.key}>
                      <Link
                        href={item.href}
                        className={styles.drawerLink}
                        onClick={closeMenu}>
                        <span className={styles.drawerLinkIcon}>
                          <ItemIcon />
                        </span>
                        {item.label}
                        {item.showBadge && notificationCount > 0 && (
                          <span className={styles.drawerBadge}>
                            {notificationCount}
                          </span>
                        )}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </>
          )}
        </div>

        <div className={styles.drawerFooter}>
          {!isSignedIn && (
            <>
              <Link
                href="/Auth"
                className={styles.ctaButtonSecondary}
                onClick={closeMenu}>
                BECOME A LISTER
              </Link>
              <Link
                href="/Auth"
                className={styles.ctaButtonOutline}
                onClick={closeMenu}>
                LOG IN
              </Link>
            </>
          )}
          {isLoaded && isSignedIn && (
            <button
              type="button"
              className={styles.signOutButton}
              onClick={handleSignOut}>
              SIGN OUT
            </button>
          )}
        </div>
      </aside>
    </>
  );
}
