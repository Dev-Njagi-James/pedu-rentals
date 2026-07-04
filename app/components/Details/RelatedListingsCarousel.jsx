'use client'

import { useState, useEffect, useRef } from 'react'
import PropertyCard from '../Properties/PropertyCard'
import styles from '../css/Details/RelatedListingsCarousel.module.css';

const PER_SCROLL = 3

export default function RelatedListingsCarousel({ categoryName, currentId }) {
  const [ listings, setListings ] = useState([])
  const [ loading, setLoading ] = useState(true)
  const [ offset, setOffset ] = useState(0)
  const trackRef = useRef(null)

  useEffect(() => {
    if (!categoryName) return
    async function fetchRelated() {
      try {
        const res = await fetch('/api/listings?page=1')
        if (!res.ok) return
        const json = await res.json()
        const filtered = (json.data ?? [])
          .filter(l => l.category_name === categoryName && l.listing_id !== currentId)
          .slice(0, 3)
        setListings(filtered)
      } catch (_) {
      } finally {
        setLoading(false)
      }
    }
    fetchRelated()
  }, [ categoryName, currentId ])

  useEffect(() => {
    if (!trackRef.current) return
    const cardPct = 100 / PER_SCROLL
    const isMobile = window.innerWidth <= 780
    trackRef.current.style.transform = isMobile
      ? `translateY(-${offset * cardPct}%)`
      : `translateX(-${offset * cardPct}%)`
  }, [ offset ])

  if (loading || listings.length === 0) return null

  return (
    <section className={styles.section}>
      <h2 className={styles.heading}>You might also like...</h2>
      <div className={styles.carouselWrapper}>
        <div className={styles.viewport}>
          <div className={styles.track} ref={trackRef}>
            {listings.map(item => (
              <div key={item.listing_id} className={styles.cardSlot}>
                <PropertyCard listing={item} onWardClick={() => { }} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}