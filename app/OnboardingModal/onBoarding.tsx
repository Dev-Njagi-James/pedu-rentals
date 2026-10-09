"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import styles from "./OnboardingModal.module.css";
import {
  getVisitorProfile,
  markOnboardingComplete,
  type VisitorProfile,
} from "./visitorTracking";

/**
 * Swap these paths to change the onboarding photography.
 * Place the files in your app's /public/images/onboarding/ directory.
 */
const ONBOARDING_IMAGES = {
  welcome: "/welcome-home.jpg",
  benefits: "/property-entry.jpg",
  activation: "/home-interior.jpg",
};

const SLIDES = [
  {
    image: ONBOARDING_IMAGES.welcome,
    imageAlt: "A welcoming home available to rent",
    title: "Find your next home",
    description:
      "Browse properties, compare options, and find a place that fits your needs. You can explore listings before creating an account.",
    action: "Continue",
  },
  {
    image: ONBOARDING_IMAGES.benefits,
    imageAlt: "A property entrance with a location marker",
    title: "Unlock the full property details",
    description:
      "Create an account and activate a 24-hour subscription. It is currently free.",
    benefits: [
      "Exact location on Google Maps",
      "Exact location name",
      "Agent contact number",
    ],
    note: "Your 24 hours start when you activate.",
    action: "Continue",
  },
  {
    image: ONBOARDING_IMAGES.activation,
    imageAlt: "A bright and welcoming rental home interior",
    title: "Get started with free access",
    description:
      "The 24-hour subscription is currently free. Your 24 hours start as soon as you activate. If pricing changes in the future, we’ll let you know in advance.",
    helper:
      "After creating your account, activate your 24-hour subscription from the profile menu.",
    action: "Create an account",
  },
] as const;

type OnboardingModalProps = {
  /** Pass the current authentication state from your auth provider. */
  isAuthenticated: boolean;
  /** Set this true to open onboarding manually from a help/settings link. */
  forceOpen?: boolean;
  /** Point these at the sign-up and sign-in routes used by your app. */
  createAccountHref?: string;
  signInHref?: string;
  onVisitorProfile?: (profile: VisitorProfile) => void;
};

export default function OnboardingModal({
  isAuthenticated,
  forceOpen = false,
  createAccountHref = "/Auth",
  signInHref = "/Auth",
  onVisitorProfile,
}: OnboardingModalProps) {
  const [activeSlide, setActiveSlide] = useState(0);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const profile = getVisitorProfile(isAuthenticated);
    onVisitorProfile?.(profile);
    setIsOpen(forceOpen || profile.shouldShowOnboarding);
  }, [isAuthenticated, forceOpen, onVisitorProfile]);

  useEffect(() => {
    if (!isOpen) return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeOnboarding();
    };

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
    };
    // closeOnboarding is stable for this component instance.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  function closeOnboarding() {
    markOnboardingComplete();
    setIsOpen(false);
  }

  function continueToNextSlide() {
    setActiveSlide((current) => Math.min(current + 1, SLIDES.length - 1));
  }

  function handleCreateAccount() {
    markOnboardingComplete();
  }

  if (!isOpen || (isAuthenticated && !forceOpen)) return null;

  const slide = SLIDES[activeSlide];
  const isFinalSlide = activeSlide === SLIDES.length - 1;

  return (
    <div
      className={styles.backdrop}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) closeOnboarding();
      }}>
      <section
        className={styles.dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby="pedu-onboarding-title"
        aria-describedby="pedu-onboarding-description">
        <button
          type="button"
          className={styles.closeButton}
          onClick={closeOnboarding}
          aria-label="Close onboarding">
          ×
        </button>

        <div className={styles.copyPanel}>
          <div className={styles.brand}>Pedu Rentals</div>
          <h1 id="pedu-onboarding-title" className={styles.title}>
            {slide.title}
          </h1>
          <p id="pedu-onboarding-description" className={styles.description}>
            {slide.description}
          </p>

          {"benefits" in slide && (
            <ul className={styles.benefits}>
              {slide.benefits.map((benefit) => (
                <li key={benefit}>
                  <span className={styles.check} aria-hidden="true">
                    ✓
                  </span>
                  <span>{benefit}</span>
                </li>
              ))}
            </ul>
          )}

          {"note" in slide && <p className={styles.note}>{slide.note}</p>}
          {"helper" in slide && <p className={styles.helper}>{slide.helper}</p>}

          <div className={styles.progress} aria-label={`Step ${activeSlide + 1} of ${SLIDES.length}`}>
            {SLIDES.map((item, index) => (
              <span
                key={item.title}
                className={`${styles.progressDot} ${index === activeSlide ? styles.progressDotActive : ""}`}
              />
            ))}
          </div>

          {isFinalSlide ? (
            <div className={styles.finalActions}>
              <Link
                className={styles.primaryButton}
                href={createAccountHref}
                onClick={handleCreateAccount}>
                {slide.action}
              </Link>
              <Link
                className={styles.accountLink}
                href={signInHref}
                onClick={handleCreateAccount}>
                Already have an account? Sign in
              </Link>
              <button
                type="button"
                className={styles.textButton}
                onClick={closeOnboarding}>
                Continue browsing
              </button>
            </div>
          ) : (
            <div className={styles.stepActions}>
              <button
                type="button"
                className={styles.primaryButton}
                onClick={continueToNextSlide}>
                {slide.action}
              </button>
              <button
                type="button"
                className={styles.textButton}
                onClick={closeOnboarding}>
                Skip for now
              </button>
            </div>
          )}

          {activeSlide > 0 && (
            <button
              type="button"
              className={styles.backButton}
              onClick={() => setActiveSlide((current) => Math.max(current - 1, 0))}>
              Back
            </button>
          )}
        </div>

        <div className={styles.imagePanel}>
          <Image
            src={slide.image}
            alt={slide.imageAlt}
            fill
            priority={activeSlide === 0}
            sizes="(max-width: 720px) 90vw, (max-width: 1100px) 42vw, 40vw"
            className={styles.image}
          />
        </div>
      </section>
    </div>
  );
}
