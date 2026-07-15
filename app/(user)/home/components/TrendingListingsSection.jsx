'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import PropertyCard from '../../properties/components/PropertyCard'
import ReviewPrompt from '../../properties/components/ReviewPrompt'
import styles from '../css/TrendingListingsSection.module.css'

async function fetchTrending() {
  const res = await fetch('/api/listings/trending')
  if (!res.ok) throw new Error('Failed to fetch trending listings')
  return res.json()
}

export default function TrendingListingsSection() {
  const [ wardPopup, setWardPopup ] = useState(null)

  const { data, isLoading, error } = useQuery({
    queryKey: [ 'trending-listings' ],
    queryFn: fetchTrending,
    staleTime: 5 * 60 * 1000,
  })

  const listings = data?.data ?? []
  // 2 columns x 4 rows = 8 cards max
  const visible = listings.slice(0, 10)

  return (
    <>
      <ReviewPrompt />
      <section className={styles.section}>
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.headlineWrap}>
            <div className={styles.headlineBar} />
            <h2 className={styles.headline}>Featured Listings</h2>
          </div>
          <p className={styles.subtitle}>
            Explore the most viewed and highest rated listings on the platform. These properties reflect consistent user interest and strong overall feedback.
          </p>
        </div>

        {/* Skeleton */}
        {isLoading && (
          <div className={styles.grid}>
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className={styles.skeleton} />
            ))}
          </div>
        )}

        {/* Error */}
        {error && (
          <div className={styles.errorState}>
            Failed to load trending listings.
          </div>
        )}

        {/* Grid */}
        {!isLoading && !error && visible.length > 0 && (
          <div className={styles.grid}>
            {visible.map(listing => (
              <PropertyCard
                key={listing.listing_id}
                listing={listing}
                onWardClick={(ward_id, ward_name, property_location) =>
                  setWardPopup({ ward_id, ward_name, property_location })
                }
              />
            ))}

            {/* More listings CTA — last cell, right-aligned */}
            <Link href="/properties" className={styles.moreCard}>
              <div className={styles.moreInner}>
                <span className={styles.moreLabel}>More Listings</span>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                  <path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
            </Link>
          </div>
        )}

        {/* Empty */}
        {!isLoading && !error && visible.length === 0 && (
          <div className={styles.emptyState}>
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none">
              <path d="M3 10V20M21 10V20M3 10h18M3 10L12 3l9 7" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
              <rect x="9" y="14" width="6" height="6" stroke="currentColor" strokeWidth="1.2" />
            </svg>
            <p>No listings available yet.</p>
          </div>
        )}

        {/* Ward popup — same pattern as PropertiesClient */}
        {wardPopup && (
          <div className={styles.wardOverlay} onClick={() => setWardPopup(null)}>
            <div className={styles.wardModal} onClick={e => e.stopPropagation()}>
              <div className={styles.wardModalHeader}>
                <span>{wardPopup.ward_name}</span>
                <button onClick={() => setWardPopup(null)}>&#x2715;</button>
              </div>
              <div className={styles.wardModalBody}>
                {wardPopup.property_location ? (
                  <iframe
                    src={wardPopup.property_location}
                    width="100%"
                    height="100%"
                    style={{ border: 'none', display: 'block' }}
                    allowFullScreen
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                    title={`Map of ${wardPopup.ward_name}`}
                  />
                ) : (
                  <p style={{ padding: '1rem' }}>No map available for this ward.</p>
                )}
              </div>
            </div>
          </div>
        )}
      </section>
    </>
  )
}