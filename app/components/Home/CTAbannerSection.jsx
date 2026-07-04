import React from "react";
import Link from 'next/link'
import "../css/Home/CTABannerSection.css";

const InstagramIcon = () => (
  <svg className="cta-social-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="2" width="20" height="20" rx="5" />
    <circle cx="12" cy="12" r="4" />
    <circle cx="17.5" cy="6.5" r="0.5" fill="currentColor" stroke="none" />
  </svg>
);

const FacebookIcon = () => (
  <svg className="cta-social-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 2h-3a5 5 0 00-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 011-1h3z" />
  </svg>
);

const TwitterIcon = () => (
  <svg className="cta-social-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M23 3a10.9 10.9 0 01-3.14 1.53A4.48 4.48 0 0012 8v1A10.66 10.66 0 013 4s-4 9 5 13a11.64 11.64 0 01-7 2c9 5 20 0 20-11.5a4.5 4.5 0 00-.08-.83A7.72 7.72 0 0023 3z" />
  </svg>
);

export default function CTABannerSection() {
  return (
    <section className="cta-section">
      <div className="cta-inner">
        <div className="cta-panel">
          <p className="cta-body">
            Join the realtors who are transforming idle properties into performing assets. Shift from waiting for deals to building a system that generates them. It is time to operate differently and position your portfolio for measurable growth.
          </p>

          <Link href="/properties">
            <button className="cta-btn">
              Become A Lister Today →
            </button>
          </Link>

          <div className="cta-socials">
            <a href="#" className="cta-social-link" aria-label="Instagram"><InstagramIcon /></a>
            <a href="#" className="cta-social-link" aria-label="Facebook"><FacebookIcon /></a>
            <a href="#" className="cta-social-link" aria-label="Twitter"><TwitterIcon /></a>
          </div>
        </div>

        {/* Background image sits behind via CSS */}
      </div>
    </section>
  );
}