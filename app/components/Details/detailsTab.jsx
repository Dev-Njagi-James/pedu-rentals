'use client';

import { useState, useEffect } from 'react';
import styles from '../css/Details/detailsTab.module.css';

const TABS = [ 'Description', 'Property Location', 'Reviews' ];

function convertToEmbedUrl(url) {
  if (!url) return null;
  if (url.includes('/maps/embed')) return url;
  return url;
}

function Stars({ rating }) {
  return (
    <span className={styles.stars}>
      {[ 1, 2, 3, 4, 5 ].map(n => (
        <span key={n} className={rating >= n ? styles.starFilled : styles.starEmpty}>
          ★
        </span>
      ))}
    </span>
  );
}

export default function PropertyTabs({ listing }) {
  const { description, property_location, listing_id } = listing;
  const [ active, setActive ] = useState('Description');
  const [ reviews, setReviews ] = useState([]);
  const [ reviewsLoading, setReviewsLoading ] = useState(false);
  const [ reviewsError, setReviewsError ] = useState(null);

  const embedUrl = convertToEmbedUrl(property_location);

  useEffect(() => {
    if (active !== 'Reviews') return;
    if (reviews.length > 0) return; // already fetched

    setReviewsLoading(true);
    setReviewsError(null);

    fetch(`/api/listings/${listing_id}/reviews`)
      .then(r => { if (!r.ok) throw new Error('Failed to fetch reviews'); return r.json(); })
      .then(json => setReviews(json.data ?? []))
      .catch(e => setReviewsError(e.message))
      .finally(() => setReviewsLoading(false));
  }, [ active, listing_id ]);

  return (
    <div className={styles.tabsContainer}>
      {/* Tab bar */}
      <div className={styles.tabBar} role="tablist">
        {TABS.map(tab => (
          <button
            key={tab}
            role="tab"
            aria-selected={active === tab}
            className={`${styles.tab} ${active === tab ? styles.tabActive : ''}`}
            onClick={() => setActive(tab)}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Tab panels */}
      <div className={styles.panel} role="tabpanel">
        {active === 'Description' && (
          <div className={styles.description}>
            {description ? (
              <p>{description}</p>
            ) : (
              <p className={styles.empty}>No description provided.</p>
            )}
          </div>
        )}

        {active === 'Property Location' && (
          <div className={styles.mapWrap}>
            {embedUrl ? (
              <iframe
                src={embedUrl}
                className={styles.mapIframe}
                allowFullScreen
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                title="Property location map"
              />
            ) : (
              <div className={styles.mapEmpty}>
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none">
                  <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7Z"
                    stroke="currentColor" strokeWidth="1.4" />
                  <circle cx="12" cy="9" r="2.5" stroke="currentColor" strokeWidth="1.2" />
                </svg>
                <span>Location not available</span>
              </div>
            )}
          </div>
        )}

        {active === 'Reviews' && (
          <div className={styles.reviewsPanel}>
            {reviewsLoading && (
              <div className={styles.reviewsLoading}>
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className={styles.reviewSkeleton} />
                ))}
              </div>
            )}

            {reviewsError && (
              <p className={styles.empty}>Failed to load reviews.</p>
            )}

            {!reviewsLoading && !reviewsError && reviews.length === 0 && (
              <p className={styles.empty}>No reviews yet for this listing.</p>
            )}

            {!reviewsLoading && !reviewsError && reviews.length > 0 && (
              <div className={styles.reviewsList}>
                {reviews.map(r => (
                  <div key={r.review_id} className={styles.reviewCard}>
                    <div className={styles.reviewLeft}>
                      <div className={styles.reviewAvatar}>U</div>
                      {r.review_text && (
                        <p className={styles.reviewComment}>{r.review_text}</p>
                      )}
                    </div>
                    <div className={styles.reviewTop}>
                      <Stars rating={Number(r.rating)} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}