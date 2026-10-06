"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { useQueryClient } from "@tanstack/react-query";
import FilterSidebar from "./components/FilterSidebar";
import PropertyCardV1 from "./components/PropertyCardV1";
import styles from "./css/properties.module.css";
import ReviewPrompt from "./components/ReviewPrompt";
import { useTrackVisit } from "@/app/hooks/useTrackVisit";
import { useRealtimeChannel } from "@/lib/hooks/useRealtimeChannel";
import SearchBar from "./components/SearchBar";
import { useUser } from "@clerk/nextjs";
import { prefetchContacts } from "@/lib/contact/fetchContact";

const PAGE_SIZE = 20;

const LEGACY_CATEGORY_NAMES = {
  1: "Rentals",
  2: "Airbnbs",
  3: "Commercial Apartments",
  4: "Lodgings",
  5: "Private Houses and Homes",
  7: "Penthouses",
};

const LEGACY_RENT_DURATION = {
  "short-term": "Short Term",
  "long-term": "Long Term",
};

const LEGACY_FURNISHING = {
  furnished: "Furnished",
  unfurnished: "Unfurnished",
};

function filtersFromParams(params) {
  const rentDuration = params.get("rent_duration") || null;
  const furnishing =
    params.get("furnishing") || params.get("property_interior") || null;

  const hasCategoryParam = params.has("category") || params.has("category_id");

  const categoryParam = params.get("category");
  const legacyCategory =
    LEGACY_CATEGORY_NAMES[Number(params.get("category_id"))];

  const category =
    categoryParam === "all"
      ? null
      : categoryParam ||
        legacyCategory ||
        (hasCategoryParam ? null : "Rentals");

  return {
    ward_id: params.get("ward_id") ? Number(params.get("ward_id")) : null,
    category,
    types: params.getAll("types").filter(Boolean),
    price_range: params.get("price_range") || null,
    rent_duration: LEGACY_RENT_DURATION[rentDuration] ?? rentDuration,
    furnishing: LEGACY_FURNISHING[furnishing] ?? furnishing,
  };
}

function filtersToParams(filters, page) {
  const params = new URLSearchParams();

  if (filters.ward_id) params.set("ward_id", filters.ward_id);
  params.set("category", filters.category || "all");
  filters.types?.forEach((type) => params.append("types", type));
  if (filters.price_range) params.set("price_range", filters.price_range);
  if (filters.rent_duration) {
    params.set("rent_duration", filters.rent_duration);
  }
  if (filters.furnishing) params.set("furnishing", filters.furnishing);
  if (page > 1) params.set("page", page);

  return params;
}

async function fetchListings(filters, bufferPage) {
  const params = filtersToParams(filters, bufferPage);
  params.set("prefetch", "true");
  const res = await fetch(`/api/v1/listings/public?${params.toString()}`);
  if (!res.ok) throw new Error("Failed to fetch listings");
  return res.json();
}

export default function PropertiesClient() {
  useTrackVisit();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [filters, setFilters] = useState(() => filtersFromParams(searchParams));
  const [currentPage, setCurrentPage] = useState(() =>
    Number(searchParams.get("page") ?? 1),
  );
  const [wardPopup, setWardPopup] = useState(null);
  const [searchLabel, setSearchLabel] = useState(null);
  const [searchResults, setSearchResults] = useState(null);
  const [searchBarKey, setSearchBarKey] = useState(0);

  const BUFFER_SIZE = 2; // pages per buffer block

  // which 40-block we're in (pages 1-2 = buffer 1, pages 3-4 = buffer 2, etc.)
  const bufferPage = Math.ceil(currentPage / BUFFER_SIZE);

  // position within the buffer (0 or 1)
  const indexInBuffer = (currentPage - 1) % BUFFER_SIZE;

  const { data, isLoading, error, isFetching, failureCount } = useQuery({
    queryKey: ["listings", filters, bufferPage],
    queryFn: () => fetchListings(filters, bufferPage),
    placeholderData: keepPreviousData,
  });

  const queryClient = useQueryClient();
  const { isLoaded, isSignedIn } = useUser();

  useRealtimeChannel("listings:feed", (eventName) => {
    if (eventName.startsWith("listing.")) {
      queryClient.invalidateQueries({ queryKey: ["listings"] });
    }
  });

  const allData = data?.data ?? [];
  const pagination = data?.pagination ?? null;
  const totalPages = pagination?.total_pages ?? 1;

  const listings = allData.slice(
    indexInBuffer * PAGE_SIZE,
    indexInBuffer * PAGE_SIZE + PAGE_SIZE,
  );

  const displayListings = searchResults !== null ? searchResults : listings;
  const isSearchActive = searchResults !== null;
  const listingIdsKey = displayListings.map((l) => l.listing_id).join(",");

  const prefetchedRef = useRef("");
  const prefetchKey = `${isSignedIn ? "in" : "out"}:${listingIdsKey}`;
  if (
    isLoaded &&
    isSignedIn &&
    listingIdsKey &&
    prefetchedRef.current !== prefetchKey
  ) {
    prefetchContacts(listingIdsKey.split(",").map(Number));
  }

   const hasActiveFilters = Boolean(
     filters.ward_id ||
     filters.category ||
     filters.types?.length ||
     filters.price_range ||
     filters.rent_duration ||
     filters.furnishing,
   );

  const emptyStateKind =
    isSearchActive && hasActiveFilters
      ? "search-and-filters"
      : isSearchActive
        ? "search"
        : hasActiveFilters
          ? "filters"
          : "none";

  const emptyStateCopy = {
    "search-and-filters": {
      title: "Let’s widen the search",
      message:
        "We couldn’t find a match for your search with these filters. Remove a filter or start a new search.",
    },
    search: {
      title: "Let’s widen the search",
      message:
        "We couldn’t find a match this time. Try a different search or start a new one.",
    },
    filters: {
      title: "Let’s widen the search",
      message:
        "We couldn’t find a match with these filters. Remove a filter to explore more homes.",
    },
    none: {
      title: "No homes available right now",
      message: "New listings are added regularly. Please check back soon.",
    },
  };

  // sync URL
  const syncUrl = (f, p) => {
    const params = filtersToParams(f, p);
    const qs = params.toString();
    router.replace(qs ? `?${qs}` : "?", { scroll: false });
  };

  // One-time rewrite of legacy URL params to the name-based contract.
  useEffect(() => {
    if (
      searchParams.has("category_id") ||
      searchParams.has("type_ids") ||
      searchParams.has("property_interior")
    ) {
      syncUrl(filters, currentPage);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleFilterChange = (updated) => {
    setFilters(updated);
    setCurrentPage(1);
    syncUrl(updated, 1);
  };

  const handlePageChange = (page) => {
    setCurrentPage(page);
    syncUrl(filters, page);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleClearFilters = () => {
    const resetFilters = {
      ward_id: null,
      category: null,
      types: [],
      price_range: null,
      rent_duration: null,
      furnishing: null,
    };

    setFilters(resetFilters);
    setCurrentPage(1);
    syncUrl(resetFilters, 1);
  };

  const handleStartNewSearch = () => {
    setSearchResults(null);
    setSearchLabel(null);
    setSearchBarKey((key) => key + 1);
  };

  const handleSearchResults = (results, label) => {
    setSearchResults(results);
    setSearchLabel(label);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSearchClear = () => {
    setSearchResults(null);
    setSearchLabel(null);
  };

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

  return (
    <>
      <ReviewPrompt />
      <div className={styles.pageLayout}>
        <FilterSidebar
          onFilterChange={handleFilterChange}
          initialFilters={filters}
        />

        <main className={styles.mainContent}>
          <SearchBar
            key={searchBarKey}
            allData={allData}
            onSearchResults={handleSearchResults}
            onClear={handleSearchClear}
          />
          {searchLabel && <p className={styles.searchLabel}>{searchLabel}</p>}

          {/*
          <div className={styles.resultsHeader}>
            {!isLoading && pagination && (
              <p className={styles.resultsCount}>
                {pagination.total_records} properties found
              </p>
            )}
          </div>
          */}
          {isFetching && failureCount > 0 && (
            <div className={styles.retryState}>
              <span className={styles.retrySpinner} />
              Retrying... (attempt {failureCount + 1})
            </div>
          )}

          {error && (
            <div className={styles.errorState}>
              Failed to load listings — {error.message}
            </div>
          )}

          {isLoading && (
            <div className={styles.grid}>
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className={styles.skeleton} />
              ))}
            </div>
          )}

          {!isLoading && !error && displayListings.length === 0 && (
            <section className={styles.emptyState}>
              <div className={styles.emptyIllustration} aria-hidden="true">
                <svg viewBox="0 0 180 110" fill="none">
                  <path
                    d="M20 92h140M32 92V59l23-19 23 19v33M42 70h12v12H42zM64 70h8v22h-8"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M105 92V58l21-18 22 18v34M115 70h12v12h-12z"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinejoin="round"
                  />
                  <circle
                    cx="91"
                    cy="43"
                    r="19"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    d="m105 57 17 17"
                    stroke="currentColor"
                    strokeWidth="5"
                    strokeLinecap="round"
                  />
                  <path
                    d="M25 94h130"
                    stroke="#39bf84"
                    strokeWidth="3"
                    strokeLinecap="round"
                  />
                </svg>
              </div>

              <h2>{emptyStateCopy[emptyStateKind].title}</h2>
              <p>{emptyStateCopy[emptyStateKind].message}</p>

              {emptyStateKind !== "none" && (
                <div className={styles.emptyActions}>
                  {hasActiveFilters && (
                    <button
                      type="button"
                      className={styles.emptyPrimary}
                      onClick={handleClearFilters}>
                      Remove filters
                    </button>
                  )}

                  {isSearchActive && (
                    <button
                      type="button"
                      className={
                        hasActiveFilters
                          ? styles.emptySecondary
                          : styles.emptyPrimary
                      }
                      onClick={handleStartNewSearch}>
                      Start a new search
                    </button>
                  )}

                  {!hasActiveFilters && !isSearchActive && null}
                </div>
              )}
            </section>
          )}

          {!isLoading && displayListings.length > 0 && (
            <div
              className={styles.grid}
              style={{
                opacity: isFetching ? 0.8 : 1,
                transition: "opacity 0.15s",
              }}>
              {displayListings.map((listing) => (
                <PropertyCardV1
                  key={listing.listing_id}
                  listing={listing}
                  onWardClick={(ward_id, ward_name, property_location) =>
                    setWardPopup({ ward_id, ward_name, property_location })
                  }
                />
              ))}
            </div>
          )}

          {!isLoading && !isSearchActive && totalPages > 1 && (
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
                    ........
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
        </main>

        {wardPopup && (
          <div
            className={styles.wardOverlay}
            onClick={() => setWardPopup(null)}>
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
      </div>
    </>
  );
}
