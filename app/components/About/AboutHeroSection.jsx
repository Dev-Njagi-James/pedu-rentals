'use client';

import styles from '../css/About/AboutHeroSection.module.css';

export default function AboutHeroSection() {
  return (
    <section className={styles.heroRoot}>
      {/* Title block */}
      <div className={styles.heroTitle}>
        <h1 className={styles.heroHeading}>Pedu Rental Systems</h1>
        <p className={styles.heroSubheading}>Structured Listing Predictable Results</p>
      </div>

      {/* Main grid */}
      <div className={styles.heroGrid}>

        {/* Left — app screenshot mock */}
        <div className={styles.screenshotPanel}>
          <div className={styles.screenshotChrome}>
            <div className={styles.chromeDots}>
              <span /><span /><span />
            </div>
            <div className={styles.chromeBar}>
              <span className={styles.chromeUrl}>pedurentals.co.ke/properties</span>
            </div>
          </div>

          <div className={styles.screenshotBody}>
            {/* App hero strip */}
            <div className={styles.appHeroStrip}>
              <div className={styles.appHeroImg} />
              <div className={styles.appHeroOverlay}>
                <h2 className={styles.appHeroText}>Lets Find Your Future Home</h2>
                <p className={styles.appHeroSub}>Find the house that fits</p>
                <div className={styles.appTabs}>
                  <button className={`${styles.appTab} ${styles.appTabActive}`}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                      <path d="M3 10V20M21 10V20M3 10h18M3 10L12 3l9 7" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/>
                      <rect x="9" y="14" width="6" height="6" stroke="currentColor" strokeWidth="1.6"/>
                    </svg>
                    Homes
                  </button>
                  <button className={styles.appTab}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                      <rect x="3" y="3" width="18" height="18" rx="1" stroke="currentColor" strokeWidth="1.8"/>
                      <path d="M3 9h18M9 9v12" stroke="currentColor" strokeWidth="1.6"/>
                    </svg>
                    Apartments
                  </button>
                  <button className={styles.appTab}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                      <rect x="2" y="7" width="20" height="14" rx="1" stroke="currentColor" strokeWidth="1.8"/>
                      <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" stroke="currentColor" strokeWidth="1.6"/>
                    </svg>
                    Commercial
                  </button>
                </div>
              </div>
            </div>

            {/* Featured listings strip */}
            <div className={styles.featuredStrip}>
              <div className={styles.featuredHeader}>
                <div className={styles.featuredAccent} />
                <span className={styles.featuredTitle}>Featured Listings</span>
              </div>
              <p className={styles.featuredDesc}>
                Explore the most viewed and highest rated listings on the platform.
                These properties reflect consistent user interest and strong overall feedback.
              </p>
              <div className={styles.featuredDivider} />
              <div className={styles.featuredNav}>
                <button className={styles.navArrow}>&#8592;</button>
                <button className={styles.navArrow}>&#8594;</button>
                <span className={styles.moreLink}>more .....</span>
              </div>

              {/* Mini listing cards */}
              <div className={styles.miniCards}>
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className={styles.miniCard}>
                    <div className={styles.miniCardImg} />
                    <span className={styles.miniCardLabel}>Skyline Heights</span>
                    <span className={styles.miniCardSub}>Apartments</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Right — image stack + CTA */}
        <div className={styles.rightCol}>
          <div className={styles.imageStack}>
            <div className={`${styles.stackImg} ${styles.stackImg1}`} />
            <div className={`${styles.stackImg} ${styles.stackImg2}`} />
          </div>

          <div className={styles.ctaBlock}>
            <p className={styles.ctaText}>
              Verified property. Transparent process. Disciplined management that converts
              real estate into reliable income and secure occupancy.
            </p>
            <a href="/about" className={styles.ctaBtn}>
              View our Story &rarr;
            </a>
          </div>
        </div>

      </div>
    </section>
  );
}