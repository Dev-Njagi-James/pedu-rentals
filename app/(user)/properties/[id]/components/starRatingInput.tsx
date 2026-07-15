'use client';
import { useState } from 'react';
import styles from '../css/starRatingInput.module.css';

export default function StarRatingInput({ rating, onChange }) {
  const [hovered, setHovered] = useState(0);

  return (
    <div className={styles.stars}>
      {[1, 2, 3, 4, 5].map(star => (
        <button
          key={star}
          type="button"
          className={`${styles.star} ${star <= (hovered || rating) ? styles.starActive : ''}`}
          onMouseEnter={() => setHovered(star)}
          onMouseLeave={() => setHovered(0)}
          onClick={() => onChange(star)}
          aria-label={`Rate ${star} star${star > 1 ? 's' : ''}`}
        >
          ★
        </button>
      ))}
    </div>
  );
}