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
import Link from "next/link";
import Image from "next/image";
import { useNavVisibility } from "@/app/hooks/useNavVisibility";
import { useUser, useClerk } from "@clerk/nextjs";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { clearAllCaches } from "@/lib/cache/clearAllCaches";
import AccessButton from "./AccessButton";
import { resetAccess } from "@/lib/contact/accessStore";
import AccessBadge from "./AccessBadge";
import AccessCheckoutModal from "./AccessCheckoutModal";
import { STAFF_ROLES, ROLE_DASHBOARDS } from "./navConfig";
import { useNotifications } from "@/app/hooks/useNotifications";

// ────────────────────────────────────────────────────────────────────────
// Config — single source of truth for nav content. Desktop bar, mobile
// header, and mobile drawer are all rendered from this, so there is no
// way for them to drift out of sync with each other.
// ────────────────────────────────────────────────────────────────────────

const NAV_BREAKPOINT = 1024; // matches CSS module — keep both in sync

function getPrimaryNavItems(role) {
  const dashboardHref = ROLE_DASHBOARDS[role]?.base ?? "/";
  return [
    { key: "properties", label: "Properties", href: "/" },
    {
      key: "dashboard",
      label: "Dashboard",
      href: dashboardHref,
      roles: STAFF_ROLES,
    },
    { key: "home", label: "Home", href: "/properties" },
    { key: "about", label: "About", href: "/about" },
  ];
}

// ────────────────────────────────────────────────────────────────────────
// Tiny inline icon set — outline style, no external icon dependency.
// ────────────────────────────────────────────────────────────────────────

const make = (name, defaultSize = 18) =>
  function HugeIcon({ size, width, height, className = "", style, ...p }) {
    const px = Number(size ?? width ?? height ?? defaultSize);
    return (
      <i
        className={`hgi hgi-stroke hgi-rounded hgi-${name} ${className}`.trim()}
        style={{ fontSize: px, lineHeight: 1, display: "inline-block", ...style }}
        aria-hidden="true"
        {...p}
      />
    );
  };

const Icon = {
  bell: make("notification-01"),
  documentation: make("important-book"),
  boards: make("layout-table-01"),
  chevronDown: make("arrow-down-01", 16),
  chevronRight: make("arrow-right-01", 16),
  x: make("cancel-01", 14),
  user: make("user"),
  settings: make("settings-01"),
  inbox: make("mail-02"),
  hamburger: make("menu-01", 20),
};

// ────────────────────────────────────────────────────────────────────────
// Data hooks — placeholders that own their own fetching. Swap the bodies
// for real calls (SWR/React Query/etc); every consumer below only reads
// from this hook, so there's one source of truth either way.
// ────────────────────────────────────────────────────────────────────────

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

  const { count: notificationCount } = useNotifications();

  const navbarRef = useRef(null);
  const accountMenuRef = useRef(null);

  const { isLoaded, isSignedIn, user } = useUser();
  const { signOut } = useClerk();
  const [profileUsername, setProfileUsername] = useState(null);
  const [profileOrgName, setProfileOrgName] = useState(null);

  const searchParams = useSearchParams();
  const [dashboardOpen, setDashboardOpen] = useState(false);
  const [upgrading, setUpgrading] = useState(false);

  useEffect(() => {
    if (!isSignedIn) {
      setProfileUsername(null);
      setProfileOrgName(null);
      return;
    }
    let cancelled = false;
    const MAX_RETRIES = user?.publicMetadata?.role === "admin" ? 0 : 2;
    const RETRY_DELAY_MS = 1500;
    (async () => {
      try {
        let res;
        for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
          res = await fetch("/api/v1/users/me");
          if (res.status !== 409 || attempt === MAX_RETRIES) break;
          await new Promise((r) => setTimeout(r, RETRY_DELAY_MS));
          if (cancelled) return;
        }
        const json = res.ok ? await res.json() : null;
        if (cancelled) return;
        setProfileUsername(json?.data?.username ?? null);
        setProfileOrgName(json?.data?.lister_organization ?? null);
      } catch {
        if (!cancelled) {
          setProfileUsername(null);
          setProfileOrgName(null);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isSignedIn, user?.publicMetadata?.role]);

  const pathname = usePathname();
  const router = useRouter();
  const visible = useNavVisibility();
  const isMobile = useIsMobile();

  const role = user?.publicMetadata?.role;
  const dashboard = ROLE_DASHBOARDS[role];
  const activeTab = searchParams.get("tab") ?? dashboard?.defaultTab;
  const primaryNavItems = useMemo(() => getPrimaryNavItems(role), [role]);
  const canSee = (item) =>
    !item.roles || (isLoaded && isSignedIn && item.roles.includes(role));
  const visiblePrimaryItems = primaryNavItems.filter(canSee);
  const canUpgrade = isLoaded && isSignedIn && !STAFF_ROLES.includes(role);
  const canActivate = isLoaded && isSignedIn && role !== "admin";

  useEffect(() => {
     setDashboardOpen(!!dashboard && pathname === dashboard.base);
  }, [pathname, dashboard]);

  const displayName =
    profileUsername || user?.primaryEmailAddress?.emailAddress || "Account";
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

  const handleUpgrade = async () => {
    if (upgrading) return;
    setUpgrading(true);
    try {
      const res = await fetch("/api/v1/users/upgrade", { method: "POST" });
      if (!res.ok) throw new Error("upgrade_failed");
      await user.reload();
      clearAllCaches();
      closeMenu();
      closeAccountMenu();
      router.push("/Lister");
      router.refresh();
    } catch {
      toast.error("Could not upgrade your account. Try again.");
    } finally {
      setUpgrading(false);
    }
  };

  const handleSignOut = async () => {
    closeMenu();
    closeAccountMenu();
    clearAllCaches();
    resetAccess();
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

  const Avatar = () => (
    <span className={styles.avatarWrap}>
      <span className={styles.avatar}>{initial}</span>
    </span>
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
          {canActivate && <AccessBadge />}
          {!isSignedIn && (
            <>
              <Link
                href="/Auth?type=lister"
                className={styles.ctaButtonSecondary}>
                BECOME A LISTER
              </Link>
              <Link href="/Auth" className={styles.ctaButtonOutline}>
                LOG IN
              </Link>
            </>
          )}

          {canUpgrade && (
            <button
              type="button"
              className={styles.ctaButtonSecondary}
              onClick={handleUpgrade}
              disabled={upgrading}>
              {upgrading ? "UPGRADING…" : "UPGRADE TO LISTER"}
            </button>
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
                <Avatar />
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
                    </div>
                    {profileOrgName && (
                      <div className={styles.accountMenuOrg}>
                        {profileOrgName}
                      </div>
                    )}
                  </div>

                  {canActivate && (
                    <>
                      <div className={styles.accountMenuDivider} />
                      <div className={styles.accessRow}>
                        <AccessButton onDone={closeAccountMenu} />
                      </div>
                    </>
                  )}

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
          {canActivate && <AccessBadge />}
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
          <ul className={styles.drawerLinks}>
            {visiblePrimaryItems.map((item) => {
              if (item.key === "dashboard" && dashboard) {
                const dashboardActive = pathname === dashboard.base;
                return (
                  <li key={item.key}>
                    <button
                      type="button"
                      className={`${styles.drawerLink} ${styles.drawerDashboardLabel}`}
                      aria-current={dashboardActive ? "page" : undefined}
                      aria-expanded={dashboardOpen}
                      onClick={() => setDashboardOpen((v) => !v)}>
                      {item.label}
                      <span
                        className={`${styles.drawerLinkChevron} ${dashboardOpen ? styles.chevronOpen : ""}`}>
                        <Icon.chevronDown />
                      </span>
                    </button>
                    {dashboardOpen && (
                      <ul className={styles.drawerSublinks}>
                        {dashboard.sublinks.map((sub) => (
                          <li key={sub.id}>
                            <Link
                              href={`${dashboard.base}?tab=${sub.id}`}
                              className={`${styles.drawerLink} ${dashboardActive && activeTab === sub.id ? styles.drawerLinkActive : ""}`}
                              onClick={closeMenu}>
                              {sub.label}
                              {sub.id === "inbox" && notificationCount > 0 && (
                                <span className={styles.drawerBadge}>{notificationCount > 9 ? "9+" : notificationCount}</span>
                              )}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    )}
                  </li>
                );
              }
              return (
                <li key={item.key}>
                  <Link
                    href={item.href}
                    className={`${styles.drawerLink} ${isActive(item.href) ? styles.drawerLinkActive : ""}`}
                    onClick={closeMenu}>
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>

          {canActivate && (
            <div className={styles.accessRow}>
              <AccessButton onDone={closeMenu} />
            </div>
          )}

          {isSignedIn && (
            <>
              <div className={styles.drawerDivider} />
              <div className={styles.drawerAccountHeader}>
                <Avatar />
                <div>
                  <div>{displayName}</div>
                  {profileOrgName && (
                    <div className={styles.drawerAccountOrg}>
                      {profileOrgName}
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        <div className={styles.drawerFooter}>
          {!isSignedIn && (
            <>
              <Link
                href="/Auth?type=lister"
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

          {canUpgrade && (
            <button
              type="button"
              className={styles.ctaButtonSecondary}
              onClick={handleUpgrade}
              disabled={upgrading}>
              {upgrading ? "UPGRADING…" : "UPGRADE TO LISTER"}
            </button>
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
      <AccessCheckoutModal />
    </>
  );
}
