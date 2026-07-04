import React from "react";
import Link from 'next/link'
import "../css/About/PropertyOwnerSection.css";

const RegisterIcon = () => (
  <svg className="po-card-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
);

const CheckIcon = () => (
  <svg className="po-card-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="18" height="18" rx="3" />
    <polyline points="9 12 11 14 15 10" />
  </svg>
);

const PhoneIcon = () => (
  <svg className="po-card-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.81 19.79 19.79 0 01.00 1.18 2 2 0 012 0h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 14.92z" />
  </svg>
);

export default function PropertyOwnerSection() {
  return (
    <section className="po-section">

      {/* Label */}
      <div className="po-label-row">
        <span className="po-label">For Property Owners</span>
        <div className="po-label-line" />
      </div>

      {/* Headline */}
      <h2 className="po-headline">List Once. Let The Calls Come To You.</h2>

      {/* Subtitle */}
      <p className="po-subtitle">
        You have a property. We have the audience. Our streamlined onboarding gets you live in minutes, and our advertising engine makes sure your listing is seen — not buried.
      </p>

      {/* Cards */}
      <div className="po-cards">
        <div className="po-card">
          <div className="po-card-header">
            <RegisterIcon />
            <h3 className="po-card-title">Register</h3>
          </div>
          <p className="po-card-body">
            Create your account and let our system learn your profile. The more we know about you, the better we position your listings in front of the right audience from day one.
          </p>
        </div>

        <div className="po-card">
          <div className="po-card-header">
            <CheckIcon />
            <h3 className="po-card-title">Choose Your Plan</h3>
          </div>
          <p className="po-card-body">
            Start free for 30 days — no credit card pressure, no catch. When you&apos;re ready to scale, our flexible payment plans grow with you. Your success story begins two clicks away.
          </p>
        </div>

        <div className="po-card">
          <div className="po-card-header">
            <PhoneIcon />
            <h3 className="po-card-title">List &amp; Get Noticed</h3>
          </div>
          <p className="po-card-body">
            Upload your property and let our robust advertising engine do the heavy lifting. Your listing won&apos;t sit idle — we push it to the right eyes until the right person calls.
          </p>
        </div>
      </div>

      {/* CTA Button */}
      <Link href="/Auth">
        <button className="po-cta-btn">
          Start Listing — It&apos;s Free →
        </button>
      </Link>

      {/* Quote Section */}
      <div className="po-quote-section">
        <p className="po-quote-text">
          &quot;The Only Thing Standing Between You And Your{" "}
          <span className="po-highlight-yellow">Success Story</span>{" "}
          Is The Decision To <span className="po-highlight-blue">Start</span>.&quot;
        </p>
        <p className="po-quote-sub">
          Whether you&apos;re searching for a place to call home or ready to turn your property into opportunity — your next chapter is already waiting.
        </p>
      </div>

      {/* Bottom Buttons */}
      <div className="po-bottom-btns">
        <Link href="/">
          <button className="po-btn-filled">Browse Properties</button>
        </Link>
        <Link href="/Auth">
          <button className="po-btn-outline">Become A Lister</button>
        </Link>
      </div>

    </section>
  );
}