"use client";

import { useState, useEffect, useCallback, Fragment, useRef } from "react";
import PropertyCard from "@/app/(user)/properties/components/PropertyCardV1";
import styles from "../css/MyListing.module.css";
import AddListing from "./AddListing";
import { EDIT_WINDOW_DAYS } from "@/lib/constants";
import {
  getCachedPage,
  isCacheFresh,
  setCachedPage,
} from "@/lib/cache/myListingsCache";
import CheckoutPopup from "./CheckoutPopup";
import { invalidateMyListingsCache } from "@/lib/cache/myListingsCache";
import DeleteConfirm from "./DeleteConfirm";

const PAGE_SIZE = 20;

export default function ListingsPanel({ onUploadStateChange }) {
  const [listings, setListings] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const [isFetching, setIsFetching] = useState(false);
  const [error, setError] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [deleteError, setDeleteError] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [editingListing, setEditingListing] = useState(null);
  const [wardPopup, setWardPopup] = useState(null);
  const [checkoutListing, setCheckoutListing] = useState(null);
  const deleteInFlight = useRef(false);
  const requestIdRef = useRef(0);

  const openCheckout = (listing) => {
    let defaultPlan = null;
    if (
      listing.payment_status === "paid" &&
      listing.admin_unpublished_at == null
    ) {
      const subs = Array.isArray(listing.subscriptions_table)
        ? listing.subscriptions_table
        : [];
      const latest = subs.sort(
        (a, b) => new Date(b.expires_at) - new Date(a.expires_at),
      )[0];
      defaultPlan = latest?.plan_name ?? null;
    }
    setCheckoutListing({ ...listing, defaultPlan });
    onUploadStateChange?.(true);
  };

  const closeCheckout = () => {
    setCheckoutListing(null);
    onUploadStateChange?.(false);
  };

  const handlePaid = () => {
    invalidateMyListingsCache();
    closeCheckout();
    fetchListings(currentPage, { showLoading: false, bypassCache: true });
  };

  const fetchListings = useCallback(
    async (page, { showLoading = true, bypassCache = false } = {}) => {
      const cacheKey = status ? `${page}:${status}` : String(page);
      const cached = !bypassCache ? getCachedPage(cacheKey) : null;

      // Cache hit — render instantly, no fade.
      if (cached) {
        setListings(cached.data.listings);
        setPagination(cached.data.pagination);
        setLoading(false);
        setError(null);
        if (requestIdRef.current > 0) {
          setIsFetching(false);
          requestIdRef.current = 0;
        }

        // Stale — refresh silently in the background, UI stays as-is until it resolves.
        if (!isCacheFresh(cached)) {
          fetchListings(page, { showLoading: false, bypassCache: true });
        }
        return;
      }

      const isFirstLoad = listings.length === 0 && pagination === null;
      const myRequestId = ++requestIdRef.current;

      if (showLoading) {
        setError(null);
        if (isFirstLoad) {
          setLoading(true);
        } else {
          setIsFetching(true);
        }
      }

      try {
        const res = await fetch(
          `/api/v1/listings/me?page=${page}&status=${status}`,
        );
        if (!res.ok) throw new Error("Failed to fetch listings.");
        const json = await res.json();

        // Race guard: ignore stale responses.
        if (myRequestId !== requestIdRef.current) return;

        const nextListings = json.listings ?? [];
        const nextPagination = {
          total_pages: Math.ceil((json.total ?? 0) / (json.limit ?? PAGE_SIZE)),
          total_records: json.total ?? 0,
        };

        setCachedPage(cacheKey, {
          listings: nextListings,
          pagination: nextPagination,
        });

        setListings((prev) =>
          JSON.stringify(prev) !== JSON.stringify(nextListings)
            ? nextListings
            : prev,
        );
        setPagination(nextPagination);
        setError(null);
        if (showLoading) {
          if (isFirstLoad) setLoading(false);
          setIsFetching(false);
          requestIdRef.current = 0;
        }
      } catch (err) {
        // Race guard: ignore stale responses.
        if (myRequestId !== requestIdRef.current) return;
        // Only surface the error banner on a user-facing (showLoading) fetch.
        if (showLoading) {
          if (isFirstLoad) setLoading(false);
          setIsFetching(false);
          requestIdRef.current = 0;
          setError(err.message);
        }
      }
    },
    [status],
  );

  useEffect(() => {
    fetchListings(currentPage);
  }, [currentPage, fetchListings]);

  // Edit changed this listing's data — refresh silently, no skeleton, cache bypassed.
  const handleEditDone = useCallback(() => {
    setEditingListing(null);
    fetchListings(currentPage, { showLoading: false, bypassCache: true });
  }, [currentPage, fetchListings]);

  const handlePageChange = (page) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDeleteClick = (listing) => {
    setDeleteError(null);
    setDeleteTarget(listing);
  };
  const cancelConfirm = useCallback(() => setDeleteTarget(null), []);

const executeDelete = async (listing_id, source) => {
  if (deleteInFlight.current) return;
  deleteInFlight.current = true;

  setDeletingId(listing_id);
  setDeleteError(null);

  const prev = listings;

  const endpoint =
    source === "v1"
      ? `/api/v1/listings/${listing_id}`
      : `/api/Listing?listing_id=${listing_id}`;

  try {
    const res = await fetch(endpoint, { method: "DELETE" });

    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      throw new Error(json.error ?? "Delete failed.");
    }

    setListings((ls) => ls.filter((l) => l.listing_id !== listing_id));
    setDeleteTarget(null);
    invalidateMyListingsCache();
    fetchListings(currentPage, { showLoading: false, bypassCache: true });
  } catch (err) {
    setListings(prev);
    setDeleteTarget(null);
    setDeleteError(err.message);
  } finally {
    setDeletingId(null);
    deleteInFlight.current = false;
  }
};
  const totalPages = pagination?.total_pages ?? 1;

  const pageNumbers = () => {
    const pages = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
      return pages;
    }
    pages.push(1);
    if (currentPage > 3) pages.push("...");
    const start = Math.max(2, currentPage - 1);
    const end = Math.min(totalPages - 1, currentPage + 1);
    for (let i = start; i <= end; i++) pages.push(i);
    if (currentPage < totalPages - 2) pages.push("...");
    pages.push(totalPages);
    return pages;
  };

  function canEdit(created_at) {
    if (!created_at) return false;
    const normalized =
      created_at.endsWith("Z") || created_at.includes("+")
        ? created_at
        : created_at.replace(" ", "T") + "Z";
    const diffMs = Date.now() - new Date(normalized).getTime();
    return diffMs / (1000 * 60 * 60 * 24) <= EDIT_WINDOW_DAYS;
  }

  if (checkoutListing) {
    return (
      <CheckoutPopup
        listingId={checkoutListing.listing_id}
        categoryName={checkoutListing.listing_category}
        propertyLabel={checkoutListing.listing_category}
        defaultPlan={checkoutListing.defaultPlan}
        onClose={closeCheckout}
        onPaid={handlePaid}
      />
    );
  }

  // Render edit form instead of listings grid
  if (editingListing) {
    return (
      <AddListing
        prefill={editingListing}
        onDone={handleEditDone}
        onUploadStateChange={onUploadStateChange}
      />
    );
  }

  const renderCard = (listing) => {
    const isUnpublished = Boolean(listing.admin_unpublished_at);
    const isPending =
      listing.payment_status === "pending" && !isUnpublished;
    const isUnsubscribed = Boolean(listing.is_unsubscribed);
    return (
      <Fragment key={listing.listing_id}>
        <div className={styles.cardWrapper}>
          {isUnpublished && (
            <span className={styles.unpublishedBadge}>
              Unpublished by admin
            </span>
          )}
          {isPending && (
            <span className={styles.pendingBadge}>Pending payment</span>
          )}
          {isUnsubscribed && (
            <span className={styles.unsubscribedBadge}>
              Unsubscribed
            </span>
          )}
          <PropertyCard
            listing={listing}
            trackCalls={false}
            onWardClick={(ward_id, ward_name, property_location) =>
              setWardPopup({ ward_id, ward_name, property_location })
            }
          />

          {isPending && (
            <button
              className={styles.payBtn}
              onClick={() => openCheckout(listing)}>
              Complete payment
            </button>
          )}
          {isUnsubscribed && (
            <button
              className={styles.payBtn}
              onClick={() => openCheckout(listing)}>
              Re-subscribe
            </button>
          )}

          <div className={styles.cardActions}>
            <button
              className={styles.deleteBtn}
              onClick={() => handleDeleteClick(listing)}
              disabled={deletingId === listing.listing_id}
              aria-label={`Delete ${listing.listing_name}`}>
              <i className="hgi hgi-stroke hgi-rounded hgi-delete-02"></i>
            </button>
            <button
              className={styles.editBtn}
              onClick={() => setEditingListing(listing)}
              disabled={!canEdit(listing.created_at)}
              title={
                !canEdit(listing.created_at)
                  ? "Edit window has expired"
                  : "Edit listing"
              }>
              <i className="hgi hgi-stroke hgi-rounded hgi-edit-02"></i>
            </button>
          </div>
        </div>
      </Fragment>
    );
  };

  const unpublishedItems = listings.filter(
    (l) => Boolean(l.admin_unpublished_at),
  );
  const pendingItems = listings.filter(
    (l) => l.payment_status === "pending" && !Boolean(l.admin_unpublished_at),
  );
  const unsubscribedItems = listings.filter((l) => Boolean(l.is_unsubscribed));
  const publishedItems = listings.filter(
    (l) =>
      !Boolean(l.admin_unpublished_at) &&
      l.payment_status !== "pending" &&
      !Boolean(l.is_unsubscribed),
  );

  const showGrouped = status === "";

  const statusLabels = {
    active: "Active listings",
    pending: "Pending listings",
    unpublished: "Unpublished listings",
    unsubscribed: "Unsubscribed listings",
  };

  return (
    <div className={styles.root}>
      {/* ── Header ── */}
      <div className={styles.header}>
        <h2 className={styles.title}>My Listings</h2>
        <div className={styles.headerMeta}>
          {!loading && pagination && (
            <span className={styles.count}>
              {pagination.total_records} listing
              {pagination.total_records !== 1 ? "s" : ""}
            </span>
          )}
          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setCurrentPage(1);
            }}
            className={styles.statusSelect}>
            <option value="">All</option>
            <option value="active">Active</option>
            <option value="pending">Pending</option>
            <option value="unpublished">Unpublished</option>
            <option value="unsubscribed">Unsubscribed</option>
          </select>
        </div>
      </div>

      {/* ── Global delete error ── */}
      {deleteError && <p className={styles.errorBanner}>{deleteError}</p>}

      {/* ── Fetch error ── */}
      {error && <div className={styles.errorState}>{error}</div>}

      {/* ── Skeletons (first load only) ── */}
      {loading && (
        <div className={styles.grid}>
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className={styles.skeleton} />
          ))}
        </div>
      )}

      {/* ── Results area ── */}
      {!loading && (
        <div
          className={`${styles.results} ${isFetching ? styles.fetching : ""}`}
          aria-busy={isFetching}
        >
          {/* ── Empty ── */}
          {!error && listings.length === 0 && (
            <div className={styles.emptyState}>
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
                <path
                  d="M3 10V20M21 10V20M3 10h18M3 10L12 3l9 7"
                  stroke="currentColor"
                  strokeWidth="1.2"
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
              <p>You have no listings yet.</p>
            </div>
          )}

          {/* ── Grid ── */}
          {listings.length > 0 && (
            <div className={styles.grid}>
              {showGrouped ? (
                <>
                  {unpublishedItems.length > 0 && (
                    <>
                      <h3 className={styles.sectionHeading}>
                        Unpublished listings
                      </h3>
                      {unpublishedItems.map(renderCard)}
                    </>
                  )}
                  {pendingItems.length > 0 && (
                    <>
                      <h3 className={styles.sectionHeading}>
                        Pending listings
                      </h3>
                      {pendingItems.map(renderCard)}
                    </>
                  )}
                  {unsubscribedItems.length > 0 && (
                    <>
                      <h3 className={styles.sectionHeading}>
                        Unsubscribed listings
                      </h3>
                      {unsubscribedItems.map(renderCard)}
                    </>
                  )}
                  {publishedItems.length > 0 && (
                    <>
                      <h3 className={styles.sectionHeading}>
                        Published listings
                      </h3>
                      {publishedItems.map(renderCard)}
                    </>
                  )}
                </>
              ) : (
                <>
                  <h3 className={styles.sectionHeading}>
                    {statusLabels[status] || "My listings"}
                  </h3>
                  {listings.map(renderCard)}
                </>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Pagination ── */}
      {!loading && totalPages > 1 && (
        <div className={styles.pagination}>
          <button
            className={styles.pageBtn}
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
            aria-label="Previous page">
            &#8592;
          </button>

          {pageNumbers().map((p, i) =>
            p === "..." ? (
              <span key={`ellipsis-${i}`} className={styles.ellipsis}>
                …
              </span>
            ) : (
              <button
                key={p}
                className={`${styles.pageBtn} ${p === currentPage ? styles.pageBtnActive : ""}`}
                onClick={() => handlePageChange(p)}>
                {p}
              </button>
            ),
          )}

          <button
            className={styles.pageBtn}
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            aria-label="Next page">
            &#8594;
          </button>
        </div>
      )}

      {wardPopup && (
        <div className={styles.wardOverlay} onClick={() => setWardPopup(null)}>
          <div
            className={styles.wardModal}
            onClick={(e) => e.stopPropagation()}>
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
                  style={{ border: "none", display: "block" }}
                  allowFullScreen
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  title={`Map of ${wardPopup.ward_name}`}
                />
              ) : (
                <p style={{ padding: "1rem" }}>
                  No map available for this ward.
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {deleteTarget && (
        <DeleteConfirm
          listing={deleteTarget}
          deleting={deletingId === deleteTarget.listing_id}
          onCancel={cancelConfirm}
          onConfirm={() =>
            executeDelete(deleteTarget.listing_id, deleteTarget._source)
          }
        />
      )}

    </div>
  );
}
