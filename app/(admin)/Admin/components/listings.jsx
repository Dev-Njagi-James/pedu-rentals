"use client";

import React, { useState, useEffect } from "react";
import styles from "../css/listings.module.css";
import PropertyCardV1 from "@/app/(user)/properties/components/PropertyCardV1";
import {
  getAdminCache,
  setAdminCache,
  isAdminCacheFresh,
  invalidateAdminCache,
} from "@/lib/cache/adminCache";
import PropertyAdminPopup from "./PropertyPopupAdmin";

const DEFAULT_KEY = "listings:page=1&sort=newest";

const PRICE_BANDS = {
  all: {},
  low: { maxPrice: 9999 },
  mid: { minPrice: 10000, maxPrice: 30000 },
  high: { minPrice: 30001 },
};

export default function AdminPropertiesDirectory() {
  const initial = getAdminCache(DEFAULT_KEY)?.data;
  const [items, setItems] = useState(initial?.items ?? []);
  const [facets, setFacets] = useState(
    initial?.facets ?? { categories: [], wards: [] },
  );
  const [totalItems, setTotalItems] = useState(initial?.totalItems ?? 0);
  const [totalPages, setTotalPages] = useState(initial?.totalPages ?? 1);
  const [loading, setLoading] = useState(!initial);
  const [error, setError] = useState(null);

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [status, setStatus] = useState("");
  const [category, setCategory] = useState("");
  const [ward, setWard] = useState("");
  const [price, setPrice] = useState("all");
  const [sort, setSort] = useState("newest");
  const [selected, setSelected] = useState(null);
  const [deleting, setDeleting] = useState([]); // listing ids with a delete in flight
  const [toast, setToast] = useState(null); // { kind: "info" | "success" | "error", text }

  useEffect(() => {
    if (!toast || toast.kind === "info") return;
    const t = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(t);
  }, [toast]);

  const visibleItems = items.filter((i) => !deleting.includes(i.listing_id));

  const patchListing = (id, patch) => {
  setItems((prev) =>
    prev.map((i) => (i.listing_id === id ? { ...i, ...patch } : i)),
  );
  setSelected((prev) =>
    prev && prev.listing_id === id ? { ...prev, ...patch } : prev,
  );
  invalidateAdminCache();
};

const callAdmin = async (view, method, body) => {
  const res = await fetch(`/api/v1/admin/listings/${view.id}`, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || `Action failed (${res.status})`);
  return json;
};

const handleUnpublish = async (view) =>
  patchListing(view.id, await callAdmin(view, "PATCH", { action: "unpublish" }));

const handleRepublish = async (view) =>
  patchListing(view.id, await callAdmin(view, "PATCH", { action: "republish" }));

// Must reject on failure so the popup rolls the select back.
const handleTagChange = async (tag, view) =>
  patchListing(view.id, await callAdmin(view, "PATCH", { action: "tag", tag }));

const handleDelete = (view) => {
  if (deleting.includes(view.id)) return;
  setDeleting((d) => [...d, view.id]);
  setSelected(null);
  setToast({ kind: "info", text: `Deleting "${view.title}"…` });

  (async () => {
    try {
      await callAdmin(view, "DELETE");
      setItems((prev) => prev.filter((i) => i.listing_id !== view.id));
      setTotalItems((n) => Math.max(0, n - 1));
      invalidateAdminCache();
      setToast({ kind: "success", text: "Listing deleted" });
    } catch (e) {
      setToast({ kind: "error", text: `Delete failed: ${e.message}` });
    } finally {
      setDeleting((d) => d.filter((x) => x !== view.id));
    }
  })();
};
  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedQ(search);
      setPage(1);
    }, 350);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    let cancelled = false;

    const p = new URLSearchParams({ page: String(page), sort });
    if (debouncedQ) p.set("q", debouncedQ);
    if (status) p.set("status", status);
    if (category) p.set("category", category);
    if (ward) p.set("ward", ward);
    Object.entries(PRICE_BANDS[price]).forEach(([k, v]) => p.set(k, String(v)));
    const key = `listings:${p.toString()}`;

    const apply = (d) => {
      setItems(d.items);
      setTotalItems(d.totalItems);
      setTotalPages(d.totalPages);
      if (d.facets) setFacets(d.facets);
    };

    const entry = getAdminCache(key);
    if (entry) {
      apply(entry.data);
      setLoading(false);
      setError(null);
      if (isAdminCacheFresh(entry)) return;
    } else {
      setLoading(true);
      setError(null);
    }

    (async () => {
      try {
        const res = await fetch(`/api/v1/admin/listings?${p}`);
        if (!res.ok) throw new Error(`Failed to load listings (${res.status})`);
        const json = await res.json();
        const next = {
          items: json.items ?? [],
          totalItems: json.totalItems ?? 0,
          totalPages: json.totalPages ?? 1,
          facets: json.facets ?? null,
        };
        setAdminCache(key, next);
        if (!cancelled) apply(next);
      } catch (e) {
        if (!cancelled && !entry) setError(e.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [page, debouncedQ, status, category, ward, price, sort]);

  const onFilter = (setter) => (e) => {
    setter(e.target.value);
    setPage(1);
  };

  const pageSize = 12;
  const first = totalItems === 0 ? 0 : (page - 1) * pageSize + 1;
  const last = Math.min(page * pageSize, totalItems);

  return (
    <div className={styles.root}>
      <div className={styles.headerSection}>
        <h1 className={styles.mainTitle}>Properties & Units Directory</h1>

        <div className={styles.filterToolbar}>
          <div className={styles.searchBox}>
            <svg
              className={styles.searchIcon}
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <input
              type="text"
              placeholder="Search properties or IDs..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className={styles.searchInput}
            />
          </div>

          <div className={styles.dropdownFilters}>
            <select
              value={status}
              onChange={onFilter(setStatus)}
              className={styles.selectDropdown}>
              <option value="">All Statuses</option>
              <option value="paid">Active</option>
              <option value="pending">Pending</option>
              <option value="unpublished">Unpublished</option>
            </select>

            <select
              value={category}
              onChange={onFilter(setCategory)}
              className={styles.selectDropdown}>
              <option value="">All Property Types</option>
              {facets.categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>

            <select
              value={ward}
              onChange={onFilter(setWard)}
              className={styles.selectDropdown}>
              <option value="">All Wards</option>
              {facets.wards.map((w) => (
                <option key={w.ward_id} value={w.ward_id}>
                  {w.ward_name}
                </option>
              ))}
            </select>

            <select
              value={price}
              onChange={onFilter(setPrice)}
              className={styles.selectDropdown}>
              <option value="all">Price: Any</option>
              <option value="low">Under KSh 10,000</option>
              <option value="mid">KSh 10,000 - 30,000</option>
              <option value="high">Above KSh 30,000</option>
            </select>

            <select
              value={sort}
              onChange={onFilter(setSort)}
              className={styles.sortDropdown}>
              <option value="newest">Sort: Newest</option>
              <option value="price">Sort: Highest Price</option>
            </select>
          </div>
        </div>
      </div>

      {error && <div className={styles.errorState}>{error}</div>}

      {loading && items.length === 0 && (
        <div className={styles.grid}>
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className={styles.skeletonCard} />
          ))}
        </div>
      )}

      {!loading && !error && visibleItems.length === 0 && (
        <div className={styles.emptyState}>
          <p>No properties found matching your criteria.</p>
        </div>
      )}

      {visibleItems.length > 0 && (
        <div
          className={`${styles.gridWrap} ${loading ? styles.gridLoading : ""}`}>
          <div className={styles.grid}>
            {visibleItems.map((listing) => (
              <div key={listing.listing_id} className={styles.cardWrapper}>
                <PropertyCardV1 listing={listing} />

                <div className={styles.cardActionsContainer}>
                  <div className={styles.listerRow}>
                    <span className={styles.listerName}>
                      {listing.lister.username}
                    </span>
                    {(() => {
                      const s = listing.admin_unpublished_at
                        ? "unpublished"
                        : listing.payment_status === "paid"
                          ? "active"
                          : "pending";
                      const cls = {
                        active: styles.statusActive,
                        pending: styles.statusPending,
                        unpublished: styles.statusUnpublished,
                      }[s];
                      const label = {
                        active: "Active",
                        pending: "Pending",
                        unpublished: "Unpublished",
                      }[s];
                      return (
                        <span className={`${styles.statusPill} ${cls}`}>
                          {label}
                        </span>
                      );
                    })()}
                  </div>
                  <button
                    className={styles.actionsDropdownBtn}
                    onClick={() => setSelected(listing)}>
                    Actions
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {totalPages > 1 && (
        <div className={styles.paginationFooter}>
          <span className={styles.paginationInfo}>
            Showing {first}-{last} of {totalItems} properties
          </span>
          <div className={styles.paginationButtons}>
            <button
              className={styles.pageArrowBtn}
              onClick={() => setPage((p) => Math.max(p - 1, 1))}
              disabled={page === 1}>
              &#8592;
            </button>
            {Array.from({ length: totalPages }).map((_, i) => (
              <button
                key={i + 1}
                className={`${styles.pageNumberBtn} ${page === i + 1 ? styles.activePage : ""}`}
                onClick={() => setPage(i + 1)}>
                {i + 1}
              </button>
            ))}
            <button
              className={styles.pageArrowBtn}
              onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
              disabled={page === totalPages}>
              &#8594;
            </button>
          </div>
        </div>
      )}

      {selected && (
        <PropertyAdminPopup
          key={selected.listing_id}
          seed={selected}
          onClose={() => setSelected(null)}
          onUnpublish={handleUnpublish}
          onRepublish={handleRepublish}
          onTagChange={handleTagChange}
          onDelete={handleDelete}
        />
      )}

      {toast && (
        <div
          role="status"
          className={`${styles.toast} ${
            toast.kind === "error"
              ? styles.toastError
              : toast.kind === "success"
                ? styles.toastSuccess
                : ""
          }`}>
          {toast.text}
        </div>
      )}
      
    </div>
  );
}
