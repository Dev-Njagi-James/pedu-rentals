'use client';

import { useState, useEffect, useRef } from 'react';
import styles from './css/nav.module.css';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image'
import { useNavVisibility } from '@/app/hooks/useNavVisibility';
import { createBrowserSupabaseClient } from "@/lib/supabase/client";

const supabase = createBrowserSupabaseClient();

export default function Navbar() {
  const [ menuOpen, setMenuOpen ] = useState(false);
  const [ scrolled, setScrolled ] = useState(false);
  const [ session, setSession ] = useState(null);
  const role = session?.user?.user_metadata?.role;
  const pathname = usePathname();
  const router = useRouter();
  const visible = useNavVisibility();

    //
  /* 
  I swapped the pages where the home was / and properties was /properties
  In the future to fully swap we have to switch the routes for everything but for now the system

  Note for the developer
  */
  const navLinks = [
    { label: 'Properties', path: '/' }, 
    ...(role === 'admin' ? [ { label: 'Dashboard', path: '/Admin' } ] : []),
    ...(role === 'lister' ? [ { label: 'Dashboard', path: '/Lister' } ] : []),
    { label: 'Home', path: '/properties' },
    { label: 'About', path: '/about' },
  ];

  /* ── Scroll listener ── */
  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);


  /* ── Session: read once + subscribe to auth changes ── */
  useEffect(() => {
    // Get current session on mount
    supabase.auth.getSession().then(({ data }) => {
      console.log('SESSION:', data.session);
      setSession(data.session);
    });

    // Keep in sync with sign-in / sign-out from anywhere in the app
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      console.log('AUTH CHANGE:', _event, session);
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  /* ── Sign out ── */
  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setSession(null);
    router.push('/Auth');
  };

  const toggleMenu = () => setMenuOpen((prev) => !prev);


  return (
    <nav className={`${styles.navbar} ${scrolled ? styles.scrolled : ''} ${visible ? '' : styles.navHidden}`}>
      <div className={styles.brand}>
        <span className={styles.logoIcon}>
          <Image
            width={58}
            height={60}
            alt="Logo"
            src='/logo2.png' />
        </span>
        <span className={styles.brandName}>Pedu Rentals</span>
      </div>

      <ul className={`${styles.navLinks} ${menuOpen ? styles.navOpen : ''}`}>
        {navLinks.map(({ label, path }) => (
          <li key={label}>
            <Link
              href={path}
              className={`${styles.navLink} ${pathname === path ? styles.navLinkActive : ''}`}
              onClick={() => setMenuOpen(false)}
            >
              {label}
            </Link>
          </li>
        ))}
      </ul>

      <div className={styles.actions}>
        {!session && (
          <Link href="/Auth" className={styles.ctaButton}>
            LOG IN
            <span className={styles.arrow}>→</span>
          </Link>
        )}

        {session ? (
          <button className={styles.ctaButton} onClick={handleSignOut}>
            SIGN OUT
            <span className={styles.arrow}>→</span>
          </button>
        ) : (
          <Link href="/Auth" className={styles.ctaButton}>
            BECOME A LISTER
            <span className={styles.arrow}>→</span>
          </Link>
        )}

        <button
          className={`${styles.hamburger} ${menuOpen ? styles.hamburgerOpen : ''}`}
          onClick={toggleMenu}
          aria-label="Toggle menu"
          aria-expanded={menuOpen}
        >
          <span />
          <span />
          <span />
        </button>
      </div>
    </nav>
  );
}