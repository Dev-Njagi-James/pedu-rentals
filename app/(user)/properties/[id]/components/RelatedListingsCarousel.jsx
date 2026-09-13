"use client";

import { useState, useEffect } from "react";
import PropertyCardV1 from "@/app/(user)/properties/components/PropertyCardV1";
import styles from "../css/RelatedListingsCarousel.module.css";

export default function RelatedListingsCarousel({ categoryName, currentId }) {
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!categoryName) return;
    async function fetchRelated() {
      try {
        const res = await fetch("/api/v1/listings/public?page=1");
        if (!res.ok) return;
        const json = await res.json();
        const all = (json.data ?? []).filter(
          (l) => String(l.listing_id) !== String(currentId),
        );
        const sameCategory = all.filter(
          (l) => l.listing_category === categoryName,
        );
        let result = sameCategory.slice(0, 4);
        if (result.length < 4) {
          const usedIds = new Set(result.map((l) => l.listing_id));
          const fillers = all.filter((l) => !usedIds.has(l.listing_id));
          result = result.concat(fillers.slice(0, 4 - result.length));
        }
        setListings(result);
      } catch (_) {
      } finally {
        setLoading(false);
      }
    }
    fetchRelated();
  }, [categoryName, currentId]);

  if (loading || listings.length === 0) return null;

  return (
    <section className={styles.section}>
      <h2 className={styles.heading}>You might also like...</h2>
      <div className={styles.carouselWrapper}>
        <div className={styles.viewport}>
          <div className={styles.track}>
            {listings.map((item) => (
              <div key={item.listing_id} className={styles.cardSlot}>
                <PropertyCardV1 listing={item} onWardClick={() => {}} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
