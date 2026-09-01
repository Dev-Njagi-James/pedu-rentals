'use client';

import { useEffect, useMemo, useState } from 'react';
import styles from '../css/PricingTable.module.css';

const CACHE_KEY = 'owl-nest:plan-category-pricing:v1';
const CACHE_TTL = 24 * 60 * 60 * 1000;
const PLAN_ORDER = ['Regular', 'Premium', 'Enterprise'];

// Prevents duplicate requests when several components mount in the same page.
let memoryCache = null;
let memoryRequest = null;

function isFresh(timestamp) {
  return Number.isFinite(timestamp) && Date.now() - timestamp < CACHE_TTL;
}

function readBrowserCache() {
  if (typeof window === 'undefined') return null;

  try {
    const stored = window.localStorage.getItem(CACHE_KEY);
    if (!stored) return null;

    const parsed = JSON.parse(stored);
    if (!isFresh(parsed.timestamp) || !Array.isArray(parsed.data)) {
      window.localStorage.removeItem(CACHE_KEY);
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

function saveBrowserCache(data, timestamp) {
  if (typeof window === 'undefined') return;

  try {
    window.localStorage.setItem(
      CACHE_KEY,
      JSON.stringify({ data, timestamp })
    );
  } catch {
    // Continue normally if browser storage is unavailable or full.
  }
}

async function fetchPricingOnce() {
  const response = await fetch('/api/v1/plans/pricing', {
    credentials: 'include',
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error('Failed to load pricing.');
  }

  const json = await response.json();
  const rows = Array.isArray(json) ? json : json.pricing;

  if (!Array.isArray(rows)) {
    throw new Error('Pricing response has an invalid format.');
  }

  const timestamp = Date.now();
  memoryCache = { data: rows, timestamp };
  saveBrowserCache(rows, timestamp);

  return rows;
}

function getPricing() {
  if (memoryCache && isFresh(memoryCache.timestamp)) {
    return Promise.resolve(memoryCache.data);
  }

  const browserCache = readBrowserCache();
  if (browserCache) {
    memoryCache = browserCache;
    return Promise.resolve(browserCache.data);
  }

  // Share one in-flight request between simultaneous component mounts.
  if (!memoryRequest) {
    memoryRequest = fetchPricingOnce().finally(() => {
      memoryRequest = null;
    });
  }

  return memoryRequest;
}

const formatPrice = (price) => `KES ${Number(price ?? 0).toLocaleString('en-KE')}`;

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="11" cy="11" r="6.5" />
      <path d="m16 16 4.5 4.5" />
    </svg>
  );
}

function FilterIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 6h16M7 12h10M10 18h4" />
    </svg>
  );
}

function ChevronIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

export default function PricingTable() {
  const [pricing, setPricing] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All Categories');

  useEffect(() => {
    let cancelled = false;

    getPricing()
      .then((rows) => {
        if (!cancelled) {
          setPricing(rows);
          setError('');
        }
      })
      .catch((requestError) => {
        if (!cancelled) {
          setError(requestError.message || 'Failed to load pricing.');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const categories = useMemo(() => {
    return [...new Set(pricing.map((item) => item.category_name))].sort();
  }, [pricing]);

  const visibleCategories = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return categories.filter((item) => {
      const matchesCategory =
        category === 'All Categories' || item === category;
      const matchesSearch = item.toLowerCase().includes(normalizedSearch);
      return matchesCategory && matchesSearch;
    });
  }, [categories, category, search]);

  const priceFor = (categoryName, planName) => {
    const match = pricing.find(
      (item) =>
        item.category_name === categoryName && item.plan_name === planName
    );

    return match ? formatPrice(match.price_kes) : '—';
  };

  return (
    <section className={styles.root} aria-labelledby="pricing-table-title">
      <div className={styles.heading}>
        <h2 id="pricing-table-title" className={styles.title}>
          Pricing Viewing Table
        </h2>
        <p className={styles.subtitle}>
          View Listing Category pricing from a glance
        </p>
      </div>

      <div className={styles.filters}>
        <label className={styles.searchField}>
          <SearchIcon />
          <span className={styles.srOnly}>Search categories</span>
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search categories..."
          />
        </label>

        <label className={styles.selectField}>
          <FilterIcon />
          <span className={styles.srOnly}>Filter by category</span>
          <select
            value={category}
            onChange={(event) => setCategory(event.target.value)}
          >
            <option>All Categories</option>
            {categories.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
          <ChevronIcon />
        </label>
      </div>

      <div className={styles.tableShell}>
        {loading ? (
          <p className={styles.loadingState}>Loading pricing...</p>
        ) : error ? (
          <p className={styles.errorState}>{error}</p>
        ) : (
          <div className={styles.tableScroll}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th scope="col">Category</th>
                  {PLAN_ORDER.map((plan) => (
                    <th
                      key={plan}
                      scope="col"
                      className={styles[plan.toLowerCase()]}
                    >
                      {plan}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {visibleCategories.length > 0 ? (
                  visibleCategories.map((item) => (
                    <tr key={item}>
                      <th scope="row">{item}</th>
                      {PLAN_ORDER.map((plan) => (
                        <td
                          key={plan}
                          className={styles[plan.toLowerCase()]}
                        >
                          {priceFor(item, plan)}
                        </td>
                      ))}
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td className={styles.emptyState} colSpan={4}>
                      No categories match your search.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <p className={styles.note}>
        <span aria-hidden="true">ⓘ</span>
        Prices are displayed in Kenyan Shillings (KES)
      </p>
    </section>
  );
}
