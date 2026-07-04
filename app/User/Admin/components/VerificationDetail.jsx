'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import styles from '../css/verificationDetail.module.css';

const ACTION_OPTIONS = [ '', 'Suspend Account', 'Delete Account', 'Mark as Reported', 'Remove Listing' ];


function StarRating({ rating = 0 }) {
  return (
    <div className={styles.stars}>
      {[ 1, 2, 3, 4, 5 ].map(i => (
        <svg key={i} width="18" height="18" viewBox="0 0 24 24"
          fill={i <= Math.round(rating) ? '#F5A623' : 'none'}
          stroke="#F5A623" strokeWidth="1.4">
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
        </svg>
      ))}
    </div>
  );
}

function FilterTags({ listing }) {
  const tags = [
    listing.ward_name,
    listing.category_name,
    listing.type_name,
    listing.property_price ? `${Number(listing.property_price).toLocaleString()}` : null,
    listing.rent_duration,
    listing.property_interior,
  ].filter(Boolean);

  return (
    <div className={styles.filterTags}>
      {tags.map((tag, i) => (
        <span key={i} className={styles.filterTag}>{tag}</span>
      ))}
    </div>
  );
}

function Gallery({ media = [], propertyName }) {
  const items = (media ?? [])
    .filter(m => m.image_url || m.video_url)
    .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
    .flatMap(m => {
      if (m.image_url && m.video_url) {
        return [
          { image_url: null, video_url: m.video_url, position: -1 },
          { image_url: m.image_url, video_url: null, position: m.position },
        ];
      }
      return [ m ];
    });

  const defaultIndex = items.findIndex(m => m.video_url);
  const [ activeIndex, setActiveIndex ] = useState(defaultIndex === -1 ? 0 : defaultIndex);

  const active = items[ activeIndex ] ?? null;

  return (
    <div className={styles.galleryCol}>
      <div className={styles.mainViewer}>
        {active ? (
          active.video_url ? (
            <video src={active.video_url} poster={active.image_url ?? undefined}
              controls playsInline className={styles.mainVideo} />
          ) : (
            <Image src={active.image_url} alt={propertyName} fill
              sizes="(max-width: 768px) 100vw, 45vw"
              className={styles.mainImage} priority />
          )
        ) : (
          <div className={styles.mainPlaceholder}>No media available</div>
        )}
        {items.length > 1 && (
          <span className={styles.mediaCounter}>{activeIndex + 1} / {items.length}</span>
        )}
      </div>

      {items.length > 1 && (
        <div className={styles.thumbStrip}>
          {items.map((item, i) => (
            <button key={i}
              className={`${styles.thumb} ${i === activeIndex ? styles.thumbActive : ''}`}
              onClick={() => setActiveIndex(i)}>
              {item.image_url && (
                <Image src={item.image_url} alt={`thumb ${i + 1}`} fill sizes="96px"
                  className={styles.thumbImage} />
              )}
              {item.video_url && (
                <div className={styles.thumbPlay}>
                  <svg viewBox="0 0 48 48" fill="none" width="24" height="24">
                    <circle cx="24" cy="24" r="24" fill="rgba(0,0,0,0.45)" />
                    <polygon points="19,14 38,24 19,34" fill="white" />
                  </svg>
                </div>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

const LD_ICONS = {
  user: 'M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z',
  mail: 'M4 4h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2zm0 0l8 8 8-8',
  phone: 'M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z',
  building: 'M3 21h18M3 7l9-4 9 4M4 7v14M20 7v14M9 21v-4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v4',
  map: 'M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 1 1 0-5 2.5 2.5 0 0 1 0 5z',
};

function LdIcon({ d }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
      strokeLinecap="round" strokeLinejoin="round" className={styles.ldFieldIcon} aria-hidden="true">
      <path d={d} />
    </svg>
  );
}

function LdFieldRow({ icon, label, value }) {
  return (
    <div className={styles.ldFieldRow}>
      <LdIcon d={LD_ICONS[ icon ]} />
      <div className={styles.ldFieldBody}>
        <span className={styles.ldFieldLabel}>{label}</span>
        <span className={styles.ldFieldValue}>{value || '—'}</span>
      </div>
    </div>
  );
}

function LdCard({ title, children }) {
  return (
    <div className={styles.ldCard}>
      <div className={styles.ldCardHeader}>
        <span className={styles.ldCardTitle}>{title}</span>
      </div>
      <div className={styles.ldCardBody}>{children}</div>
    </div>
  );
}

function PropertyDetails({ listing }) {
  const [ subTab, setSubTab ] = useState('description');

  return (
    <div className={styles.propertyDetails}>
      <div className={styles.filterTagsRow}>
        <span className={styles.filtersLabel}>Filters</span>
        <FilterTags listing={listing} />
      </div>

      <div className={styles.heroGrid}>
        <Gallery media={listing.media ?? []} propertyName={listing.property_name} />

        <div className={styles.infoPanel}>
          {listing.category_name && (
            <span className={styles.categoryLabel}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="1.6">
                <path d="M3 10V20M21 10V20M3 10h18M3 10L12 3l9 7" />
                <rect x="9" y="14" width="6" height="6" />
              </svg>
              {listing.category_name}
            </span>
          )}
          <h1 className={styles.propertyName}>{listing.property_name}</h1>
          {listing.lister?.lister_org && (
            <p className={styles.orgName}>{listing.lister.lister_org}</p>
          )}

          <div className={styles.ratingRow}>
            <StarRating rating={listing.rating ?? 3.5} />
            <span className={styles.reviewCount}>{listing.review_count ?? 0} Reviews</span>
          </div>

          <div className={styles.priceRow}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="9" stroke="#2563eb" strokeWidth="1.4" />
              <path d="M12 7v10M9 9.5c0-1.38 1.34-2.5 3-2.5s3 1.12 3 2.5S13.66 12 12 12s-3 1.12-3 2.5S10.34 17 12 17s3-1.12 3-2.5"
                stroke="#2563eb" strokeWidth="1.4" strokeLinecap="round" />
            </svg>
            <span className={styles.price}>KSH {Number(listing.property_price ?? 0).toLocaleString()}</span>
          </div>

          <div className={styles.metaRow}>
            {listing.type_name && (
              <span className={styles.metaChip}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4">
                  <path d="M3 10V20M21 10V20M3 10h18M3 10L12 3l9 7" /><rect x="9" y="14" width="6" height="6" />
                </svg>
                {listing.type_name}
              </span>
            )}
            {listing.ward_name && (
              <span className={styles.metaChip}>
                <svg width="18" height="18" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4">
                  <path d="M8 1.5A4.5 4.5 0 0 1 12.5 6c0 3-4.5 8.5-4.5 8.5S3.5 9 3.5 6A4.5 4.5 0 0 1 8 1.5Z" />
                  <circle cx="8" cy="6" r="1.5" />
                </svg>
                {listing.ward_name}
              </span>
            )}
          </div>

          {listing.property_interior && (
            <span className={styles.interiorBadge}>{listing.property_interior}</span>
          )}

          {listing.phone_number && (
            <a href={`tel:${listing.phone_number}`} className={styles.contactBtn}>
              TEL : +{listing.phone_number}
            </a>
          )}
        </div>
      </div>

      <div className={styles.subTabBar}>
        {[ 'description', 'location', 'reviews' ].map(t => (
          <button key={t}
            className={`${styles.subTab} ${subTab === t ? styles.subTabActive : ''}`}
            onClick={() => setSubTab(t)}>
            {t === 'description' ? 'Description' : t === 'location' ? 'Property Location' : 'Reviews'}
          </button>
        ))}
      </div>

      <div className={styles.subTabContent}>
        {subTab === 'description' && (
          <p className={styles.description}>{listing.description ?? 'No description provided.'}</p>
        )}
        {subTab === 'location' && (
          listing.property_location ? (
            <iframe
              src={listing.property_location}
              style={{ width: '100%', height: '350px', border: 'none', borderRadius: '6px' }}
              allowFullScreen
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              title="Property location map"
            />
          ) : (
            <p className={styles.description}>Location not available.</p>
          )
        )}
        {subTab === 'reviews' && (
          <div className={styles.reviewsList}>
            {(listing.reviews ?? []).length === 0 ? (
              <p className={styles.description}>No reviews yet.</p>
            ) : (
              (listing.reviews ?? []).map(r => (
                <div key={r.review_id} className={styles.reviewItem}>
                  <div className={styles.reviewHeader}>
                    <StarRating rating={r.rating} />
                    <span className={styles.reviewDate}>
                      {new Date(r.created_at).toLocaleDateString('en-KE', {
                        day: 'numeric', month: 'short', year: 'numeric'
                      })}
                    </span>
                  </div>
                  {r.review_text && (
                    <p className={styles.reviewText}>{r.review_text}</p>
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {listing.otherListings?.length > 0 && (
        <OtherListings listings={listing.otherListings} />
      )}
    </div>
  );
}

function OtherListings({ listings }) {
  const scrollRef = useRef(null);
  const router = useRouter();

  const scroll = dir => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: dir === 'left' ? -300 : 300, behavior: 'smooth' });
    }
  };

  return (
    <div className={styles.otherSection}>
      <h3 className={styles.otherTitle}>Other Lister Listings</h3>
      <div className={styles.carouselWrapper}>
        <button className={styles.carouselArrow} onClick={() => scroll('left')}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <div className={styles.carousel} ref={scrollRef}>
          {listings.map(l => {
            const img = l.media?.[ 0 ]?.image_url ?? null;
            return (
              <div key={l.listing_id} className={styles.otherCard}>
                <div className={styles.otherImageBox}>
                  {img ? (
                    <Image src={img} alt={l.property_name} fill sizes="200px" className={styles.otherImage} />
                  ) : (
                    <div className={styles.otherImagePlaceholder} />
                  )}
                </div>
                <p className={styles.otherName}>{l.property_name}</p>
                <div className={styles.otherMeta}>
                  <span className={styles.otherPrice}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="12" r="9" stroke="#2563eb" strokeWidth="1.4" />
                    </svg>
                    KSH {Number(l.property_price ?? 0).toLocaleString()}
                  </span>
                  {l.ward_name && (
                    <span className={styles.otherWard}>
                      <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4">
                        <path d="M8 1.5A4.5 4.5 0 0 1 12.5 6c0 3-4.5 8.5-4.5 8.5S3.5 9 3.5 6A4.5 4.5 0 0 1 8 1.5Z" />
                      </svg>
                      {l.ward_name}
                    </span>
                  )}
                </div>
                {l.type_name && <p className={styles.otherType}>{l.type_name}</p>}
                <button className={styles.viewBtn}
                  onClick={() => onSelect(l.listing_id)}>
                  View Details
                </button>
              </div>
            );
          })}
        </div>
        <button className={styles.carouselArrow} onClick={() => scroll('right')}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>
      </div>
    </div>
  );
}

function ListerDetails({ lister, otherListings = [] }) {
  const router = useRouter();
  const scrollRef = useRef(null);
  const [ action, setAction ] = useState('');
  const [ message, setMessage ] = useState('');

  const scroll = dir => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: dir === 'left' ? -300 : 300, behavior: 'smooth' });
    }
  };

  const handleSubmit = () => {
    console.log({ action, message });
  };

  return (
    <div className={styles.listerDetails}>

      <div className={styles.ldGrid}>
        <LdCard title="Organisation">
          <LdFieldRow icon="user" label="Full Name" value={lister?.username} />
          <LdFieldRow icon="building" label="Organisation Name" value={lister?.lister_org} />
          <LdFieldRow icon="mail" label="Organisation Email" value={lister?.lister_email} />
          <LdFieldRow icon="phone" label="Organisation Contact" value={lister?.lister_contact} />
        </LdCard>

        <LdCard title="Account">
          <LdFieldRow icon="user" label="Username" value={lister?.username} />
          <LdFieldRow icon="mail" label="Email" value={lister?.lister_email} />
          <LdFieldRow icon="phone" label="Contact" value={lister?.lister_contact} />
          <LdFieldRow icon="map" label="Location" value={lister?.lister_ward} />
        </LdCard>
      </div>

      {otherListings.length > 0 && (
        <div className={styles.ldSection}>
          <h3 className={styles.otherTitle}>Listings</h3>
          <div className={styles.carouselWrapper}>
            <button className={styles.carouselArrow} onClick={() => scroll('left')}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </button>
            <div className={styles.carousel} ref={scrollRef}>
              {otherListings.map(l => {
                const img = l.media?.[ 0 ]?.image_url ?? null;
                return (
                  <div key={l.listing_id} className={styles.otherCard}>
                    <div className={styles.otherImageBox}>
                      {img ? (
                        <Image src={img} alt={l.property_name} fill sizes="200px" className={styles.otherImage} />
                      ) : <div className={styles.otherImagePlaceholder} />}
                    </div>
                    <p className={styles.otherName}>{l.property_name}</p>
                    <div className={styles.otherMeta}>
                      <span className={styles.otherPrice}>KSH {Number(l.property_price ?? 0).toLocaleString()}</span>
                      {l.ward_name && <span className={styles.otherWard}>{l.ward_name}</span>}
                    </div>
                    {l.type_name && <p className={styles.otherType}>{l.type_name}</p>}
                    <button className={styles.viewBtn}
                      onClick={() => onSelect(l.listing_id)}>
                      View Details
                    </button>
                  </div>
                );
              })}
            </div>
            <button className={styles.carouselArrow} onClick={() => scroll('right')}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>
          </div>
        </div>
      )}

      <div className={styles.ldCard} style={{ marginTop: '1rem' }}>
        <div className={styles.ldCardHeader}>
          <span className={styles.ldCardTitle}>Actions</span>
        </div>
        <div className={styles.ldCardBody}>
          <div className={styles.actionRow}>
            <span className={styles.actionLabel}>Action :</span>
            <select className={styles.actionSelect} value={action} onChange={e => setAction(e.target.value)}>
              {ACTION_OPTIONS.map(o => <option key={o} value={o}>{o || 'Action'}</option>)}
            </select>
          </div>
          <div className={styles.actionRow}>
            <span className={styles.actionLabel}>Message :</span>
            <textarea
              className={styles.actionTextarea}
              placeholder="Message"
              value={message}
              onChange={e => setMessage(e.target.value)}
            />
          </div>
          <div className={styles.actionButtons}>
            <button className={styles.discardBtn} onClick={() => { setAction(''); setMessage(''); }}>Discard</button>
            <button className={styles.submitBtn} onClick={handleSubmit}>Submit</button>
          </div>
        </div>
      </div>

    </div>
  );
}

function ErrorState({ message }) {
  return (
    <div className={styles.errorState}>
      <div className={styles.errorStateIcon}>
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="1.2">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
      </div>
      <h2 className={styles.errorStateTitle}>Something went wrong</h2>
      <p className={styles.errorStateMessage}>{message}</p>
    </div>
  );
}
export default function VerificationDetail({ id, onBack, onSelect }) {
  const [ data, setData ] = useState(null);
  const [ loading, setLoading ] = useState(true);
  const [ error, setError ] = useState(null);
  const [ tab, setTab ] = useState('property');
  const router = useRouter();

  useEffect(() => {
    async function fetchDetail() {
      try {
        const res = await fetch(`/api/adminRo/verification/${id}`);
        if (!res.ok) throw new Error('Failed to fetch listing.');
        const json = await res.json();
        setData(json);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchDetail();
  }, [ id ]);

  if (loading) return <div className={styles.loading}>Loading…</div>;
  if (error) return <ErrorState message={error} />;
  if (!data) return null;

  return (
    <div className={styles.detailRoot}>
      <button className={styles.backBtn} onClick={onBack}>
        ← Back
      </button>

      <div className={styles.tabBar}>
        <button
          className={`${styles.tabBtn} ${tab === 'property' ? styles.tabBtnActive : ''}`}
          onClick={() => setTab('property')}>
          Property Details
        </button>
        <button
          className={`${styles.tabBtn} ${tab === 'lister' ? styles.tabBtnActive : ''}`}
          onClick={() => setTab('lister')}>
          Lister Details
        </button>
      </div>

      {tab === 'property' && (
        <PropertyDetails
          listing={{ ...data.listing, lister: data.lister, otherListings: data.otherListings, reviews: data.reviews ?? [] }}
          onSelect={onSelect}
        />
      )}
      {tab === 'lister' && (
        <ListerDetails lister={data.lister} otherListings={data.otherListings} onSelect={onSelect} />
      )}
    </div>
  );
}