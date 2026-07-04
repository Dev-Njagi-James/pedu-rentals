import Link from 'next/link';
import styles from '../css/Home/hero.module.css';

export default function Hero() {
  return (
    <section className={styles.hero}>
      {/* Background image */}
      <div className={styles.heroBg} />

      {/* Dark overlay — left heavy, fades right */}
      <div className={styles.heroOverlay} />

      {/* White diagonal slice — bottom-right corner */}
      <div className={styles.heroSlice} />

      {/* Content */}
      <div className={styles.heroContent}>
        <h1 className={styles.heroHeading}>
          TIRED OF SCAMS AND UNSURE APARTMENTS? FIND
          THE RIGHT HOUSE AT THE COMFORT OF YOUR HOME
        </h1>

        <p className={styles.heroSubtext}>
          We connect you directly with verified landlords so you never have to
          worry about fake listings or unsafe houses. Browse thousands of
          verified listings and find a place that fits your life, your budget, and
          your neighborhood.
        </p>

        <Link href="/properties" className={styles.heroCta}>
          Browse Categories →
        </Link>
      </div>
    </section>
  );
}