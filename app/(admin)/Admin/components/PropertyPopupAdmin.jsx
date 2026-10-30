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
    message: (
      <>
        <path d="M21 11.5a7.5 7.5 0 0 1-7.5 7.5H5l-3 2v-9.5A7.5 7.5 0 0 1 9.5 4h4A7.5 7.5 0 0 1 21 11.5Z" />
        <path d="M8 12h.01M12 12h.01M16 12h.01" />
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
    phone: (
      <>
        <path d="M6 3h12a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z" />
        <path d="M10 18h4" />
      </>
    ),
    mail: (
      <>
        <rect x="3" y="5" width="18" height="14" rx="2" />
        <path d="m3 7 9 6 9-6" />
      </>
    ),
  };

  return <svg {...common}>{paths[name] || paths.home}</svg>;
}

// Single place that maps DB columns to view fields.
function toView(l) {
  const media = Array.isArray(l.images_table)
    ? l.images_table[0]
    : l.images_table;
  const images = [...(media?.images_url ?? [])]
    .sort((a, b) => a.position - b.position)
    .map((im, i) => ({
      src: im.publicUrl,
      alt: `${l.listing_name} photo ${i + 1}`,
    }));
  const hasCoords = l.latitude != null && l.longitude != null;

  return {
    id: l.listing_id,
    title: l.listing_name,
    active: l.payment_status === "paid",
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
    overview: l.description ?? null,
    coords: hasCoords
      ? { lat: Number(l.latitude), lng: Number(l.longitude) }
      : null,
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
  onDelete = () => {},
}) {
  const id = seed.listing_id;
  const cacheKey = `listing:${id}`;

  const [detail, setDetail] = useState(
    () => getAdminCache(cacheKey)?.data ?? null,
  );
  const [error, setError] = useState(null);
  const [attempt, setAttempt] = useState(0);
  const [imgIdx, setImgIdx] = useState(0);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const view = useMemo(() => toView({ ...seed, ...detail }), [seed, detail]);
  const [tag, setTag] = useState(view.reviewTag);
  useEffect(() => setTag(view.reviewTag), [view.reviewTag]);

  useEffect(() => {
    if (!confirmDelete) return;
    const t = setTimeout(() => setConfirmDelete(false), 4000);
    return () => clearTimeout(t);
  }, [confirmDelete]);

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
        const res = await fetch(`/api/v1/admin/listing/${id}`, {
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

  // Latest onClose without re-running the effects below.
  const closeRef = useRef(onClose);
  useEffect(() => {
    closeRef.current = onClose;
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

  const img = view.images[Math.min(imgIdx, view.images.length - 1)];
  const { lister } = view;
  const initials = (lister.username || "?")
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("");
  const mapQuery = view.coords
    ? `${view.coords.lat},${view.coords.lng}`
    : `${view.ward}, Kenya`;

  const handleTag = (e) => {
    const prev = tag;
    setTag(e.target.value);
    // Handler should return a promise that rejects on failure so we can roll back.
    Promise.resolve(onTagChange(e.target.value, view)).catch(() =>
      setTag(prev),
    );
  };

  return createPortal(
    <div
      className="pap-backdrop"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
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
                {view.active ? "Active" : "Pending"}
              </span>
            </div>
            <p className="pap-location">
              <Icon name="pin" size={17} />
              {view.ward}
            </p>
          </div>
          <div className="pap-heading-meta">
            <span>Listing #{view.id}</span>
            {view.created && <span>Added {view.created}</span>}
          </div>
          <button
            className="pap-close"
            type="button"
            onClick={onClose}
            aria-label="Close property details">
            <Icon name="close" size={20} />
          </button>
        </div>

        <div className="pap-facts" aria-label="Key property details">
          <div className="pap-fact">
            <Icon name="money" />
            <span>{view.rent}</span>
          </div>
          <div className="pap-fact">
            <Icon name="bed" />
            <span>{view.type}</span>
          </div>
          <div className="pap-fact">
            <Icon name="chair" />
            <span>{view.furnishing}</span>
          </div>
          <div className="pap-fact">
            <Icon name="calendar" />
            <span>{view.term}</span>
          </div>
        </div>

        <div className="pap-layout">
          <main className="pap-main">
            <section
              className={`pap-gallery ${view.images.length < 2 ? "pap-gallery-single" : ""}`}
              aria-label="Property photos">
              {img ? (
                <img
                  className="pap-gallery-feature"
                  src={img.src}
                  alt={img.alt}
                />
              ) : (
                <div className="pap-gallery-feature pap-empty">No photos</div>
              )}
              {view.images.length > 1 && (
                <div className="pap-gallery-thumbs">
                  {view.images.map((im, i) => (
                    <button
                      className={`pap-thumb ${i === imgIdx ? "pap-thumb-active" : ""}`}
                      type="button"
                      key={`${im.src}-${i}`}
                      onClick={() => setImgIdx(i)}
                      aria-label={`Show photo ${i + 1}`}
                      aria-pressed={i === imgIdx}>
                      <img src={im.src} alt="" loading="lazy" />
                    </button>
                  ))}
                </div>
              )}
              {view.video && (
                <video
                  className="pap-video"
                  src={view.video}
                  controls
                  preload="metadata"
                />
              )}
            </section>

            <div className="pap-detail-cards">
              <section className="pap-card pap-overview">
                <h2>Overview</h2>
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
                ) : (
                  <p>{view.overview || "No description provided."}</p>
                )}
              </section>

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
                  {lister.phone ? (
                    <a
                      className="pap-icon-button"
                      href={`tel:${lister.phone}`}
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

            <section className="pap-card pap-location-card">
              <div className="pap-section-heading">
                <h2>Property location</h2>
                <span>{view.coords ? "Exact pin" : "Approximate area"}</span>
              </div>
              {detailLoading ? (
                <div className="pap-skeleton pap-map-frame" />
              ) : (
                <iframe
                  className="pap-map-frame"
                  src={`https://maps.google.com/maps?q=${encodeURIComponent(mapQuery)}&z=${view.coords ? 16 : 14}&output=embed`}
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
                disabled={detailLoading}>
                <option value="">No tag</option>
                {REVIEW_TAGS.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
              <button
                className="pap-button pap-button-warning"
                type="button"
                onClick={() => onUnpublish(view)}>
                <Icon name="eyeOff" />
                <span>Unpublish listing</span>
              </button>
              <p className="pap-help">
                This hides the listing from the public site but preserves the
                record.
              </p>
              <div className="pap-action-divider pap-action-divider-spaced" />
              <button
                className={`pap-button pap-button-danger ${confirmDelete ? "pap-button-danger-armed" : ""}`}
                type="button"
                onClick={() =>
                  confirmDelete ? onDelete(view) : setConfirmDelete(true)
                }>
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
      </section>
    </div>,
    document.body,
  );
}
