'use client';

import { useState, useEffect } from 'react';
import styles from '../css/Lister/WelcomeMessage.module.css';

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Morning';
  if (h < 17) return 'Afternoon';
  return 'Evening';
}

function formatDateTime(date) {
  return date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }) + ' ' + date.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function WelcomeBanner({ username, orgImage, isNew }) {
  const [now, setNow] = useState(null);

  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className={styles.banner}>

      {/* ── Left: title + greeting ── */}
      <div className={styles.left}>
        <span className={styles.title}>Overview</span>
        <span className={styles.greeting}>
          {isNew ? `Hi, ${username || 'there'} 👋` : `${getGreeting()} ${username || 'there'}`}
        </span>
      </div>

      {/* ── Centre: date + time ── */}
      <div className={styles.centre}>
        {now && (
          <time className={styles.datetime} dateTime={now.toISOString()}>
            {formatDateTime(now)}
          </time>
        )}
      </div>

      {/* ── Right: username stacked above icons, avatar to far right ── */}
      <div className={styles.right}>
        <div className={styles.userBlock}>
          <span className={styles.username}>{username || ''}</span>
          <div className={styles.icons}>
            <button className={styles.iconBtn} aria-label="Messages">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
            </button>
            <button className={styles.iconBtn} aria-label="Notifications">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                <path d="M13.73 21a2 2 0 0 1-3.46 0" />
              </svg>
            </button>
          </div>
        </div>

        {/* Avatar flush to the right edge */}
        <div className={styles.avatar}>
          {orgImage
            ? <img src={orgImage} alt={username} className={styles.avatarImg} />
            : <span className={styles.avatarInitial}>{(username?.[0] ?? '?').toUpperCase()}</span>
          }
        </div>
      </div>

    </div>
  );
}