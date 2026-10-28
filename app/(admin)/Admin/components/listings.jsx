"use client";

import React, { useState, useEffect } from "react";
import styles from "../css/listings.module.css";
import PropertyCardV1 from "@/app/(user)/properties/components/PropertyCardV1";

const PRICE_BANDS = {
  all: {},
  low: { maxPrice: 9999 },
  mid: { minPrice: 10000, maxPrice: 30000 },
  high: { minPrice: 30001 },
};

export default function AdminPropertiesDirectory() {
  const [items, setItems] = useState([]);
  const [facets, setFacets] = useState({ categories: [], wards: [] });
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [status, setStatus] = useState("");
  const [category, setCategory] = useState("");
  const [ward, setWard] = useState("");
  const [price, setPrice] = useState("all");
  const [sort, setSort] = useState("newest");

  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedQ(search);
      setPage(1);
    }, 350);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const p = new URLSearchParams({ page: String(page), sort });
        if (debouncedQ) p.set("q", debouncedQ);
        if (status) p.set("status", status);
        if (category) p.set("category", category);
        if (ward) p.set("ward", ward);
        Object.entries(PRICE_BANDS[price]).forEach(([k, v]) =>
          p.set(k, String(v)),
        );

        const res = await fetch(`/api/v1/admin/listings?${p}`);
        if (!res.ok) throw new Error(`Failed to load listings (${res.status})`);
        const json = await res.json();
        if (cancelled) return;
        setItems(json.items ?? []);
        setTotalItems(json.totalItems ?? 0);
        setTotalPages(json.totalPages ?? 1);
        if (json.facets) setFacets(json.facets);
      } catch (e) {
        if (!cancelled) setError(e.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
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

      {loading && (
        <div className={styles.grid}>
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className={styles.skeletonCard} />
          ))}
        </div>
      )}

      {!loading && !error && items.length === 0 && (
        <div className={styles.emptyState}>
          <p>No properties found matching your criteria.</p>
        </div>
      )}

      {!loading && items.length > 0 && (
        <div className={styles.grid}>
          {items.map((listing) => (
            <div key={listing.listing_id} className={styles.cardWrapper}>
              <PropertyCardV1 listing={listing} />

              <div className={styles.cardActionsContainer}>
                <div className={styles.listerRow}>
                  <span className={styles.listerName}>
                    {listing.lister.username}
                  </span>
                  <span
                    className={`${styles.statusPill} ${
                      listing.payment_status === "paid"
                        ? styles.statusActive
                        : styles.statusPending
                    }`}>
                    {listing.payment_status === "paid" ? "Active" : "Pending"}
                  </span>
                </div>
                <button
                  className={styles.actionsDropdownBtn}
                  onClick={() =>
                    alert(`Options for listing ${listing.listing_id}`)
                  }>
                  Actions
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && totalPages > 1 && (
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
    </div>
  );
}
