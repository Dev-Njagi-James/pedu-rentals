import React from "react";
import Link from 'next/link'
import "../css/About/PropertyOwnerSection.css";

const SearchIcon = () => (
  <svg className="po-card-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
);

const VerifyIcon = () => (
  <svg className="po-card-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="18" height="18" rx="3" />
    <polyline points="9 12 11 14 15 10" />
  </svg>
);

const ConnectIcon = () => (
  <svg className="po-card-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.81 19.79 19.79 0 010 1.18 2 2 0 012 0h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 14.92z" />
  </svg>
);

export default function HomeSeekerSection() {
  return (
    <section className="po-section">

      {/* Quote Section */}
      <div className="po-quote-section">
        <p className="po-quote-text">
          &quot;Finding Your{" "}
          <span className="po-highlight-yellow">Perfect Home</span>{" "}
          Should Never Feel Like a <span className="po-highlight-blue">Gamble</span>.&quot;
        </p>
        <p className="po-quote-sub">
          Whether you&apos;re searching for a place to call home or ready to turn your property into opportunity — your next chapter is already waiting.
        </p>
      </div>

      {/* Label */}
      <div className="po-label-row">
        <span className="po-label">For Home Seekers</span>
        <div className="po-label-line" />
      </div>

      {/* Headline */}
      <h2 className="po-headline">Find It. Love It. Live It. </h2>

      {/* Subtitle */}
      <p className="po-subtitle">
        Browse a curated catalog of properties from different categories, from the comfort of your home, backed by genuine reviews and direct access to trusted listers — no middlemen, no surprises.
      </p>

      {/* Cards */}
      <div className="po-cards">
        <div className="po-card">
          <div className="po-card-header">
            <SearchIcon />
            <h3 className="po-card-title">Search</h3>
          </div>
          <p className="po-card-body">
            Our intelligent search engine and precision filters surface the properties that truly match what you&apos;re looking for — not just close enough, but exactly right.
          </p>
        </div>

        <div className="po-card">
          <div className="po-card-header">
            <VerifyIcon />
            <h3 className="po-card-title">Verify</h3>
          </div>
          <p className="po-card-body">
            Found something you love? Check what real tenants and buyers have to say. Every lister on our platform is authenticated — no reviews yet means no risk, because we only host listers who deliver.
          </p>
        </div>

        <div className="po-card">
          <div className="po-card-header">
            <ConnectIcon />
            <h3 className="po-card-title">Connect</h3>
          </div>
          <p className="po-card-body">
            Ready to take the next step? Reach out directly
            to property listers hrough our secure messaging system — no middlemen, no delays,
            ust a direct line to your future home.
          </p>
        </div>
      </div>

      {/* CTA Button */}
      <Link href="/properties">
        <button className="po-cta-btn">
          Browse Our Catalog →
        </button>
      </Link>

    </section>
  );
}