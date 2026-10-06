"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import styles from "../css/propertyCard.module.css";
import { buildCdnImageUrl } from "@/lib/utils/cdnImage";
import { posthog } from "@/lib/analytics/posthog-client";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { toast } from "sonner";
import { fetchContact, getCachedContact } from "@/lib/contact/fetchContact";

const planClassMap = {
  Regular: styles.planRegular,
  Premium: styles.planPremium,
  Enterprise: styles.planEnterprise,
};

const planDisplayLabelMap = {
  Regular: "Regular",
  Premium: "VIP",
  Enterprise: "VVIP",
};

export default function PropertyCardV1({ listing, onWardClick }) {
  const {
    listing_id,
    listing_name,
    price_kes,
    ward_display_name,
    listing_ward,
    category_type,
    listing_category,
    plan_name,
    images_table,
  } = listing;
  const [contact, setContact] = useState(
    () => getCachedContact(listing_id)?.data ?? null,
  );
  const [contactStatus, setContactStatus] = useState(() =>
    getCachedContact(listing_id) ? "ok" : "loading",
  );
  const router = useRouter();
  const { isLoaded, isSignedIn } = useUser();
  const images = images_table?.images_url ?? [];

  const coverImage = [...images].sort(
    (a, b) => (a.position ?? 0) - (b.position ?? 0),
  )[0];

  const firstImage = coverImage?.publicUrl ?? null;

  const planClassName = planClassMap[plan_name] ?? "";
  const ward_location = contact?.ward_location ?? null;

  useEffect(() => {
    if (!isLoaded || !listing_id) return;
    if (!isSignedIn) {
      setContact(null);
      setContactStatus("signed_out");
      return;
    }
    const cached = getCachedContact(listing_id);
    if (cached) {
      setContact(cached.data);
      setContactStatus("ok");
      return;
    }
    let cancelled = false;
    setContactStatus("loading");
    fetchContact(listing_id).then((result) => {
      if (cancelled) return;
      if (result.status === "ok") {
        setContact(result.data);
        setContactStatus("ok");
      } else {
        setContactStatus(result.status);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [isLoaded, isSignedIn, listing_id]);

  const handleWardClick = async (event) => {
    event.preventDefault();
    event.stopPropagation();
    if (!isSignedIn) {
      toast.info("Sign in to view the location");
      router.push("/Auth");
      return;
    }
    const result = await fetchContact(listing_id);
    if (result.status !== "ok") {
      toast.error("Could not load the location. Try again.");
      return;
    }
    onWardClick?.(listing_ward, ward_display_name, result.data.location_url);
  };

  const handleCall = async (event) => {
    event.preventDefault();

    if (!isSignedIn) {
      toast.info("Sign in to view contact details");
      router.push("/Auth");
      return;
    }

    const result = await fetchContact(listing_id);
    if (result.status !== "ok" || !result.data.phone_number) {
      toast.error("Could not load the contact number. Try again.");
      return;
    }

    let fingerprint = localStorage.getItem("cr_fingerprint");
    if (!fingerprint) {
      fingerprint = crypto.randomUUID();
      localStorage.setItem("cr_fingerprint", fingerprint);
    }

    if (!localStorage.getItem(`reviewed:${listing_id}`)) {
      localStorage.setItem(
        "pending_review",
        JSON.stringify({ listing_id, listing_name, timestamp: Date.now() }),
      );
    }

    posthog.capture("property_call_clicked", {
      listing_id,
      listing_name,
      ward: ward_display_name,
      plan_name,
    });
    window.location.href = `tel:0${result.data.phone_number}`;
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
            {/* Public ward: visible whether signed in or not */}
            <button
              type="button"
              className={styles.wardBtn}
              onClick={handleWardClick}
              title={`View ${ward_display_name || "ward"} on map`}>
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
              {ward_display_name || "Ward not specified"}
            </button>

            {/* Exact location: separate from the public ward */}
            {!isLoaded ? (
              <span className={styles.locationHint}>Checking location…</span>
            ) : !isSignedIn ? (
              <Link href="/Auth" className={styles.locationHint}>
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  aria-hidden="true">
                  <rect
                    x="5"
                    y="10"
                    width="14"
                    height="11"
                    rx="2"
                    stroke="currentColor"
                    strokeWidth="1.8"
                  />
                  <path
                    d="M8 10V7a4 4 0 0 1 8 0v3"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                  />
                  <circle cx="12" cy="15" r="1" fill="currentColor" />
                </svg>
                <span>Sign in to view exact location</span>
              </Link>
            ) : contactStatus === "loading" ? (
              <span className={styles.locationHint}>
                Loading exact location…
              </span>
            ) : contactStatus === "ok" ? (
              <span className={styles.locationHint}>
                {ward_location || "Exact location not provided"}
              </span>
            ) : contactStatus === "forbidden" ? (
              <span className={styles.locationHint}>
                Active subscription required to view location
              </span>
            ) : (
              <span className={styles.locationHint}>
                Couldn’t load location. Try again.
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
            <Link href={`/properties/${listing_id}`} className={styles.viewBtn}>
              View Details
            </Link>

            <a
              href="#"
              className={styles.callBtn}
              aria-label="Call agent"
              onClick={handleCall}>
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
          </div>
        </div>
      </div>
    </article>
  );
}
