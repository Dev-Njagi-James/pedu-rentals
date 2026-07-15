'use client';
import { useState, useEffect } from 'react';
import styles from '@/app/(user)/properties/[id]/css/ReviewPrompt.module.css';

const REVIEW_EXPIRY_MS = 2 * 60 * 1000;

export default function ReviewPrompt() {
  const [ pending, setPending ] = useState(null);   // { listing_id, listing_name, timestamp }
  const [ rating, setRating ] = useState(0);
  const [ hovered, setHovered ] = useState(0);
  const [ reviewText, setReviewText ] = useState('');
  const [ submitting, setSubmitting ] = useState(false);
  const [ submitted, setSubmitted ] = useState(false);
  const [ error, setError ] = useState(null);

  useEffect(() => {
    function checkPending() {
      const raw = localStorage.getItem('pending_review');
      if (!raw) return;

      try {
        const parsed = JSON.parse(raw);
        setPending(parsed);
      } catch {
        localStorage.removeItem('pending_review');
      }
    }

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') checkPending();
    };

    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, []);

  const handleDismiss = () => {
    localStorage.removeItem('pending_review');
    setPending(null);
  };

  const handleSubmit = async () => {
    if (rating === 0) return;
    setSubmitting(true);
    setError(null);

    const fingerprint = localStorage.getItem('cr_fingerprint');

    try {
      const res = await fetch(`/api/listings/${pending.listing_id}/reviews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fingerprint,
          rating,
          review_text: reviewText.trim() || null,
        }),
      });

      if (!res.ok) {
        const json = await res.json();
        if (res.status === 409) {
          localStorage.removeItem('pending_review');
          setSubmitted(true);
          return;
        }
        throw new Error(json.error ?? 'Submission failed');
      }

      localStorage.setItem(`reviewed:${pending.listing_id}`, '1');
      localStorage.removeItem('pending_review');
      setSubmitted(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  useEffect(() => {
    if (!submitted) return;
    const t = setTimeout(() => setPending(null), 2000);
    return () => clearTimeout(t);
  }, [ submitted ]);

  if (!pending) return null;

  return (
    <div className={styles.overlay} onClick={handleDismiss}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>

        <div className={styles.header}>
          <span className={styles.headerTitle}>Rate this listing</span>
          <button className={styles.closeBtn} onClick={handleDismiss} aria-label="Dismiss">
            &#x2715;
          </button>
        </div>

        {submitted ? (
          <div className={styles.successState}>
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="var(--primary)" strokeWidth="1.5" />
              <path d="M7 12.5l3.5 3.5 6-7" stroke="var(--primary)" strokeWidth="1.8"
                strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <p>Review submitted.</p>
          </div>
        ) : (
          <div className={styles.body}>
            <p className={styles.listingName}>{pending.listing_name}</p>

            {/* Star rating */}
            <div className={styles.stars}>
              {[ 1, 2, 3, 4, 5 ].map(star => (
                <button
                  key={star}
                  className={`${styles.star} ${star <= (hovered || rating) ? styles.starActive : ''}`}
                  onMouseEnter={() => setHovered(star)}
                  onMouseLeave={() => setHovered(0)}
                  onClick={() => setRating(star)}
                  aria-label={`Rate ${star} star${star > 1 ? 's' : ''}`}
                >
                  ★
                </button>
              ))}
            </div>

            {/* Optional review text */}
            <textarea
              className={styles.textarea}
              placeholder="Share your experience (optional)"
              value={reviewText}
              onChange={e => setReviewText(e.target.value)}
              rows={3}
              maxLength={500}
            />

            {error && <p className={styles.error}>{error}</p>}

            <div className={styles.actions}>
              <button className={styles.dismissBtn} onClick={handleDismiss}>
                Skip
              </button>
              <button
                className={styles.submitBtn}
                onClick={handleSubmit}
                disabled={rating === 0 || submitting}
              >
                {submitting ? 'Submitting...' : 'Submit Review'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}