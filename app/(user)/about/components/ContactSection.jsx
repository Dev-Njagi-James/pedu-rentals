'use client'
import React, { useState, useRef, useEffect } from "react";
import "../css/ContactSection.css";
import { toast } from 'sonner';


const categories = [
  {
    id: "general",
    title: "General Inquiries",
    desc: "For platform guidance, account assistance, or listing questions.",
    btnLabel: "Talk To Us →",
  },
  {
    id: "listings",
    title: "Property Listings",
    desc: "For agents, landlords, and listers seeking onboarding or subscription details.",
    btnLabel: "Listers →",
  },
  {
    id: "support",
    title: "Support",
    desc: "For technical concerns, payment confirmations, or verification updates.",
    btnLabel: "Talk To Us →",
  },
];

function FadeIn({ children, delay = 0 }) {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([ entry ]) => {
        if (entry.isIntersecting) {
          el.style.transitionDelay = `${delay}s`;
          el.classList.add("ct-visible");
          observer.disconnect();
        }
      },
      { threshold: 0.12 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [ delay ]);
  return (
    <div className="ct-fade" ref={ref}>
      {children}
    </div>
  );
}

export default function ContactSection() {
  const [ form, setForm ] = useState({ email: "", body: "" });
  const [ status, setStatus ] = useState(null); // null | "sending" | "sent"

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [ e.target.name ]: e.target.value }));
  };

  const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)



const handleSend = async () => {
  if (!form.email || !isValidEmail(form.email)) {
    toast.error('Enter a valid email address.');
    return;
  }
  if (!form.body.trim()) {
    toast.error('Message cannot be empty.');
    return;
  }
  setStatus("sending");

  try {
    const res = await fetch('/api/contact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error ?? 'failed');
    setStatus("sent");
    setForm({ email: "", body: "" });
    toast.success('Message sent.');
  } catch (err) {
    console.error('contact error:', err.message);
    toast.error('Failed to send. Try again.');
    setStatus(null);
  }
};

  return (
    <section className="ct-section">
      {/* Headline */}
      <FadeIn delay={0}>
        <div className="ct-headline-wrap">
          <div className="ct-headline-bar" />
          <h2 className="ct-headline">Have Something Different In Mind</h2>
        </div>
        <p className="ct-subtitle">
          At Pedu Rentals, communication is direct and purposeful. Whether you are a tenant seeking clarification or a property owner ready to list, our team handles inquiries with precision and confidentiality.
        </p>
      </FadeIn>

      {/* Category Grid */}
      <div className="ct-grid">
        {categories.map((cat, i) => (
          <FadeIn key={cat.id} delay={0.1 + i * 0.1}>
            <div className="ct-cat-card">
              <h3 className="ct-cat-title">{cat.title}</h3>
              <p className="ct-cat-desc">{cat.desc}</p>
              <button className="ct-cat-btn">{cat.btnLabel}</button>
            </div>
          </FadeIn>
        ))}

        {/* Office location chip */}
        <FadeIn delay={0.4}>
          <div className="ct-office-chip">
            <span className="ct-office-label">Office Location</span>
            <span className="ct-office-value">Nairobi, Kenya</span>
          </div>
        </FadeIn>
      </div>

      {/* Contact Form */}
      <FadeIn delay={0.2}>
        <div className="ct-form-wrap">
          <h3 className="ct-form-title">Contact Form</h3>

          <div className="ct-form-card">
            <div className="ct-field">
              <label className="ct-label" htmlFor="ct-email">Email :</label>
              <input
                id="ct-email"
                name="email"
                type="email"
                className="ct-input"
                placeholder="Enter your Email"
                value={form.email}
                onChange={handleChange}
              />
            </div>

            <div className="ct-field">
              <label className="ct-label" htmlFor="ct-body">Body</label>
              <textarea
                id="ct-body"
                name="body"
                className="ct-textarea"
                placeholder="Enter Your Message"
                rows={6}
                value={form.body}
                onChange={handleChange}
              />
            </div>

            <button
              className={`ct-send-btn ${status === "sending" ? "ct-send-btn--sending" : ""} ${status === "sent" ? "ct-send-btn--sent" : ""}`}
              onClick={handleSend}
              disabled={status === "sending" || status === "sent"}
            >
              {status === "sending" ? "Sending..." : status === "sent" ? "Sent ✓" : "Send"}
            </button>
          </div>
        </div>
      </FadeIn>
    </section>
  );
}