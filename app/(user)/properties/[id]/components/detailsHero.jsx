'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import StarRatingInput from './starRatingInput';
import styles from '../css/detailsHero.module.css';

function convertToEmbedUrl(url) {
  if (!url) return null;
  if (url.includes('/maps/embed')) return url;
  return url;
}

function PlayIcon() {
  return (
    <svg className={styles.playIcon} viewBox="0 0 48 48" fill="none">
      <circle cx="24" cy="24" r="24" fill="rgba(0,0,0,0.45)" />
      <polygon points="19,14 38,24 19,34" fill="white" />
    </svg>
  );
}

function StarRating({ rating = 0 }) {
  return (
    <div className={styles.starRow}>
      {[ 1, 2, 3, 4, 5 ].map(i => (
        <svg key={i} width="16" height="16" viewBox="0 0 24 24"
          fill={i <= Math.round(rating) ? '#F5A623' : 'none'}
          stroke="#F5A623" strokeWidth="1.4">
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
        </svg>
      ))}
    </div>
  );
}

function Stars({ rating }) {
  return (
    <span className={styles.stars}>
      {[ 1, 2, 3, 4, 5 ].map(n => (
        <span key={n} className={rating >= n ? styles.starFilled : styles.starEmpty}>★</span>
      ))}
    </span>
  );
}

export default function PropertyDetails({ listing }) {
  const {
    property_name,
    property_price,
    property_interior,
    rent_duration,
    category_name,
    type_name,
    ward_name,
    ward_location,
    listing_id,
    phone_number,
    avg_rating,
    review_count,
    description,
    property_location,
    media = [],
    // TODO: backend does not yet return agent data on listing.
    // Expected shape once endpoint exists: { agent_name, agent_avatar_url, agent_verified, agency_name }
    agent_name,
    agent_avatar_url,
    agent_verified,
    agency_name,
  } = listing;

  const [ activeIndex, setActiveIndex ] = useState(0);
  const [ reviews, setReviews ] = useState([]);
  const [ reviewsLoading, setReviewsLoading ] = useState(false);
  const [ reviewsError, setReviewsError ] = useState(null);
  const [ newReview, setNewReview ] = useState('');
  const [ agentInfo, setAgentInfo ] = useState({ username: '', organisationName: '' });
  const [ rating, setRating ] = useState(0);
  const [ submitting, setSubmitting ] = useState(false);
  const [ infoRef, infoVisible ] = useRevealOnScroll();
  const [ overviewRef, overviewVisible ] = useRevealOnScroll();
  const [ locationRef, locationVisible ] = useRevealOnScroll();
  const [ reviewsRef, reviewsVisible ] = useRevealOnScroll();

  const embedUrl = convertToEmbedUrl(property_location);
  const furnished = property_interior?.toLowerCase();

  const mediaItems = (media ?? [])
    .filter(m => m.cloudinary_url || m.image_url || m.video_url)
    .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
    .map(m => {
      const isVideo = m.position === 0;
      if (isVideo) {
        return { video_url: m.cloudinary_url ?? m.video_url, image_url: null, position: m.position };
      }
      return { image_url: m.cloudinary_url ?? m.image_url, video_url: null, position: m.position };
    });

  const active = mediaItems[ activeIndex ] ?? null;
  const secondary = mediaItems[ activeIndex + 1 ] ?? mediaItems[ 1 ] ?? null;
  const thumbnails = mediaItems.slice(0, 4);

  // Reviews fetch preserved as-is, now runs on mount (no tab gating).
  useEffect(() => {
    if (!listing_id) return;
    setReviewsLoading(true);
    setReviewsError(null);

    fetch(`/api/listings/${listing_id}/reviews`)
      .then(r => { if (!r.ok) throw new Error('Failed to fetch reviews'); return r.json(); })
      .then(json => setReviews(json.data ?? []))
      .catch(e => setReviewsError(e.message))
      .finally(() => setReviewsLoading(false));
  }, [ listing_id ]);



  async function handleSubmitReview() {
    if (rating === 0) return;
    if (!newReview.trim()) return;

    setSubmitting(true);

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
          review_text: newReview.trim(),
        }),
      });

      if (!res.ok && res.status !== 409) {
        const json = await res.json();
        throw new Error(json.error ?? 'Submission failed');
      }

      localStorage.setItem(`reviewed:${listing_id}`, '1');
      setNewReview('');
      setRating(0);
      // trigger reviews refetch or optimistic update here
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  }

  useEffect(() => {
    if (!listing_id) return;
    fetch(`/api/listings/${listing_id}/listerInfo`)
      .then(res => res.json())
      .then(setAgentInfo)
      .catch(() => { });
  }, [ listing_id ]);

  function useRevealOnScroll() {
    const ref = useRef(null);
    const [ visible, setVisible ] = useState(false);

    useEffect(() => {
      const el = ref.current;
      if (!el) return;
      const observer = new IntersectionObserver(
        ([ entry ]) => {
          if (entry.isIntersecting) {
            setVisible(true);
            observer.unobserve(el);
          }
        },
        { threshold: 0.15 }
      );
      observer.observe(el);
      return () => observer.disconnect();
    }, []);

    return [ ref, visible ];
  }

  return (
    <div className={styles.page}>
      {/* Title block */}
      <div className={styles.titleBlock}>
        <h1 className={styles.title}>
          {property_name}{ward_name ? <span className={styles.titleWard}>, {ward_name}</span> : null}
        </h1>
        {ward_location && (
          <div className={styles.locationLine}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M8 1.5A4.5 4.5 0 0 1 12.5 6c0 3-4.5 8.5-4.5 8.5S3.5 9 3.5 6A4.5 4.5 0 0 1 8 1.5Z"
                stroke="currentColor" strokeWidth="1.4" />
              <circle cx="8" cy="6" r="1.5" stroke="currentColor" strokeWidth="1.2" />
            </svg>
            <span>{ward_location}</span>
          </div>
        )}
      </div>

      {/* Gallery: main viewer + secondary image, thumbnails below */}
      <div className={styles.galleryGrid}>
        <div className={styles.mainViewer}>
          {active ? (
            active.video_url ? (
              <video
                key={active.video_url}
                className={styles.mainMedia}
                src={active.video_url}
                poster={active.image_url ?? undefined}
                controls
                playsInline
              />
            ) : (
              <Image
                key={active.image_url}
                src={active.image_url}
                alt={property_name}
                fill
                sizes="(max-width: 768px) 100vw, 45vw"
                className={styles.mainImage}
                priority
              />
            )
          ) : (
            <div className={styles.mainPlaceholder}>
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
                <rect x="3" y="3" width="18" height="18" rx="3" stroke="currentColor" strokeWidth="1.2" />
                <circle cx="8.5" cy="8.5" r="1.5" stroke="currentColor" strokeWidth="1.2" />
                <path d="M3 15l5-4 4 4 3-3 6 5" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
              </svg>
              <span>No media available</span>
            </div>
          )}
          {active?.video_url && <PlayIcon />}
        </div>

        <div className={styles.secondaryViewer}>
          {secondary?.image_url ? (
            <Image
              src={secondary.image_url}
              alt={`${property_name} secondary view`}
              fill
              sizes="(max-width: 768px) 100vw, 45vw"
              className={styles.mainImage}
            />
          ) : (
            <div className={styles.mainPlaceholder}>
              <span>No media available</span>
            </div>
          )}
        </div>

        {thumbnails.length > 0 && (
          <div className={styles.thumbGrid}>
            {thumbnails.map((item, i) => (
              <button
                key={i}
                className={`${styles.thumb} ${i === activeIndex ? styles.thumbActive : ''}`}
                onClick={() => setActiveIndex(i)}
                aria-label={`View media ${i + 1}`}
              >
                {item.image_url ? (
                  <Image
                    src={item.image_url}
                    alt={`${property_name} thumbnail ${i + 1}`}
                    fill
                    sizes="200px"
                    className={styles.thumbImage}
                  />
                ) : (
                  <div className={styles.thumbVideoPlaceholder} />
                )}
                {item.video_url && <PlayIcon />}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Category / price / rating row + agent card */}
      <div ref={infoRef} className={`${styles.infoRow} ${infoVisible ? styles.visible : ''}`}>
        <div className={styles.infoLeft}>
          {category_name && <span className={styles.categoryLabel}>{category_name}</span>}

          <div className={styles.priceRow}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.4" />
              <path d="M12 7v10M9 9.5c0-1.38 1.34-2.5 3-2.5s3 1.12 3 2.5S13.66 12 12 12s-3 1.12-3 2.5S10.34 17 12 17s3-1.12 3-2.5"
                stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
            </svg>
            <span className={styles.price}>KSH {Number(property_price).toLocaleString('en-KE')}</span>
          </div>

          {(Number(review_count) > 0 || Number(avg_rating) > 0) && (
            <div className={styles.ratingRow}>
              <StarRating rating={Number(avg_rating) ?? 0} />
              <span className={styles.ratingText}>
                {Number(avg_rating) ?? 0} ({Number(review_count) ?? 0} {Number(review_count) === 1 ? 'review' : 'reviews'})
              </span>
            </div>
          )}

          <div className={styles.metaChips}>
            {type_name && (
              <span className={styles.chip}>
                <i className="hgi hgi-stroke hgi-rounded hgi-home-13" />
                {type_name}
              </span>
            )}
            {furnished && (
              <span className={styles.chip}>
                <i className="hgi hgi-stroke hgi-rounded hgi-sofa-02" />
                {property_interior}
              </span>
            )}
          </div>
        </div>

        {/* Agent card — TODO: agent_name / agent_avatar_url / agent_verified / agency_name
            are not yet returned by the listings endpoint. Placeholder shown until added. */}
        <div className={styles.agentCard}>
          <div className={styles.agentAvatarWrap}>
            {agent_avatar_url ? (
              <Image src={agent_avatar_url} alt={agent_name ?? 'Agent'} fill className={styles.agentAvatar} />
            ) : (
              <div className={styles.agentAvatarPlaceholder} />
            )}
          </div>
          <div className={styles.agentInfo}>
            <span className={styles.agentName}>
              {agent_verified && (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="#F5A623">
                  <circle cx="12" cy="12" r="10" />
                </svg>
              )}
              {agentInfo.username ?? 'Agent name'}
            </span>
            <a
              href={phone_number ? `tel:${phone_number}` : undefined}
              className={styles.contactBtn}
            >
              <span className={styles.contactText}>CONTACT</span>
              <span className={styles.contactIcon}>
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
                  <path d="M6.62 10.79a15.05 15.05 0 0 0 6.59 6.59l2.2-2.2a1 1 0 0 1 1.01-.24 11.36 11.36 0 0 0 3.57.57 1 1 0 0 1 1 1V20a1 1 0 0 1-1 1A17 17 0 0 1 3 4a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1 11.36 11.36 0 0 0 .57 3.57 1 1 0 0 1-.25 1.01l-2.2 2.21z" />
                </svg>
              </span>
            </a>
          </div>
          <div className={styles.agencyRow}>
            <span className={styles.agencyLabel}>Agency</span>
            <span className={styles.agencyName}>{agentInfo.organisationName ?? 'Agency name'}</span>
          </div>
        </div>
      </div>

      {/* Overview */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Overview</h2>
        {description ? (
          <p className={styles.description}>{description}</p>
        ) : (
          <p className={styles.empty}>No description provided.</p>
        )}
      </div>

      {/* Location */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Location</h2>
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
      </div>

      {/* Reviews */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Reviews</h2>

        {reviewsLoading && (
          <div className={styles.reviewsLoading}>
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className={styles.reviewSkeleton} />
            ))}
          </div>
        )}

        {reviewsError && <p className={styles.empty}>Failed to load reviews.</p>}

        {!reviewsLoading && !reviewsError && reviews.length === 0 && (
          <p className={styles.empty}>No reviews yet for this listing.</p>
        )}

        {!reviewsLoading && !reviewsError && reviews.length > 0 && (
          <div className={styles.reviewsList}>
            {reviews.map(r => (
              <div key={r.review_id} className={styles.reviewCard}>
                <div className={styles.reviewHeader}>
                  <div className={styles.reviewAvatar}>U</div>
                  <span className={styles.reviewHandle}>@{r.username ?? 'user'}</span>
                </div>
                {r.review_text && <p className={styles.reviewComment}>{r.review_text}</p>}
                <div className={styles.reviewFooter}>
                  {/* TODO: like/dislike counts not returned by reviews endpoint yet. Placeholder 0. */}
                  <span className={styles.reviewAction}>
                    <i className="hgi hgi-stroke hgi-rounded hgi-thumbs-up" />
                    {r.likes ?? 0}
                  </span>
                  <span className={styles.reviewAction}>
                    <i className="hgi hgi-stroke hgi-rounded hgi-thumbs-down" />
                  </span>
                  <Stars rating={Number(r.rating)} />
                </div>
              </div>
            ))}
          </div>
        )}

        <div className={styles.addReviewRow}>
          <StarRatingInput rating={rating} onChange={setRating} />
          <div className={styles.addReviewInputRow}>
            <input
              type="text"
              placeholder="Add your Review Here"
              className={styles.addReviewInput}
              value={newReview}
              onChange={e => setNewReview(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSubmitReview()}
            />
            <button
              className={`${styles.addReviewBtn} ${submitting ? styles.pulsing : ''}`}
              onClick={handleSubmitReview}
              disabled={submitting}
              aria-label="Submit review"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 2 11 13" />
                <path d="M22 2 15 22l-4-9-9-4 20-7Z" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}