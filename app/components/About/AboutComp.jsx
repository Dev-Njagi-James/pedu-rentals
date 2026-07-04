'use client';

import styles from '../css/About/AboutComp.module.css';

export default function AboutComp() {
  return (
    <section className={styles.aboutRoot}>

      {/* Top — About block */}
      <div className={styles.aboutBlock}>
        <h2 className={styles.blockHeading}>About Pedu Rentals</h2>
        <p className={styles.bodyText}>
          Pedu Rentals was created to bring order and trust into the rental market. Too often,
          tenants struggle with unclear listings and unreliable contacts, while property owners lack
          a structured way to present and market their spaces. The system was conceived as a
          controlled marketplace where properties are clearly presented, identities are verified,
          and communication is direct.
        </p>
        <p className={styles.bodyText}>
          The focus is simple: make property search and property marketing disciplined,
          transparent, and efficient.
        </p>
      </div>

      {/* Middle — Two column grid */}
      <div className={styles.twoCol}>
        <div className={styles.colBlock}>
          <h3 className={styles.colHeading}>How It Helps Users</h3>
          <ul className={styles.list}>
            <li>Clear, structured listings that eliminate guesswork</li>
            <li>Verified listers to reduce fraud and misinformation</li>
            <li>Straightforward search and filtering for faster decisions</li>
            <li>Direct contact with property owners or agents</li>
            <li>Accurate location guidance for informed site visits</li>
          </ul>
        </div>

        <div className={styles.colBlock}>
          <h3 className={styles.colHeading}>Benefits for Property Owners and Agents</h3>
          <ul className={styles.list}>
            <li>Professional exposure within a focused rental audience</li>
            <li>Structured property presentation that increases credibility</li>
            <li>Performance visibility through views and engagement tracking</li>
            <li>A system that prioritizes serious inquiries over casual browsing</li>
          </ul>
        </div>
      </div>

      {/* Bottom — closing statement */}
      <div className={styles.closingBlock}>
        <p className={styles.closingText}>
          Pedu Rentals operates as a dependable environment where both tenants and property
          providers interact within defined standards, creating a more reliable and
          user-centered rental experience.
        </p>
      </div>

    </section>
  );
}