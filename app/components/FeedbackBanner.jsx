'use client';

import { useState, useEffect, useRef } from 'react';
import { useNavVisibility } from '../hooks/useNavVisibility';

const LAUNCH_DATE = new Date('2026-06-06T12:00:00');

const ZERO = { days: 0, hours: 0, minutes: 0, seconds: 0, done: false };

function useCountdown(target) {
  const calc = () => {
    const diff = target - Date.now();
    if (diff <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0, done: true };
    return {
      days: Math.floor(diff / 86400000),
      hours: Math.floor((diff % 86400000) / 3600000),
      minutes: Math.floor((diff % 3600000) / 60000),
      seconds: Math.floor((diff % 60000) / 1000),
      done: false,
    };
  };

  const [ time, setTime ] = useState(ZERO);

  useEffect(() => {
    setTime(calc());
    const id = setInterval(() => setTime(calc()), 1000);
    return () => clearInterval(id);
  }, []);

  return time;
}

// ── NEW: track window width ───────────────────────────────────
function useWindowWidth() {
  const [ width, setWidth ] = useState(null);

  useEffect(() => {
    setWidth(window.innerWidth);
    const handler = () => setWidth(window.innerWidth);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);

  return width;
}

const Digit = ({ value, label }) => (
  <span style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', lineHeight: 1 }}>
    <span style={{
      fontFamily: 'var(--font-geist-mono)',
      fontWeight: 700,
      fontSize: '15px',
      color: 'var(--darkSecondary, #DEA806)',
      minWidth: '22px',
      textAlign: 'center',
    }}>
      {String(value).padStart(2, '0')}
    </span>
    <span style={{
      fontFamily: 'var(--font-geist-mono)',
      fontSize: '9px',
      color: '#666',
      textTransform: 'uppercase',
      letterSpacing: '0.08em',
      marginTop: '2px',
    }}>
      {label}
    </span>
  </span>
);

const Sep = () => (
  <span style={{
    fontFamily: 'var(--font-geist-mono)',
    fontWeight: 700,
    fontSize: '14px',
    color: 'var(--darkSecondary, #DEA806)',
    paddingBottom: '10px',
    opacity: 0.6,
  }}>:</span>
);

export default function FeedbackBanner() {
  const [ dismissed, setDismissed ] = useState(false);
  const [ navHeight, setNavHeight ] = useState(64);
  const bannerRef = useRef(null);
  const visible = useNavVisibility();
  const countdown = useCountdown(LAUNCH_DATE);
const windowWidth = useWindowWidth();
const isNarrow    = windowWidth !== null && windowWidth < 680;

  useEffect(() => {
    const nav = document.querySelector('nav');
    if (!nav) return;
    const update = () => setNavHeight(nav.offsetHeight);
    update();
    const observer = new ResizeObserver(update);
    observer.observe(nav);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const banner = bannerRef.current;
    const updateOffset = () => {
      const bannerH = dismissed ? 0 : (bannerRef.current?.offsetHeight || 0);
      const navH = document.querySelector('nav')?.offsetHeight || 64;
      document.documentElement.style.setProperty('--page-top-offset', `${navH + bannerH}px`);
    };
    updateOffset();
    if (!banner) return;
    const observer = new ResizeObserver(updateOffset);
    observer.observe(banner);
    return () => observer.disconnect();
  }, [ dismissed, navHeight ]);

  if (dismissed) return null;

  const bannerHeight = bannerRef.current?.offsetHeight || 40;

  return (
    <div
      ref={bannerRef}
      style={{
        backgroundColor: 'var(--darkBackground, #f5f0e8)',
        borderBottom: '1px solid rgba(0,0,0,0.1)',
        // ── CHANGED: column on narrow, row on wide ──────────
        padding: isNarrow ? '10px 16px' : '8px 16px',
        display: 'flex',
        flexDirection: isNarrow ? 'column' : 'row',
        alignItems: isNarrow ? 'flex-start' : 'center',
        justifyContent: isNarrow ? 'flex-start' : 'space-between',
        gap: isNarrow ? '8px' : '12px',
        // ────────────────────────────────────────────────────
        position: 'fixed',
        top: `${navHeight}px`,
        left: 0,
        right: 0,
        zIndex: 999,
        transform: visible ? 'translateY(0)' : `translateY(-${navHeight + bannerHeight}px)`,
        transition: 'transform 0.3s ease, top 0.3s ease',
      }}
    >
      {/* Message + dismiss row on narrow so × stays top-right */}
      {isNarrow ? (
        // ── NARROW: message row + countdown below ────────────
        <>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
            <span style={{
              fontFamily: 'var(--font-geist-sans)',
              fontSize: '14px',
              color: '#1a1a1a',
              fontWeight: 500,
              flexShrink: 1,
              minWidth: 0,
            }}>
              <span style={{ marginRight: '4px' }}>🚀</span>
              Hi👋 there; We're live & building in public —{' '}
              <button
                data-tally-open="KYkPYV"
                data-tally-overlay="1"
                data-tally-width="600"
                data-tally-auto-close="3000"
                style={{
                  background: 'none',
                  border: 'none',
                  textDecoration: 'underline',
                  fontFamily: 'var(--font-geist-sans)',
                  cursor: 'pointer',
                  fontSize: '14px',
                  color: 'var(--darkSecondary, #DEA806)',
                  fontWeight: 600,
                  padding: 0,
                  outline: 'none',
                }}
              >
                your feedback ships next
              </button>
            </span>

            {/* Dismiss sits top-right on narrow */}
            <button
              onClick={() => setDismissed(true)}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontSize: '18px',
                color: '#999',
                lineHeight: 1,
                flexShrink: 0,
                padding: '0 0 0 8px',
              }}
            >
              ×
            </button>
          </div>

          {/* Countdown on its own row, full width */}
          {!countdown.done && (
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              padding: '4px 10px',
              border: '1px solid rgba(0,0,0,0.1)',
              borderRadius: '4px',
              background: 'rgba(255,255,255,0.5)',
              alignSelf: 'flex-start',
            }}>
              <span style={{
                fontFamily: 'var(--font-geist-mono)',
                fontSize: '12px',
                color: '#888',
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                marginRight: '4px',
              }}>
                Launch in
              </span>
              {countdown.days > 0 && <><Digit value={countdown.days} label="d" /><Sep /></>}
              <Digit value={countdown.hours} label="hr" />
              <Sep />
              <Digit value={countdown.minutes} label="min" />
              <Sep />
              <Digit value={countdown.seconds} label="sec" />
            </span>
          )}
          {countdown.done && (
            <span style={{
              fontFamily: 'var(--font-geist-mono)',
              fontSize: '11px',
              color: 'var(--darkSecondary, #DEA806)',
              fontWeight: 700,
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
            }}>
              🎉 We're live
            </span>
          )}
        </>
      ) : (
        // ── WIDE: original row layout, untouched ─────────────
        <>
          <span style={{
            fontFamily: 'var(--font-geist-sans)',
            fontSize: '16px',
            color: '#1a1a1a',
            fontWeight: 500,
            flexShrink: 1,
            minWidth: 0,
          }}>
            <span style={{ marginRight: '4px' }}>🚀</span>
            Hi👋 there; We're live & building in public —{' '}
            <button
              data-tally-open="KYkPYV"
              data-tally-overlay="1"
              data-tally-width="600"
              data-tally-auto-close="3000"
              style={{
                background: 'none',
                border: 'none',
                textDecoration: 'underline',
                fontFamily: 'var(--font-geist-sans)',
                cursor: 'pointer',
                fontSize: '16px',
                color: 'var(--darkSecondary, #DEA806)',
                fontWeight: 600,
                padding: 0,
                outline: 'none',
              }}
            >
              your feedback ships next
            </button>
          </span>

          {!countdown.done && (
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              flexShrink: 0,
              padding: '4px 10px',
              border: '1px solid rgba(0,0,0,0.1)',
              borderRadius: '4px',
              background: 'rgba(255,255,255,0.5)',
            }}>
              <span style={{
                fontFamily: 'var(--font-geist-mono)',
                fontSize: '12px',
                color: '#888',
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                marginRight: '4px',
              }}>
                Launch in
              </span>
              {countdown.days > 0 && <><Digit value={countdown.days} label="d" /><Sep /></>}
              <Digit value={countdown.hours} label="hr" />
              <Sep />
              <Digit value={countdown.minutes} label="min" />
              <Sep />
              <Digit value={countdown.seconds} label="sec" />
            </span>
          )}
          {countdown.done && (
            <span style={{
              fontFamily: 'var(--font-geist-mono)',
              fontSize: '11px',
              color: 'var(--darkSecondary, #DEA806)',
              fontWeight: 700,
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              flexShrink: 0,
            }}>
              🎉 We're live
            </span>
          )}

          <button
            onClick={() => setDismissed(true)}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontSize: '18px',
              color: '#999',
              lineHeight: 1,
              flexShrink: 0,
              padding: '0 2px',
            }}
          >
            ×
          </button>
        </>
      )}
    </div>
  );
}