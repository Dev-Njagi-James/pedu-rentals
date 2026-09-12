"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import Image from "next/image";
import styles from "../css/Analytics.module.css";
import { buildCdnImageUrl } from "@/lib/utils/cdnImage";
import { getCached, isCacheFresh, setCached } from "@/lib/cache/analyticsCache";

// ─── Icons ────────────────────────────────────────────────────────────────────
function EyeIcon({ size = 15 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function PhoneIcon({ size = 15 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round">
      <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.8a19.79 19.79 0 01-3.07-8.64A2 2 0 012 0h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.91 7.91a16 16 0 006.16 6.16l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z" />
    </svg>
  );
}

function StarIcon({ filled, size = 13 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  );
}

function MessageIcon({ size = 15 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round">
      <path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z" />
    </svg>
  );
}

function PinIcon() {
  return (
    <svg
      width="11"
      height="11"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round">
      <path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0118 0z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

// ─── Stars ────────────────────────────────────────────────────────────────────
function Stars({ rating }) {
  return (
    <span className={styles.stars}>
      {[1, 2, 3, 4, 5].map((n) => (
        <span
          key={n}
          className={rating >= n ? styles.starFilled : styles.starEmpty}>
          <StarIcon filled={rating >= n} />
        </span>
      ))}
    </span>
  );
}

// ─── Reviews Modal ────────────────────────────────────────────────────────────
function ReviewsModal({ listing, onClose }) {
  const [reviews, setReviews] = useState([]);
  const [reviewsLoading, setReviewsLoading] = useState(true);
  const [reviewsError, setReviewsError] = useState(null);

  useEffect(() => {
    fetch(`/api/v1/listings/reviews?listing_id=${listing.listing_id}`)
      .then((r) => {
        if (!r.ok) throw new Error("Failed to fetch reviews.");
        return r.json();
      })
      .then((json) => setReviews(json.data ?? []))
      .catch((e) => setReviewsError(e.message))
      .finally(() => setReviewsLoading(false));
  }, [listing.listing_id]);

  const handleBackdrop = (e) => {
    if (e.target === e.currentTarget) onClose();
  };

  useEffect(() => {
    const handler = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <div
      className={styles.backdrop}
      onClick={handleBackdrop}
      role="dialog"
      aria-modal="true">
      <div className={styles.modal}>
        {/* Header */}
        <div className={styles.modalHeader}>
          <div className={styles.modalHeaderLeft}>
            {listing.image_url &&
              (() => {
                const { src, isTransformed } = buildCdnImageUrl(
                  listing.image_url,
                  {
                    width: 48,
                    height: 48,
                  },
                );
                return (
                  <div className={styles.modalThumb}>
                    <Image
                      src={src}
                      alt={listing.listing_name}
                      fill
                      unoptimized={isTransformed}
                      style={{ objectFit: "cover" }}
                      sizes="48px"
                    />
                  </div>
                );
              })()}
            <div>
              <p className={styles.modalLabel}>Reviews</p>
              <h3 className={styles.modalTitle}>{listing.listing_name}</h3>
              {(listing.ward_name || listing.ward_location) && (
                <p className={styles.modalLocation}>
                  <PinIcon />
                  {[listing.ward_name, listing.ward_location]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
              )}
            </div>
          </div>
          <button
            className={styles.closeBtn}
            onClick={onClose}
            aria-label="Close">
            <CloseIcon />
          </button>
        </div>

        {/* Summary strip */}
        <div className={styles.modalSummary}>
          <span className={styles.modalRating}>
            {listing.avg_rating > 0 ? listing.avg_rating : "—"}
          </span>
          <Stars rating={Math.round(listing.avg_rating ?? 0)} />
          <span className={styles.modalReviewCount}>
            {listing.review_count} review{listing.review_count !== 1 ? "s" : ""}
          </span>
        </div>

        {/* Review cards */}
        <div className={styles.reviewList}>
          {reviewsLoading && (
            <div className={styles.detailSkeletons}>
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className={styles.detailSkeleton} />
              ))}
            </div>
          )}

          {reviewsError && <p className={styles.errorBanner}>{reviewsError}</p>}

          {!reviewsLoading && !reviewsError && reviews.length === 0 && (
            <div className={styles.emptyState}>
              <p>No reviews yet for this listing.</p>
            </div>
          )}

          {!reviewsLoading &&
            !reviewsError &&
            reviews.map((r) => (
              <div key={r.review_id} className={styles.reviewCard}>
                <div className={styles.reviewTop}>
                  <div className={styles.reviewAvatar}>
                    {(r.fingerprint ?? "?").charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className={styles.reviewName}>Anonymous</p>
                    <Stars rating={r.rating} />
                  </div>
                </div>
                {r.review_text && (
                  <p className={styles.reviewComment}>{r.review_text}</p>
                )}
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}

// ─── Detail row ───────────────────────────────────────────────────────────────
function ListingRow({ listing, onReviewsClick }) {
  return (
    <div
      className={styles.detailRow}
      onClick={() => onReviewsClick(listing)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") onReviewsClick(listing);
      }}>
      {/* Thumbnail */}
      <div className={styles.rowThumb}>
        {listing.image_url ? (
          (() => {
            const { src, isTransformed } = buildCdnImageUrl(listing.image_url, {
              width: 64,
              height: 64,
            });
            return (
              <Image
                src={src}
                alt={listing.listing_name}
                fill
                unoptimized={isTransformed}
                style={{ objectFit: "cover" }}
                sizes="64px"
              />
            );
          })()
        ) : (
          <div className={styles.rowThumbFallback} />
        )}
      </div>

      {/* Name + location */}
      <div className={styles.detailMeta}>
        <p className={styles.detailName}>{listing.listing_name}</p>
        {(listing.ward_name || listing.ward_location) && (
          <p className={styles.detailLocation}>
            <span className={styles.detailLocationIcon}>
              <PinIcon />
            </span>
            {[listing.ward_name, listing.ward_location]
              .filter(Boolean)
              .join(" · ")}
          </p>
        )}
        <span className={styles.moreDetails}>more details…</span>
      </div>

      {/* Stats */}
      <div className={styles.detailStats}>
        <span className={styles.statChip}>
          <span className={styles.statIcon}>
            <EyeIcon />
          </span>
          {(listing.views ?? 0).toLocaleString()}
        </span>
        <span className={styles.statChip}>
          <span className={styles.statIcon}>
            <PhoneIcon />
          </span>
          {(listing.call_logs ?? 0).toLocaleString()}
        </span>
        <span className={styles.statChip}>
          <span className={styles.statIcon}>
            <StarIcon size={13} />
          </span>
          {listing.avg_rating > 0 ? listing.avg_rating : "—"}
        </span>
        <span className={styles.statChip}>
          {listing.review_count} review{listing.review_count !== 1 ? "s" : ""}
        </span>
      </div>
    </div>
  );
}

// ─── Summary Card ─────────────────────────────────────────────────────────────
function SummaryCard({ label, value, decimals = 0, icon, colorClass }) {
  const display =
    typeof value === "number"
      ? decimals > 0
        ? value.toFixed(decimals)
        : value.toLocaleString()
      : value;

  return (
    <div className={`${styles.card} ${styles[colorClass]}`}>
      <div className={styles.cardIcon}>{icon}</div>
      <div className={styles.cardBody}>
        <span className={styles.cardLabel}>{label}</span>
        <span className={styles.cardValue}>{display}</span>
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function Analytics() {
  const [summary, setSummary] = useState(null);
  const [listings, setListings] = useState([]);
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [listingsLoading, setListingsLoading] = useState(true);
  const [summaryError, setSummaryError] = useState(null);
  const [listingsError, setListingsError] = useState(null);
  const [activeModal, setActiveModal] = useState(null);

  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const fetchSummary = useCallback(
    ({ showLoading = true, bypassCache = false } = {}) => {
      const cached = !bypassCache ? getCached("summary") : null;

      // Cache hit — render instantly, no skeleton.
      if (cached) {
        setSummary(cached.data);
        setSummaryLoading(false);
        setSummaryError(null);

        // Stale — refresh silently in the background.
        if (!isCacheFresh(cached)) {
          fetchSummary({ showLoading: false, bypassCache: true });
        }
        return;
      }

      if (showLoading) {
        setSummaryLoading(true);
        setSummaryError(null);
      }

      fetch("/api/analytics/summary")
        .then((r) => {
          if (!r.ok) throw new Error("Failed to fetch summary.");
          return r.json();
        })
        .then((json) => {
          if (!mountedRef.current) return;
          setCached("summary", json);
          // Avoid redundant re-render if nothing actually changed.
          setSummary((prev) =>
            JSON.stringify(prev) !== JSON.stringify(json) ? json : prev,
          );
        })
        .catch((e) => {
          // A failed silent background refresh leaves stale data on screen.
          if (mountedRef.current && showLoading) setSummaryError(e.message);
        })
        .finally(() => {
          if (mountedRef.current && showLoading) setSummaryLoading(false);
        });
    },
    [],
  );

  const fetchListingsData = useCallback(
    ({ showLoading = true, bypassCache = false } = {}) => {
      const cached = !bypassCache ? getCached("listings") : null;

      if (cached) {
        setListings(cached.data);
        setListingsLoading(false);
        setListingsError(null);

        if (!isCacheFresh(cached)) {
          fetchListingsData({ showLoading: false, bypassCache: true });
        }
        return;
      }

      if (showLoading) {
        setListingsLoading(true);
        setListingsError(null);
      }

      fetch("/api/v1/analytics/listings")
        .then((r) => {
          if (!r.ok) throw new Error("Failed to fetch listings.");
          return r.json();
        })
        .then((json) => {
          if (!mountedRef.current) return;
          const nextListings = json.data ?? [];
          setCached("listings", nextListings);
          setListings((prev) =>
            JSON.stringify(prev) !== JSON.stringify(nextListings)
              ? nextListings
              : prev,
          );
        })
        .catch((e) => {
          if (mountedRef.current && showLoading) setListingsError(e.message);
        })
        .finally(() => {
          if (mountedRef.current && showLoading) setListingsLoading(false);
        });
    },
    [],
  );

  useEffect(() => {
    fetchSummary();
    fetchListingsData();
  }, [fetchSummary, fetchListingsData]);

  // ── Aggregate Overview card values from the listings breakdown ──
  const aggregated = useMemo(() => {
    const totalViews = listings.reduce((sum, l) => sum + (l.views ?? 0), 0);
    const totalCalls = listings.reduce((sum, l) => sum + (l.call_logs ?? 0), 0);
    const totalReviews = listings.reduce(
      (sum, l) => sum + (l.review_count ?? 0),
      0,
    );
    const ratingWeightSum = listings.reduce(
      (sum, l) => sum + (l.avg_rating ?? 0) * (l.review_count ?? 0),
      0,
    );
    const avgRating = totalReviews > 0 ? ratingWeightSum / totalReviews : 0;

    return { totalViews, totalCalls, totalReviews, avgRating };
  }, [listings]);

  const handleReviewsClick = useCallback(
    (listing) => setActiveModal(listing),
    [],
  );
  const handleCloseModal = useCallback(() => setActiveModal(null), []);

  return (
    <div className={styles.root}>
      {/* ── Summary Cards ── */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Overview</h2>

        {summaryLoading && (
          <div className={styles.loadingBanner}>Fetching your statistics…</div>
        )}

        {summaryError && <p className={styles.errorBanner}>{summaryError}</p>}

        <div className={styles.grid}>
          <SummaryCard
            label="Total Views"
            value={aggregated.totalViews}
            icon={<EyeIcon size={18} />}
            colorClass="colorBlue"
          />
          <SummaryCard
            label="Total Calls"
            value={aggregated.totalCalls}
            icon={<PhoneIcon size={18} />}
            colorClass="colorAmber"
          />
          <SummaryCard
            label="Total Reviews"
            value={aggregated.totalReviews}
            icon={<MessageIcon size={18} />}
            colorClass="colorTeal"
          />
          <SummaryCard
            label="Total Ratings"
            value={aggregated.avgRating}
            decimals={1}
            icon={<StarIcon size={18} />}
            colorClass="colorPurple"
          />
        </div>
      </section>

      {/* ── Listings Breakdown ── */}
      <article className={styles.section}>
        <h2 className={styles.sectionTitle}>Listings breakdown</h2>
        {listingsError && <p className={styles.errorBanner}>{listingsError}</p>}

        {!listingsLoading && !listingsError && listings.length === 0 && (
          <div className={styles.emptyState}>
            <p>No listings found.</p>
          </div>
        )}

        {(listingsLoading || listings.length > 0) && !listingsError && (
          <div className={styles.detailTable}>
            <div className={styles.detailHeader}>
              <span>Property</span>
              <span className={styles.detailHeaderStats}>
                Views · Calls · Reviews
              </span>
            </div>
            {listings.map((listing) => (
              <ListingRow
                key={listing.listing_id}
                listing={listing}
                onReviewsClick={handleReviewsClick}
              />
            ))}
          </div>
        )}
      </article>

      {/* ── Modal ── */}
      {activeModal && (
        <ReviewsModal listing={activeModal} onClose={handleCloseModal} />
      )}
    </div>
  );
}
