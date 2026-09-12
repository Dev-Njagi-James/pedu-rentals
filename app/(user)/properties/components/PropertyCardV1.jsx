'use client';

import Link from 'next/link';
import Image from 'next/image';
import styles from '../css/propertyCard.module.css';
import { buildCdnImageUrl } from "@/lib/utils/cdnImage";

const planClassMap = {
  Regular: styles.planRegular,
  Premium: styles.planPremium,
  Enterprise: styles.planEnterprise,
};

const planDisplayLabelMap = {
  Regular: 'Regular',
  Premium: 'VIP',
  Enterprise: 'VVIP',
};

export default function PropertyCardV1({ listing, onWardClick }) {
  const {
    _source,
    listing_id,
    listing_name,
    price_kes,
    furnishing,
    ward_display_name,
    ward_location,
    listing_ward,
    category_type,
    listing_category,
    plan_name,
    location_url,
    images_table,
    phone_number,
  } = listing;

  const images = images_table?.images_url ?? [];

  const coverImage = [...images]
    .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))[0];

  const firstImage = coverImage?.publicUrl ?? null;

  const planClassName = planClassMap[plan_name] ?? '';

  const handleWardClick = (event) => {
    event.preventDefault();
    event.stopPropagation();
    onWardClick?.(listing_ward, ward_display_name, location_url);
  };

  return (
    <article className={styles.card}>
      <div className={styles.imageWrap}>
        {firstImage ? (
          (() => {
            const { src, isTransformed } = buildCdnImageUrl(firstImage, {
              width: 500,
            });
            return (
              <Image
                src={src}
                alt={listing_name}
                fill
                unoptimized={isTransformed}
                sizes="(max-width: 600px) 100vw, 360px"
                className={styles.image}
              />
            );
          })()
        ) : (
          <div className={styles.imagePlaceholder}>
            <svg
              width="36"
              height="36"
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden="true">
              <rect
                x="3"
                y="3"
                width="18"
                height="18"
                rx="3"
                stroke="currentColor"
                strokeWidth="1.2"
              />
              <circle
                cx="8.5"
                cy="8.5"
                r="1.5"
                stroke="currentColor"
                strokeWidth="1.2"
              />
              <path
                d="M3 15l5-4 4 4 3-3 6 5"
                stroke="currentColor"
                strokeWidth="1.2"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        )}

        {plan_name && (
          <span className={`${styles.planBadge} ${planClassName}`}>
            {planDisplayLabelMap[plan_name] ?? plan_name}
          </span>
        )}
      </div>

      <div className={styles.body}>
        <div className={styles.bodyContent}>
          {listing_category && (
            <span className={styles.categoryLabel}>{listing_category}</span>
          )}

          <h3 className={styles.name}>{listing_name}</h3>

          <div className={styles.priceRow}>
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              className={styles.priceIcon}
              aria-hidden="true">
              <circle
                cx="12"
                cy="12"
                r="9"
                stroke="currentColor"
                strokeWidth="1.4"
              />
              <path
                d="M12 7v10M9 9.5c0-1.38 1.34-2.5 3-2.5s3 1.12 3 2.5S13.66 12 12 12s-3 1.12-3 2.5S10.34 17 12 17s3-1.12 3-2.5"
                stroke="currentColor"
                strokeWidth="1.4"
                strokeLinecap="round"
              />
            </svg>
            <span className={styles.price}>
              KSH {Number(price_kes).toLocaleString("en-KE")}
            </span>
          </div>

          <div className={styles.metaRow}>
            <button
              type="button"
              className={styles.wardBtn}
              onClick={handleWardClick}
              title={`View ${ward_display_name} on map`}>
              <svg
                width="12"
                height="12"
                viewBox="0 0 16 16"
                fill="none"
                aria-hidden="true">
                <path
                  d="M8 1.5A4.5 4.5 0 0 1 12.5 6c0 3-4.5 8.5-4.5 8.5S3.5 9 3.5 6A4.5 4.5 0 0 1 8 1.5Z"
                  stroke="currentColor"
                  strokeWidth="1.4"
                />
                <circle
                  cx="8"
                  cy="6"
                  r="1.5"
                  stroke="currentColor"
                  strokeWidth="1.2"
                />
              </svg>
              {ward_display_name}
            </button>

            {ward_location && (
              <span className={styles.metaItem}>
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  aria-hidden="true">
                  <path
                    d="M3 11l19-9-9 19-2-8-8-2z"
                    stroke="currentColor"
                    strokeWidth="1.4"
                    strokeLinejoin="round"
                  />
                </svg>
                {ward_location}
              </span>
            )}

            {category_type && (
              <span className={styles.metaItem}>
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  aria-hidden="true">
                  <path
                    d="M3 10V20M21 10V20M3 10h18M3 10L12 3l9 7"
                    stroke="currentColor"
                    strokeWidth="1.4"
                    strokeLinejoin="round"
                  />
                  <rect
                    x="9"
                    y="14"
                    width="6"
                    height="6"
                    stroke="currentColor"
                    strokeWidth="1.2"
                  />
                </svg>
                {category_type}
              </span>
            )}
          </div>

          <div className={styles.actions}>
            <Link
              href={
                _source === "v1"
                  ? `/properties/${listing_id}?src=v1`
                  : `/properties/${listing_id}`
              }
              className={styles.viewBtn}>
              View Details
            </Link>

            {phone_number && (
              <a
                href={`tel:0${phone_number}`}
                className={styles.callBtn}
                aria-label="Call agent"
                onClick={(event) => {
                  event.preventDefault();

                  let fingerprint = localStorage.getItem("cr_fingerprint");
                  if (!fingerprint) {
                    fingerprint = crypto.randomUUID();
                    localStorage.setItem("cr_fingerprint", fingerprint);
                  }

                  const alreadyReviewed = localStorage.getItem(
                    `reviewed:${listing_id}`,
                  );

                  if (!alreadyReviewed) {
                    localStorage.setItem(
                      "pending_review",
                      JSON.stringify({
                        listing_id,
                        listing_name,
                        timestamp: Date.now(),
                      }),
                    );
                  }

                  fetch(`/api/listings/${listing_id}/calls`, {
                    method: "POST",
                  }).finally(() => {
                    window.location.href = `tel:0${phone_number}`;
                  });
                }}>
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  aria-hidden="true">
                  <path
                    d="M6.6 10.8a15.4 15.4 0 0 0 6.6 6.6l2.2-2.2a1 1 0 0 1 1.02-.24c1.12.37 2.33.57 3.58.57a1 1 0 0 1 1 1V20a1 1 0 0 1-1 1C9.61 21 3 14.39 3 6.5a1 1 0 0 1 1-1H7.5a1 1 0 0 1 1 1c0 1.25.2 2.46.57 3.58a1 1 0 0 1-.24 1.02L6.6 10.8Z"
                    stroke="currentColor"
                    strokeWidth="1.4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </a>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}
