'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import styles from '../css/verification.module.css';

const STATUS_STYLES = {
  'SUBSCRIBED': styles.badgeSubscribed,
  'REPORTED':   styles.badgeReported,
  'FREE PLAN':  styles.badgeFreePlan,
  'FREE TIER':  styles.badgeFreePlan,
  'OVERDUE':    styles.badgeOverdue,
};

const FILTER_OPTIONS = ['All', 'SUBSCRIBED', 'REPORTED', 'FREE PLAN', 'OVERDUE'];
const PAGE_SIZE = 25;

export default function VerificationList({ onSelect }) {
  const [listings, setListings] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(null);
  const [filter, setFilter]     = useState('All');
  const [page, setPage]         = useState(1);

  const fetchListings = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/adminRo/verification');
      if (!res.ok) throw new Error('Failed to fetch listings.');
      const json = await res.json();
      setListings(json.data ?? []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchListings(); }, [fetchListings]);

  // reset to page 1 when filter changes
  useEffect(() => { setPage(1); }, [filter]);

  const filtered = filter === 'All'
    ? listings
    : listings.filter(l => l.status === filter);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated  = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handlePageChange = (p) => {
    setPage(p);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className={styles.root}>
      <div className={styles.toolbar}>
        <span className={styles.filterLabel}>Filter By</span>
        <select
          className={styles.filterSelect}
          value={filter}
          onChange={e => setFilter(e.target.value)}
        >
          {FILTER_OPTIONS.map(o => (
            <option key={o} value={o}>{o}</option>
          ))}
        </select>
      </div>

      {error && <p className={styles.errorBanner}>{error}</p>}

      {loading && (
        <div className={styles.cardGrid}>
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className={styles.skeleton} />
          ))}
        </div>
      )}

      {!loading && !error && filtered.length === 0 && (
        <div className={styles.empty}>No listings found.</div>
      )}

      {!loading && (
        <>
          <div className={styles.cardGrid}>
            {paginated.map(listing => {
              const firstImage = listing.media?.[0]?.image_url ?? null;
              const statusKey  = listing.status ?? 'FREE TIER';

              return (
                <div
                  key={listing.listing_id}
                  className={styles.card}
                  onClick={() => onSelect(listing.listing_id)}
                >
                  <div className={styles.cardImage}>
                    {firstImage ? (
                      <Image
                        src={firstImage}
                        alt={listing.property_name}
                        fill
                        sizes="240px"
                        className={styles.listingImage}
                      />
                    ) : (
                      <div className={styles.imagePlaceholder}>
                        <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                          <rect x="3" y="3" width="18" height="18" rx="3" stroke="currentColor" strokeWidth="1.2" />
                          <circle cx="8.5" cy="8.5" r="1.5" stroke="currentColor" strokeWidth="1.2" />
                          <path d="M3 15l5-4 4 4 3-3 6 5" stroke="currentColor" strokeWidth="1.2" />
                        </svg>
                      </div>
                    )}
                    <span className={`${styles.statusBadge} ${STATUS_STYLES[statusKey] ?? styles.badgeOverdue}`}>
                      {statusKey}
                    </span>
                  </div>

                  <div className={styles.cardBody}>
                    <p className={styles.listingName}>{listing.property_name}</p>
                    <p className={styles.listingWard}>{listing.ward_name ?? '—'}</p>

                    <div className={styles.listingMeta}>
                      <span className={styles.metaItem}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                          <circle cx="12" cy="12" r="3" />
                        </svg>
                        {listing.views ?? 0}
                      </span>
                      <span className={styles.metaItem}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
                          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                        </svg>
                        {listing.avg_rating ?? '—'}
                      </span>
                      <span className={styles.metaItem}>
                        {listing.review_count ?? 0} reviews
                      </span>
                    </div>

                    <p className={styles.cardPrice}>
                      KSH {Number(listing.property_price ?? 0).toLocaleString('en-KE')}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          {totalPages > 1 && (
            <div className={styles.pagination}>
              <button
                className={styles.pageBtn}
                onClick={() => handlePageChange(page - 1)}
                disabled={page === 1}
              >&#8592;</button>

              {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                <button
                  key={p}
                  className={`${styles.pageBtn} ${p === page ? styles.pageBtnActive : ''}`}
                  onClick={() => handlePageChange(p)}
                >{p}</button>
              ))}

              <button
                className={styles.pageBtn}
                onClick={() => handlePageChange(page + 1)}
                disabled={page === totalPages}
              >&#8594;</button>
            </div>
          )}
        </>
      )}
    </div>
  );
}