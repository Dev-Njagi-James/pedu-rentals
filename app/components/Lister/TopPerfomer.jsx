'use client';

import { useState, useEffect } from 'react';
import { createBrowserSupabaseClient } from '@/lib/supabase/client';
import styles from '../css/Lister/TopPerformer.module.css';

const supabase = createBrowserSupabaseClient();

function StarRating({ value }) {
  const full = Math.floor(value);
  const half = value - full >= 0.5;
  return (
    <span className={styles.stars}>
      {Array.from({ length: 5 }, (_, i) => {
        if (i < full) return <span key={i} className={`${styles.star} ${styles.starFull}`}>★</span>;
        if (i === full && half) return <span key={i} className={`${styles.star} ${styles.starHalf}`}>★</span>;
        return <span key={i} className={`${styles.star} ${styles.starEmpty}`}>★</span>;
      })}
    </span>
  );
}

function MetricBar({ label, value, total }) {
  const pct = total > 0 ? Math.min(100, Math.round((value / total) * 100)) : 0;
  return (
    <div className={styles.metric}>
      <div className={styles.metricRow}>
        <span className={styles.metricLabel}>{label}</span>
        <span className={styles.metricValue}>{value}</span>
      </div>
      <div className={styles.metricTrack}>
        <div className={styles.metricFill} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export default function TopPerformer() {
  const [ state, setState ] = useState({
    top: null,
    second: null,
    totals: { views: 0, calls: 0, reviews: 0 },
    allReviews: { count: 0, avg: 0 },
    loading: true,
  });

  useEffect(() => {
    const init = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // 1. All listings for this user
        const { data: listings } = await supabase
          .from('Property_Listing')
          .select('listing_id, property_name, views, call_logs, property_price, property_location, ward_name, ward_location')
          .eq('user_id', user.id);

        if (!listings || listings.length === 0) {
          setState(s => ({ ...s, loading: false }));
          return;
        }

        const listingIds = listings.map(l => l.listing_id);

        // 2. Review stats
        const { data: reviews } = await supabase
          .from('listing_reviews')
          .select('listing_id, rating')
          .in('listing_id', listingIds);

        // Group reviews by listing
        const reviewMap = {};
        (reviews ?? []).forEach(r => {
          if (!reviewMap[ r.listing_id ]) reviewMap[ r.listing_id ] = { count: 0, sum: 0 };
          reviewMap[ r.listing_id ].count += 1;
          reviewMap[ r.listing_id ].sum += r.rating;
        });

        // Score each listing
        const scored = listings.map(l => {
          const rv = reviewMap[ l.listing_id ] ?? { count: 0, sum: 0 };
          const score = ((l.views ?? 0) + (l.call_logs ?? 0) + rv.count) / 3;
          return { ...l, reviewCount: rv.count, avgRating: rv.count > 0 ? rv.sum / rv.count : 0, score };
        });

        scored.sort((a, b) => b.score - a.score);
        const top = scored[ 0 ];
        const second = scored[ 1 ] ?? null;

        // Totals across all listings for progress bars
        const totals = {
          views: listings.reduce((s, l) => s + (l.views ?? 0), 0),
          calls: listings.reduce((s, l) => s + (l.call_logs ?? 0), 0),
          reviews: (reviews ?? []).length,
        };

        // All-lister review stats
        const allReviewCount = (reviews ?? []).length;
        const allReviewAvg = allReviewCount > 0
          ? (reviews.reduce((s, r) => s + r.rating, 0) / allReviewCount)
          : 0;

        // 3. Image for top performer
        let topImage = null;
        if (top) {
          const { data: img } = await supabase
            .from('images_table')
            .select('image_url')
            .eq('listing_id', top.listing_id)
            .order('position', { ascending: true })
            .limit(1)
            .single();
          topImage = img?.image_url ?? null;
        }

        // 4. Image for second performer
        let secondImage = null;
        if (second) {
          const { data: img } = await supabase
            .from('images_table')
            .select('image_url')
            .eq('listing_id', second.listing_id)
            .order('position', { ascending: true })
            .limit(1)
            .single();
          secondImage = img?.image_url ?? null;
        }

        setState({
          top: top ? { ...top, image: topImage } : null,
          second: second ? { ...second, image: secondImage } : null,
          totals,
          allReviews: { count: allReviewCount, avg: Math.round(allReviewAvg * 10) / 10 },
          loading: false,
        });
      } catch {
        setState(s => ({ ...s, loading: false }));
      }
    };
    init();
  }, []);

  const { top, second, totals, allReviews, loading } = state;

  if (loading) {
    return (
      <div className={styles.wrapper}>
        <div className={styles.skeleton} />
      </div>
    );
  }

  if (!top) {
    return (
      <div className={styles.wrapper}>
        <div className={styles.emptyPerformer}>
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2">
            <path d="M3 10V20M21 10V20M3 10h18M3 10L12 3l9 7" />
            <rect x="9" y="14" width="6" height="6" />
          </svg>
          <p>No listings yet — add one to see your top performer here.</p>
        </div>
      </div>
    );
  }

  const formatPrice = (p) => {
    const n = Number(p);
    if (isNaN(n)) return p;
    return n.toLocaleString();
  };

  return (
    <div className={styles.wrapper}>
      {/* ── Panel 1: Top Performer ── */}
      <div className={styles.mainCard}>
        <div className={styles.imageBlock}>
          {top.image
            ? <img src={top.image} alt={top.property_name} className={styles.propImage} />
            : <div className={styles.imagePlaceholder} />
          }
        </div>

        <div className={styles.details}>
          <div className={styles.detailsHeader}>
            <span className={styles.badge}>Most Performed Property</span>
            <a href="/dashboard/analytics" className={styles.moreInfo}>More info →</a>
          </div>

          <h3 className={styles.propName}>{top.property_name}</h3>

          <div className={styles.location}>
            {top.ward_name && (
              <span className={styles.locChip}>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" />
                  <circle cx="12" cy="9" r="2.5" />
                </svg>
                {top.ward_name}
              </span>
            )}
            {top.ward_location && (
              <span className={styles.locChip}>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0 1 18 0z" />
                </svg>
                {top.ward_location}
              </span>
            )}
          </div>

          <div className={styles.price}>
            <span className={styles.priceAmount}>
              {formatPrice(top.property_price)}
            </span>
            <span className={styles.priceMo}>/mo</span>
          </div>

          <div className={styles.metrics}>
            <MetricBar label="Views" value={top.views ?? 0} total={totals.views} />
            <MetricBar label="Calls" value={top.call_logs ?? 0} total={totals.calls} />
            <MetricBar label="Reviews" value={top.reviewCount} total={totals.reviews} />
          </div>
        </div>
      </div>

      {/* ── Panel 2: Review stats ── */}
      <div className={styles.sideStack}>
        <div className={styles.reviewCard}>
          <span className={styles.reviewCardLabel}>Total Reviews</span>
          <span className={styles.reviewCardBig}>{allReviews.count}</span>
        </div>

        <div className={styles.ratingCard}>
          <span className={styles.ratingLabel}>Average Rating</span>
          <div className={styles.ratingRow}>
            <span className={styles.ratingNum}>{allReviews.avg}</span>
            <StarRating value={allReviews.avg} />
          </div>
        </div>

        {/* ── Panel 3: Second performer or placeholder ── */}
        {second ? (
          <div className={styles.secondCard}>
            <div className={styles.secondInfo}>
              <span className={styles.secondName}>{second.property_name}</span>
              <div className={styles.secondStats}>
                <span>Calls: <strong>{second.call_logs ?? 0}</strong></span>
                <span>Views: <strong>{second.views ?? 0}</strong></span>
              </div>
            </div>
            <div className={styles.secondThumb}>
              {second.image
                ? <img src={second.image} alt={second.property_name} className={styles.thumbImg} />
                : <div className={styles.thumbPlaceholder} />
              }
            </div>
          </div>
        ) : (
          <div className={`${styles.secondCard} ${styles.secondCardPlaceholder}`}>
            <span className={styles.placeholderText}>Recent Notification</span>
          </div>
        )}
      </div>
    </div>
  );
}