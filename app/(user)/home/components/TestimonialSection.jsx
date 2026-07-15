'use client'
import React, { useEffect, useRef } from "react";
import Image from 'next/image'
import "../css/TestimonialsSection.css";

const testimonials = [
  {
    id: 1,
    name: "Dominic Mwangi",
    company: "Highland Properties Limited",
    avatar: "/avatars/dominic.jpg",
    text: "Since joining the platform, our property listings have become more organized and easier for clients to evaluate. The structured layout and verification features have reduced unnecessary back-and-forth and improved the quality of inquiries we receive.",
  },
  {
    id: 2,
    name: "Grace Lynn",
    company: "VentureWay Properties Limited",
    avatar: "/avatars/grace.jpg",
    text: "The search and filtering system makes it simple for potential clients to find exactly what they are looking for. We have noticed an increase in serious, ready-to-act prospects rather than casual browsers.",
  },
  {
    id: 3,
    name: "Johnson Njenga",
    company: "Bonfire Estates Properties",
    avatar: "/avatars/johnson.jpg",
    text: "Since joining the platform, our property listings have become more organized and easier for clients to evaluate. The structured layout and verification features have reduced unnecessary back-and-forth and improved the quality of inquiries we receive.",
  },
  {
    id: 4,
    name: "Mark Atieno",
    company: "Orkland RealEstate Limited",
    avatar: "/avatars/mark.jpg",
    text: "We started receiving more serious inquiries within weeks. The verification system builds immediate trust.",
  },
];

function TestimonialCard({ testimonial, index }) {
  const cardRef = useRef(null);

  useEffect(() => {
    const el = cardRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.style.animationDelay = `${index * 0.12}s`;
          el.classList.add("tm-card--visible");
          observer.disconnect();
        }
      },
      { threshold: 0.15 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [index]);

  return (
    <div className="tm-card" ref={cardRef}>
      <div className="tm-card-header">
        <div className="tm-avatar-wrap">
          <Image
            src={testimonial.avatar}
            alt={testimonial.name}
            width={56}
            height={56}
            className="tm-avatar"
            onError={(e) => {
              e.currentTarget.style.display = "none";
              e.currentTarget.parentElement.classList.add("tm-avatar-fallback");
              e.currentTarget.parentElement.setAttribute(
                "data-initials",
                testimonial.name
                  .split(" ")
                  .map((n) => n[0])
                  .join("")
                  .slice(0, 2)
              );
            }}
          />
        </div>
        <div className="tm-meta">
          <p className="tm-name">{testimonial.name}</p>
          <p className="tm-company">{testimonial.company}</p>
        </div>
        <div className="tm-quote-mark">&rdquo;</div>
      </div>
      <p className="tm-body">{testimonial.text}</p>
    </div>
  );
}

export default function TestimonialsSection() {
  return (
    <section className="tm-section">
      <h2 className="tm-headline">
        What Do Our{" "}
        <span className="tm-highlight-blue">Listers</span>{" "}
        Have To Say
      </h2>

      <div className="tm-grid">
        {testimonials.map((t, i) => (
          <TestimonialCard key={t.id} testimonial={t} index={i} />
        ))}
      </div>
    </section>
  );
}