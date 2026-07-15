import React from "react";
import Link from 'next/link'
import Image from 'next/image'
import "./css/footer.css";

const HomeIcon = () => (
  <svg className="footer-brand-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z" />
    <path d="M9 21V12h6v9" />
  </svg>
);

const WhatsAppIcon = () => (
  <svg className="footer-social-icon" viewBox="0 0 24 24" fill="currentColor" stroke="none">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
    <path d="M12 0C5.373 0 0 5.373 0 12c0 2.127.558 4.122 1.528 5.855L.057 23.012a.75.75 0 0 0 .931.931l5.127-1.474A11.953 11.953 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.75a9.725 9.725 0 0 1-4.929-1.341l-.355-.21-3.666 1.054 1.036-3.588-.229-.368A9.712 9.712 0 0 1 2.25 12C2.25 6.615 6.615 2.25 12 2.25S21.75 6.615 21.75 12 17.385 21.75 12 21.75z" />
  </svg>
);

const InstagramIcon = () => (
  <svg className="footer-social-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="2" width="20" height="20" rx="5" />
    <circle cx="12" cy="12" r="4" />
    <circle cx="17.5" cy="6.5" r="0.5" fill="currentColor" stroke="none" />
  </svg>
);

const FacebookIcon = () => (
  <svg className="footer-social-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 2h-3a5 5 0 00-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 011-1h3z" />
  </svg>
);

const TwitterIcon = () => (
  <svg className="footer-social-icon" viewBox="0 0 24 24" fill="currentColor" stroke="none">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.737-8.835L2.25 2.25h6.865l4.265 5.638L18.244 2.25zm-1.161 17.52h1.833L7.084 4.126H5.117L17.083 19.77z" />
  </svg>
);

const PhoneIcon = () => (
  <svg className="footer-contact-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.81 19.79 19.79 0 010 1.18 2 2 0 012 0h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 14.92z" />
  </svg>
);

const MailIcon = () => (
  <svg className="footer-contact-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="4" width="20" height="16" rx="2" />
    <polyline points="2,4 12,13 22,4" />
  </svg>
);

const TikTokIcon = () => (
  <svg className="footer-social-icon" viewBox="0 0 24 24" fill="currentColor" stroke="none">
    <path d="M16.6 5.82a4.28 4.28 0 0 1-3.08-1.3 4.28 4.28 0 0 1-1.2-2.42h-3.05v13.6a2.59 2.59 0 1 1-1.83-2.48v-3.1a5.6 5.6 0 1 0 4.88 5.58V9.4a7.3 7.3 0 0 0 4.28 1.38V7.72a4.28 4.28 0 0 1-0-1.9z" />
  </svg>
);

export default function Footer() {
  return (
    <footer className="footer">
      <div className="footer-inner">

        {/* Col 1 — Brand */}
        <div className="footer-brand">
          <span>
            <Image
              width={34}
              height={34}
              alt="Logo"
              src='/logo2.png' />
          </span>
          <p className="footer-brand-name">Pedu Rental<br />Systems</p>
          <p className="footer-tagline">Structured Listings.</p>
          <p className="footer-tagline">Predictable Returns</p>
          <div className="footer-socials">
            <a href="https://wa.me/254142770201"
              target="_blank"
              rel="noopener noreferrer"
              className="footer-contact-item"
            >
              <WhatsAppIcon />
            </a>
            <a href="#" aria-label="TikTok" className="footer-social-link"><TikTokIcon /></a>
            <a href="#" aria-label="Instagram" className="footer-social-link"><InstagramIcon /></a>
            <a href="#" aria-label="Facebook" className="footer-social-link"><FacebookIcon /></a>
          </div>
        </div>

        {/* Col 2 — Contact + Property Type */}
        <div className="footer-col">
          <div className="footer-group">
            <h4 className="footer-col-heading">
              <span className="footer-heading-underline">Contact</span> Us
            </h4>
            <div className="footer-contact-list">
              <a href="tel:+254701999999" className="footer-contact-item">
                <PhoneIcon />
                <span>0142770201</span>
              </a>
              <a href="mailto:goldenrentalsystems@gmail.com" className="footer-contact-item">
                <MailIcon />
                <span>pedurentals@gmail.com</span>
              </a>
            </div>
          </div>

          <div className="footer-group">
            <h4 className="footer-col-heading">
              <span className="footer-heading-underline">Property</span> Type
            </h4>
            {/*
            Swapped from /properties to / due to the change in order of the 
            page display
             */}
            <ul className="footer-link-list">
              <li><Link href="/?category_id=1" className="footer-link">Rental Apartments</Link></li>
              <li><Link href="/?category_id=2" className="footer-link">Airbnbs</Link></li>
              <li><Link href="/?category_id=3" className="footer-link">Commercial Spaces</Link></li>
              <li><Link href="/?category_id=4" className="footer-link">Lodgings</Link></li>
              <li><Link href="/?category_id=5" className="footer-link">Private Houses and Homes</Link></li>
              <li><Link href="/?category_id=2" className="footer-link">Hostels</Link></li>
            </ul>
          </div>
        </div>

        {/* Col 3 — Links */}
        <div className="footer-col">
          <h4 className="footer-col-heading">
            <span className="footer-heading-underline">Links</span>
          </h4>
          <ul className="footer-link-list">
            <li><Link href="/" className="footer-link">Home</Link></li>
            <li><Link href="/properties" className="footer-link">Properties</Link></li>
            <li><Link href="/about" className="footer-link">About</Link></li>
          </ul>
        </div>

      </div>

      {/* Divider + Copyright */}
      <div className="footer-bottom">
        <div className="footer-divider" />
        <div className="footer-bottom-row">
          <p className="footer-copy">PeduRentals©2026</p>
          <div className="footer-legal-links">
            <Link href="/legal?doc=terms" className="footer-legal-link">Terms & Conditions</Link>
            <span className="footer-legal-sep">·</span>
            <Link href="/legal?doc=privacy" className="footer-legal-link">Privacy Policy</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}