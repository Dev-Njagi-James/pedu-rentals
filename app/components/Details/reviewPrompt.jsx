'use client';
import { useState } from 'react';
import { toast } from 'sonner';
import styles from '../css/Properties/ReviewPrompt.module.css';

export default function ReviewForm({ listing_id, listing_name }) {
  const [ rating, setRating ] = useState(0);
  const [ hovered, setHovered ] = useState(0);
  const [ reviewText, setReviewText ] = useState('');
  const [ submitting, setSubmitting ] = useState(false);
  const [ submitted, setSubmitted ] = useState(false);
  const [ error, setError ] = useState(null);

  const handleSubmit = async () => {
    if (rating === 0) {
      toast.error('Please select a star rating.');
      return;
    }
    if (!reviewText.trim()) {
      toast.error('Please write a review before submitting.');
      return;
    }
    setSubmitting(true);
    setError(null);

    const fingerprint = localStorage.getItem('cr_fingerprint') ?? (() => {
      const id = crypto.randomUUID();
      localStorage.setItem('cr_fingerprint', id);
      return id;
    })();

    try {
      const res = await fetch(`/api/listings/${listing_id}/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fingerprint,
          rating,
          review_text: reviewText.trim(),
        }),
      });

      if (!res.ok) {
        const json = await res.json();
        if (res.status === 409) {
          localStorage.setItem(`reviewed:${listing_id}`, '1');
          setSubmitted(true);
          return;
        }
        throw new Error(json.error ?? 'Submission failed');
      }

      localStorage.setItem(`reviewed:${listing_id}`, '1');
      setSubmitted(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className={styles.successState}>
        <svg width="36" height="36" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="10" stroke="var(--primary)" strokeWidth="1.5" />
          <path d="M7 12.5l3.5 3.5 6-7" stroke="var(--primary)" strokeWidth="1.8"
            strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <p>Review submitted.</p>
      </div>
    );
  }

  return (
    <div className={styles.body}>
      <p className={styles.listingName}>{listing_name}</p>

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

      <textarea
        className={styles.textarea}
        placeholder="Share your mind"
        value={reviewText}
        onChange={e => setReviewText(e.target.value)}
        maxLength={500}
      />

      {error && <p className={styles.error}>{error}</p>}

      <div className={styles.actions}>
        <button
          className={styles.submitBtn}
          onClick={handleSubmit}
          disabled={rating === 0 || submitting}
        >
          {submitting ? 'Submitting...' : 'Submit Review'}
        </button>
      </div>
    </div>
  );
}