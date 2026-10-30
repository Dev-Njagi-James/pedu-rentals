"use client";

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import "../css/PropertyAdminPopup.css";
import {
  getAdminCache,
  setAdminCache,
  isAdminCacheFresh,
} from "@/lib/cache/adminCache";
import Image from "next/image";
import { buildCdnImageUrl } from "@/lib/utils/cdnImage";
import DescriptionRenderer from "@/app/(user)/properties/[id]/components/DescriptionRenderer";

const REVIEW_TAGS = [
  "Needs verification",
  "Incorrect details",
  "Duplicate listing",
  "Policy concern",
  "Suspected scam",
];

const kes = new Intl.NumberFormat("en-KE");

function Icon({ name, size = 18 }) {
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round",
    strokeLinejoin: "round",
    "aria-hidden": true,
    focusable: false,
  };

  const fontIcons = {
    message: "hgi hgi-stroke hgi-rounded hgi-message-add-01",
    eye: "hgi hgi-stroke hgi-rounded hgi-eye",
    star: "hgi hgi-stroke hgi-rounded hgi-stack-star",
    call: "hgi hgi-stroke hgi-rounded hgi-call-add",
    phone: "hgi hgi-stroke hgi-rounded hgi-call-add",
    mail: "hgi hgi-stroke hgi-rounded hgi-mail-edit-01",
  };

  if (fontIcons[name]) {
    return (
      <i
        className={fontIcons[name]}
        aria-hidden="true"
        style={{ fontSize: size, lineHeight: 1 }}
      />
    );
  }

  const paths = {
    close: <path d="m6 6 12 12M18 6 6 18" />,
    pin: (
      <>
        <path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0Z" />
        <circle cx="12" cy="10" r="2.5" />
      </>
    ),
    bed: (
      <path d="M3 18V6M3 14h18v4M6 14V9h5a3 3 0 0 1 3 3v2M14 11h4a3 3 0 0 1 3 3" />
    ),
    home: (
      <>
        <path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1Z" />
        <path d="M9 21v-7h6v7" />
      </>
    ),
    calendar: (
      <>
        <rect x="3" y="5" width="18" height="16" rx="2" />
        <path d="M16 3v4M8 3v4M3 10h18" />
      </>
    ),
    eyeOff: (
      <>
        <path d="m3 3 18 18M10.6 10.6a2 2 0 0 0 2.8 2.8" />
        <path d="M9.9 5.2A10.8 10.8 0 0 1 12 5c5.2 0 8.8 4.2 10 7-.4 1-1.1 2.1-2.1 3.1M6.2 6.2C3.9 7.5 2.5 9.7 2 12c.7 1.8 2.5 4.1 5.3 5.6A10.8 10.8 0 0 0 12 19" />
      </>
    ),
    trash: <path d="M4 7h16M10 11v6M14 11v6M5 7l1 14h12l1-14M9 7V4h6v3" />,
    money: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M15 9.5c-.6-.7-1.6-1-2.8-1-1.5 0-2.7.7-2.7 1.8s1.1 1.6 2.7 1.8c1.7.2 2.8.8 2.8 1.9s-1.1 1.8-2.8 1.8c-1.2 0-2.3-.4-3-1.2M12 6.5v11" />
      </>
    ),
    chair: (
      <path d="M7 11V5a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v6M5 12h14a2 2 0 0 1 2 2v3H3v-3a2 2 0 0 1 2-2ZM6 17v4M18 17v4" />
    ),
  };

  return <svg {...common}>{paths[name] || paths.home}</svg>;
}

function PlayIcon() {
  return (
    <svg
      className="pap-play"
      viewBox="0 0 48 48"
      fill="none"
      aria-hidden="true">
      <circle cx="24" cy="24" r="24" fill="rgba(0,0,0,0.45)" />
      <polygon points="19,14 38,24 19,34" fill="white" />
    </svg>
  );
}

// Single place that maps DB columns to view fields.
function toView(l) {
  const unpublishedAt = l.admin_unpublished_at ?? null;
  const media = Array.isArray(l.images_table)
    ? l.images_table[0]
    : l.images_table;
  const images = [...(media?.images_url ?? [])]
    .sort((a, b) => a.position - b.position)
    .map((im, i) => ({
      src: im.publicUrl,
      alt: `${l.listing_name} photo ${i + 1}`,
    }));

  return {
    id: l.listing_id,
    title: l.listing_name,
    paid: l.payment_status === "paid",
    adminUnpublished: unpublishedAt != null,
    unpublishedOn: unpublishedAt
      ? new Date(unpublishedAt).toLocaleDateString("en-KE", {
          dateStyle: "medium",
        })
      : null,
    active: l.payment_status === "paid" && unpublishedAt == null,
    ward: l.ward_display_name,
    rent:
      l.price_kes != null
        ? `KSh ${kes.format(l.price_kes)}${l.listing_category === "Rentals" ? " / month" : ""}`
        : "-",
    type: l.category_type,
    furnishing: l.furnishing,
    term: l.rent_duration,
    plan: l.plan_name,
    created: l.created_at
      ? new Date(l.created_at).toLocaleDateString("en-KE", {
          dateStyle: "medium",
        })
      : null,
    overview: l.listing_description ?? null,
    mapUrl: l.location_url ?? null,
    exactLocation: l.ward_location ?? null,
    listingPhone: l.phone_number ?? null,
    reviewTag: l.review_tag ?? "",
    video: media?.video_url ?? null,
    images,
    lister: l.lister ?? {},
  };
}

export default function PropertyAdminPopup({
  seed,
  onClose,
  onMessageAgent = () => {},
  onTagChange = () => {},
  onUnpublish = () => {},
  onRepublish = () => {},
  onDelete = () => {},
}) {
  const id = seed.listing_id;
  const cacheKey = `listing:${id}`;

  const [detail, setDetail] = useState(
    () => getAdminCache(cacheKey)?.data ?? null,
  );
  const [error, setError] = useState(null);
  const [attempt, setAttempt] = useState(0);
  const [activeIndex, setActiveIndex] = useState(0);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [pending, setPending] = useState(null); // "unpublish" | "republish" | null
  const busy = pending !== null;
  const [actionError, setActionError] = useState(null);

  const run = async (kind, fn) => {
    setPending(kind);
    setBusy(true);
    setActionError(null);
    try {
      await fn();
    } catch (e) {
      setActionError(e.message);
    } finally {
      setPending(null);
    }
  };

  const view = useMemo(() => toView({ ...detail, ...seed }), [seed, detail]);
  const [tag, setTag] = useState(view.reviewTag);

  const STAT_CARDS = [
    { key: "views", label: "Total Views", icon: "eye", tone: "blue" },
    { key: "calls", label: "Total Calls", icon: "call", tone: "amber" },
    { key: "reviews", label: "Total Reviews", icon: "message", tone: "teal" },
    { key: "rating", label: "Rating", icon: "star", tone: "purple" },
  ];
  useEffect(() => setTag(view.reviewTag), [view.reviewTag]);

  useEffect(() => {
    if (!confirmDelete) return;
    const t = setTimeout(() => setConfirmDelete(false), 4000);
    return () => clearTimeout(t);
  }, [confirmDelete]);
  const statsKey = `listing-stats:${id}`;
  const [stats, setStats] = useState(
    () => getAdminCache(statsKey)?.data ?? null,
  );
  const [statsError, setStatsError] = useState(null);
  const [statsAttempt, setStatsAttempt] = useState(0);

  useEffect(() => {
    const entry = getAdminCache(statsKey);
    if (entry) setStats(entry.data);
    if (isAdminCacheFresh(entry)) return;

    const ctrl = new AbortController();
    setStatsError(null);
    (async () => {
      try {
        const res = await fetch(`/api/v1/admin/listings/${id}/analytics`, {
          signal: ctrl.signal,
        });
        if (!res.ok) throw new Error(`Failed to load stats (${res.status})`);
        const json = await res.json();
        setAdminCache(statsKey, json);
        setStats(json);
      } catch (e) {
        if (e.name !== "AbortError" && !entry) setStatsError(e.message);
      }
    })();
    return () => ctrl.abort();
  }, [id, statsKey, statsAttempt]);

  const detailLoading = !detail && !error;

  // Stale-while-revalidate, same pattern as the directory.
  useEffect(() => {
    const entry = getAdminCache(cacheKey);
    if (entry) setDetail(entry.data);
    if (isAdminCacheFresh(entry)) return;

    const ctrl = new AbortController();
    setError(null);
    (async () => {
      try {
        const res = await fetch(`/api/v1/admin/listings/${id}`, {
          signal: ctrl.signal,
        });
        if (!res.ok) throw new Error(`Failed to load listing (${res.status})`);
        const json = await res.json();
        setAdminCache(cacheKey, json);
        setDetail(json);
      } catch (e) {
        if (e.name !== "AbortError" && !entry) setError(e.message);
      }
    })();
    return () => ctrl.abort();
  }, [id, cacheKey, attempt]);

  const requestClose = () => {
    if (!busy) onClose();
  };

  // Latest onClose without re-running the effects below.
  const closeRef = useRef(onClose);
  useEffect(() => {
    closeRef.current = requestClose;
  });

  const dialogRef = useRef(null);
  const handleKeyDown = useCallback((e) => {
    if (e.key === "Escape") {
      closeRef.current();
      return;
    }
    if (e.key !== "Tab" || !dialogRef.current) return;
    const focusable = dialogRef.current.querySelectorAll(
      'a[href], button:not([disabled]), select, textarea, input, [tabindex]:not([tabindex="-1"])',
    );
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }, []);

  // Scroll lock, focus in, focus restore.
  useEffect(() => {
    const trigger = document.activeElement;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", handleKeyDown);
    dialogRef.current?.focus();
    return () => {
      document.body.style.overflow = prevOverflow;
      document.removeEventListener("keydown", handleKeyDown);
      trigger?.focus?.();
    };
  }, [handleKeyDown]);

  // Video first, then images by position (view.images is already sorted).
  const mediaItems = useMemo(
    () => [
      ...(view.video ? [{ video_url: view.video, image_url: null }] : []),
      ...view.images.map((im) => ({ image_url: im.src, video_url: null })),
    ],
    [view.video, view.images],
  );
  const active =
    mediaItems[Math.min(activeIndex, mediaItems.length - 1)] ?? null;
  const { lister } = view;
  const initials = (lister.username || "?")
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("");
  const mapQuery = `${view.exactLocation || view.ward}, Kenya`;

  const handleTag = (e) => {
    const prev = tag;
    setTag(e.target.value);
    // Handler should return a promise that rejects on failure so we can roll back.
    setActionError(null);
    Promise.resolve(onTagChange(e.target.value, view)).catch((err) => {
      setTag(prev);
      setActionError(err.message);
    });
  };

  return createPortal(
    <div
      className="pap-backdrop"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) requestClose();
      }}>
      <section
        ref={dialogRef}
        tabIndex={-1}
        className="pap-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="pap-title">
        <div className="pap-header">
          <div className="pap-heading-copy">
            <div className="pap-title-line">
              <h1 id="pap-title">{view.title}</h1>
              <span
                className={`pap-status ${view.active ? "" : "pap-status-pending"}`}>
                <span className="pap-status-dot" />
                {view.adminUnpublished
                  ? "Unpublished by admin"
                  : view.paid
                    ? "Active"
                    : "Pending"}
              </span>
            </div>
            <p className="pap-location">
              <Icon name="pin" size={17} />
              {view.ward}
            </p>
          </div>
          <div className="pap-facts" aria-label="Key property details">
            {" "}
            <div className="pap-fact">
              <Icon name="money" />
              <span>{view.rent}</span>
            </div>{" "}
            <div className="pap-fact">
              <Icon name="bed" />
              <span>{view.type}</span>
            </div>{" "}
            <div className="pap-fact">
              <Icon name="chair" />
              <span>{view.furnishing}</span>
            </div>{" "}
            <div className="pap-fact">
              <Icon name="calendar" />
              <span>{view.term}</span>
            </div>{" "}
          </div>
          <div className="pap-heading-meta">
            <span>Listing #{view.id}</span>
            {view.created && <span>Added {view.created}</span>}
            {view.unpublishedOn && (
              <span>Unpublished {view.unpublishedOn}</span>
            )}
          </div>
          <button
            className="pap-close"
            type="button"
            onClick={requestClose}
            aria-label="Close property details">
            <Icon name="close" size={20} />
          </button>
        </div>

        <section className="pap-card pap-stats" aria-label="Performance">
          <div className="pap-section-heading">
            <h2>Performance</h2>
          </div>
          <div className="pap-stat-grid">
            {statsError && !stats ? (
              <p className="pap-error pap-stat-error">
                {statsError}{" "}
                <button
                  type="button"
                  className="pap-link"
                  onClick={() => setStatsAttempt((n) => n + 1)}>
                  Retry
                </button>
              </p>
            ) : (
              STAT_CARDS.map(({ key, label, icon, tone }) => {
                const v = stats?.[key];

                return (
                  <div className="pap-stat" key={key}>
                    <span className={`pap-stat-icon pap-tone-${tone}`}>
                      <Icon name={icon} size={18} />
                    </span>
                    <div className="pap-stat-body">
                      <span className="pap-stat-label">{label}</span>
                      {!stats ? (
                        <span className="pap-skeleton pap-stat-skel" />
                      ) : (
                        <strong className="pap-stat-value">
                          {v == null
                            ? "—"
                            : key === "rating"
                              ? v.toFixed(1)
                              : kes.format(v)}
                        </strong>
                      )}
                    </div>
                  </div>
                );
              })
            )}
            <section className="pap-card pap-agent">
              <h2>Lister</h2>
              <div className="pap-agent-row">
                <div className="pap-avatar" aria-hidden="true">
                  {initials}
                </div>
                <div className="pap-agent-copy">
                  <strong>{lister.username}</strong>
                  <span>{lister.email || "No email"}</span>
                </div>
                {view.listingPhone || lister.phone ? (
                  <a
                    className="pap-icon-button"
                    href={`tel:${view.listingPhone || lister.phone}`}
                    aria-label={`Call ${lister.username}`}>
                    <Icon name="phone" />
                  </a>
                ) : (
                  <button
                    className="pap-icon-button"
                    type="button"
                    disabled
                    aria-label="No phone number">
                    <Icon name="phone" />
                  </button>
                )}
                {lister.email ? (
                  <a
                    className="pap-icon-button"
                    href={`mailto:${lister.email}`}
                    aria-label={`Email ${lister.username}`}>
                    <Icon name="mail" />
                  </a>
                ) : (
                  <button
                    className="pap-icon-button"
                    type="button"
                    disabled
                    aria-label="No email">
                    <Icon name="mail" />
                  </button>
                )}
              </div>
              <div className="pap-agency">
                <span>Plan</span>
                <strong>{view.plan}</strong>
              </div>
            </section>
          </div>
        </section>

        <div className="pap-layout">
          <main className="pap-main">
            <section className="pap-gallery" aria-label="Property media">
              <div className="pap-viewer">
                {active ? (
                  active.video_url ? (
                    <video
                      key={active.video_url}
                      className="pap-media"
                      src={active.video_url}
                      controls
                      playsInline
                    />
                  ) : (
                    (() => {
                      const { src, isTransformed } = buildCdnImageUrl(
                        active.image_url,
                        { width: 1200, fit: "contain" },
                      );
                      return (
                        <Image
                          key={active.image_url}
                          src={src}
                          alt={view.title}
                          fill
                          unoptimized={isTransformed}
                          sizes="(max-width: 1050px) 100vw, 900px"
                          className="pap-media-img"
                        />
                      );
                    })()
                  )
                ) : (
                  <div className="pap-placeholder">
                    <span>No media available</span>
                  </div>
                )}
              </div>

              {mediaItems.length > 1 && (
                <div className="pap-strip">
                  {mediaItems.map((item, i) => (
                    <button
                      key={`${item.video_url ?? item.image_url}-${i}`}
                      type="button"
                      className={`pap-thumb ${i === activeIndex ? "pap-thumb-active" : ""}`}
                      onClick={() => setActiveIndex(i)}
                      aria-label={`View media ${i + 1}`}
                      aria-pressed={i === activeIndex}>
                      {item.image_url ? (
                        (() => {
                          const { src, isTransformed } = buildCdnImageUrl(
                            item.image_url,
                            { width: 200 },
                          );
                          return (
                            <Image
                              src={src}
                              alt=""
                              fill
                              unoptimized={isTransformed}
                              sizes="120px"
                              className="pap-thumb-image"
                            />
                          );
                        })()
                      ) : (
                        <div className="pap-thumb-video" />
                      )}
                      {item.video_url && <PlayIcon />}
                    </button>
                  ))}
                </div>
              )}
            </section>

            <section className="pap-card pap-location-card">
              <div className="pap-section-heading">
                <h2>Property location</h2>
                <span>{view.mapUrl ? "Exact pin" : "Approximate area"}</span>
              </div>
              {detailLoading ? (
                <div className="pap-skeleton pap-map-frame" />
              ) : (
                <iframe
                  className="pap-map-frame"
                  src={
                    view.mapUrl ??
                    `https://maps.google.com/maps?q=${encodeURIComponent(mapQuery)}&z=14&output=embed`
                  }
                  allowFullScreen
                  title={`Map showing ${view.ward}`}
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                />
              )}
            </section>
          </main>

          <aside className="pap-actions" aria-labelledby="pap-actions-title">
            <section className="pap-card pap-action-card">
              <h2 id="pap-actions-title">Admin actions</h2>
              <button
                className="pap-button pap-button-primary"
                type="button"
                onClick={() => onMessageAgent(view)}>
                <Icon name="message" />
                <span>Message lister</span>
              </button>
              <div className="pap-action-divider" />
              <label className="pap-field-label" htmlFor="pap-review-tag">
                Tag for pull-down review
              </label>
              <select
                id="pap-review-tag"
                className="pap-select"
                value={tag}
                onChange={handleTag}
                disabled={detailLoading || busy}>
                <option value="">No tag</option>
                {REVIEW_TAGS.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
              <button
                className={`pap-button ${view.adminUnpublished ? "pap-button-primary" : "pap-button-warning"}`}
                type="button"
                disabled={busy}
                onClick={() =>
                  view.adminUnpublished
                    ? run("republish", () => onRepublish(view))
                    : run("unpublish", () => onUnpublish(view))
                }>
                <Icon name={view.adminUnpublished ? "eye" : "eyeOff"} />
                <span>
                  {pending === "unpublish"
                    ? "Unpublishing…"
                    : pending === "republish"
                      ? "Republishing…"
                      : view.adminUnpublished
                        ? "Republish listing"
                        : "Unpublish listing"}
                </span>
              </button>
              <p className="pap-help">
                {view.adminUnpublished
                  ? "This makes the listing visible on the public site again, if payment is active."
                  : "This hides the listing from the public site but preserves the record."}
              </p>
              <div className="pap-action-divider pap-action-divider-spaced" />
              <button
                className={`pap-button pap-button-danger ${confirmDelete ? "pap-button-danger-armed" : ""}`}
                type="button"
                disabled={busy}
                onClick={() =>
                  confirmDelete ? onDelete(view) : setConfirmDelete(true)
                }>
                {actionError && <p className="pap-error">{actionError}</p>}
                <Icon name="trash" />
                <span>
                  {confirmDelete ? "Click again to confirm" : "Delete property"}
                </span>
              </button>
              <p className="pap-help pap-danger-help">
                This action cannot be undone.
              </p>
            </section>
          </aside>
        </div>

        <div className="pap-detail-cards">
          <section className="pap-card pap-overview">
            {detailLoading ? (
              <div className="pap-skeleton pap-skeleton-text" />
            ) : error ? (
              <p className="pap-error">
                {error}{" "}
                <button
                  type="button"
                  className="pap-link"
                  onClick={() => setAttempt((n) => n + 1)}>
                  Retry
                </button>
              </p>
            ) : view.overview ? (
              <DescriptionRenderer description={view.overview} />
            ) : (
              <p>No description provided.</p>
            )}
          </section>
        </div>
      </section>
    </div>,
    document.body,
  );
}
