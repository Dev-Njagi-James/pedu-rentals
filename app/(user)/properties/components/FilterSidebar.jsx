"use client";
import { useState, useEffect, useCallback } from "react";
import styles from "../css/FilterSidebar.module.css";
import WardCombobox from "./WardCombobox";

const PRICE_RANGES = [
  { label: "Below 2,000", value: "below_2000" },
  { label: "2,000 – 4,999", value: "2000_4000" },
  { label: "5,000 – 8,999", value: "5000_8000" },
  { label: "9,000 – 12,999", value: "9000_12000" },
  { label: "13,000 – 19,999", value: "13000_20000" },
  { label: "20,000 and above", value: "above_20000" },
];

const RENT_DURATIONS = [
  { label: "Short-term", value: "Short Term" },
  { label: "Long-term", value: "Long Term" },
];

const FURNISHING = [
  { label: "Furnished", value: "Furnished" },
  { label: "Un-Furnished", value: "Unfurnished" },
];

const MAIN_CATEGORY_NAMES = ["Rentals", "Airbnbs", "Lodgings"];

const CATEGORY_ORDER = {
  Rentals: 0,
  Airbnbs: 1,
  Lodgings: 2,
  "Commercial Apartments": 3,
  "Private Houses and Homes": 4,
  Penthouses: 5,
};

export default function FilterSidebar({ onFilterChange, initialFilters }) {
  const [filterData, setFilterData] = useState({ wards: [], categories: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [collapsed, setCollapsed] = useState(false);

  const [isOpen, setIsOpen] = useState(false);
  const [expandedSections, setExpandedSections] = useState({
    ward: true,
    category: true,
    type: true,
    price: true,
    duration: true,
    furnishing: true,
  });

  const [filters, setFilters] = useState({
    ward_id: initialFilters?.ward_id ?? null,
    category: initialFilters?.category ?? null,
    types: initialFilters?.types ?? [],
    price_range: initialFilters?.price_range ?? null,
    rent_duration: initialFilters?.rent_duration ?? null,
    furnishing: initialFilters?.furnishing ?? null,
  });

  useEffect(() => {
    async function fetchFilters() {
      try {
        const res = await fetch("/api/v1/listings/filters");
        if (!res.ok) throw new Error("Failed to load filters");
        const data = await res.json();
        data.categories = [...data.categories].sort(
          (a, b) =>
            (CATEGORY_ORDER[a.category_name] ?? 99) -
            (CATEGORY_ORDER[b.category_name] ?? 99),
        );
        setFilterData(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchFilters();
  }, []);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  const toggleSection = (key) => {
    setExpandedSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSingleSelect = (key, value) => {
    const updated = {
      ...filters,
      [key]: filters[key] === value ? null : value,
    };
    setFilters(updated);
    onFilterChange?.(updated);
  };

  const handleTypeToggle = (typeName) => {
    const exists = filters.types.includes(typeName);
    const updated = {
      ...filters,
      types: exists
        ? filters.types.filter((t) => t !== typeName)
        : [...filters.types, typeName],
    };
    setFilters(updated);
    onFilterChange?.(updated);
  };

  const handleCategoryChange = (name) => {
    const updated = { ...filters, category: name, types: [] };
    setFilters(updated);
    onFilterChange?.(updated);
  };

  const clearAll = () => {
    const reset = {
      ward_id: null,
      category: null,
      types: [],
      price_range: null,
      rent_duration: null,
      furnishing: null,
    };
    setFilters(reset);
    onFilterChange?.(reset);
  };
   
   useEffect(() => {
     setFilters({
       ward_id: initialFilters?.ward_id ?? null,
       category: initialFilters?.category ?? null,
       types: initialFilters?.types ?? [],
       price_range: initialFilters?.price_range ?? null,
       rent_duration: initialFilters?.rent_duration ?? null,
       furnishing: initialFilters?.furnishing ?? null,
     });
   }, [initialFilters]);

   
  const activeFilterCount = [
    filters.ward_id,
    filters.category,
    filters.types.length > 0,
    filters.price_range,
    filters.rent_duration,
    filters.furnishing,
  ].filter(Boolean).length;

  const visibleCategories = filters.category
    ? filterData.categories.filter((c) => c.category_name === filters.category)
    : filterData.categories;

  const badgeCategories = filters.category
    ? filterData.categories.filter((c) => c.category_name !== filters.category)
    : filterData.categories.filter((c) =>
        MAIN_CATEGORY_NAMES.includes(c.category_name),
      );

  const SidebarContent = () => (
    <div className={styles.sidebarInner}>
      <div className={styles.sidebarHeader}>
        <span className={styles.sidebarTitle}>Filters</span>
        {activeFilterCount > 0 && (
          <button className={styles.clearBtn} onClick={clearAll}>
            Clear all ({activeFilterCount})
          </button>
        )}
      </div>

      {loading && <div className={styles.loadingState}>Loading filters...</div>}
      {error && <div className={styles.errorState}>Failed to load filters</div>}

      {!loading && !error && (
        <>
          {/* Ward */}
          <div className={styles.section}>
            <button
              className={styles.sectionToggle}
              onClick={() => toggleSection("ward")}>
              <span>Locations</span>
              <span
                className={`${styles.chevron} ${expandedSections.ward ? styles.chevronUp : ""}`}>
                &#8249;
              </span>
            </button>
            {expandedSections.ward && (
              <div className={styles.sectionBody}>
                <WardCombobox
                  wards={filterData.wards}
                  selectedWardId={filters.ward_id}
                  onSelect={(wardId) => handleSingleSelect("ward_id", wardId)}
                />
              </div>
            )}
          </div>

          {/* Property Category */}
          <div className={styles.section}>
            <button
              className={styles.sectionToggle}
              onClick={() => toggleSection("category")}>
              <span>Property Category</span>
              <span
                className={`${styles.chevron} ${expandedSections.category ? styles.chevronUp : ""}`}>
                &#8249;
              </span>
            </button>
            {expandedSections.category && (
              <div className={styles.sectionBody}>
                <select
                  className={styles.selectInput}
                  value={filters.category ?? ""}
                  onChange={(e) =>
                    handleCategoryChange(e.target.value || null)
                  }>
                  <option value="">All Categories</option>
                  {filterData.categories.map((c) => (
                    <option key={c.category_name} value={c.category_name}>
                      {c.category_name}
                    </option>
                  ))}
                </select>
                {badgeCategories.length > 0 && (
                  <div className={styles.badgeRow}>
                    {badgeCategories.map((c) => (
                      <button
                        key={c.category_name}
                        type="button"
                        className={styles.badge}
                        onClick={() => handleCategoryChange(c.category_name)}>
                        {c.category_name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Property Type */}
          <div className={styles.section}>
            <button
              className={styles.sectionToggle}
              onClick={() => toggleSection("type")}>
              <span>Property Type</span>
              <span
                className={`${styles.chevron} ${expandedSections.type ? styles.chevronUp : ""}`}>
                &#8249;
              </span>
            </button>
            {expandedSections.type && (
              <div className={styles.sectionBody}>
                {visibleCategories.length === 0 && (
                  <p className={styles.emptyNote}>Select a category first</p>
                )}
                {visibleCategories.map((cat) => (
                  <div key={cat.category_name} className={styles.typeGroup}>
                    {!filters.category && (
                      <span className={styles.typeGroupLabel}>
                        {cat.category_name}
                      </span>
                    )}
                    {cat.types.map((type) => (
                      <label
                        key={type.category_type_name}
                        className={styles.checkLabel}>
                        <input
                          type="checkbox"
                          className={styles.checkbox}
                          checked={filters.types.includes(
                            type.category_type_name,
                          )}
                          onChange={() =>
                            handleTypeToggle(type.category_type_name)
                          }
                        />
                        <span className={styles.checkText}>
                          {type.category_type_name.trim()}
                        </span>
                      </label>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Price Range */}
          <div className={styles.section}>
            <button
              className={styles.sectionToggle}
              onClick={() => toggleSection("price")}>
              <span>Price Range</span>
              <span
                className={`${styles.chevron} ${expandedSections.price ? styles.chevronUp : ""}`}>
                &#8249;
              </span>
            </button>
            {expandedSections.price && (
              <div className={styles.sectionBody}>
                {PRICE_RANGES.map((p) => (
                  <label key={p.value} className={styles.checkLabel}>
                    <input
                      type="checkbox"
                      className={styles.checkbox}
                      checked={filters.price_range === p.value}
                      onChange={() =>
                        handleSingleSelect("price_range", p.value)
                      }
                    />
                    <span className={styles.checkText}>KSH {p.label}</span>
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* Renting Duration */}
          <div className={styles.section}>
            <button
              className={styles.sectionToggle}
              onClick={() => toggleSection("duration")}>
              <span>Renting Duration</span>
              <span
                className={`${styles.chevron} ${expandedSections.duration ? styles.chevronUp : ""}`}>
                &#8249;
              </span>
            </button>
            {expandedSections.duration && (
              <div className={styles.sectionBody}>
                {RENT_DURATIONS.map((d) => (
                  <label key={d.value} className={styles.checkLabel}>
                    <input
                      type="checkbox"
                      className={styles.checkbox}
                      checked={filters.rent_duration === d.value}
                      onChange={() =>
                        handleSingleSelect("rent_duration", d.value)
                      }
                    />
                    <span className={styles.checkText}>{d.label}</span>
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* Furnishing */}
          <div className={styles.section}>
            <button
              className={styles.sectionToggle}
              onClick={() => toggleSection("furnishing")}>
              <span>Furnishing</span>
              <span
                className={`${styles.chevron} ${expandedSections.furnishing ? styles.chevronUp : ""}`}>
                &#8249;
              </span>
            </button>
            {expandedSections.furnishing && (
              <div className={styles.sectionBody}>
                {FURNISHING.map((f) => (
                  <label key={f.value} className={styles.checkLabel}>
                    <input
                      type="checkbox"
                      className={styles.checkbox}
                      checked={filters.furnishing === f.value}
                      onChange={() => handleSingleSelect("furnishing", f.value)}
                    />
                    <span className={styles.checkText}>{f.label}</span>
                  </label>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside
        className={`${styles.sidebar} ${collapsed ? styles.sidebarCollapsed : ""}`}>
        <button
          className={styles.collapseBtn}
          onClick={() => setCollapsed((prev) => !prev)}
          aria-label={collapsed ? "Expand filters" : "Collapse filters"}
          style={{
            margin: collapsed ? "16px auto" : "16px 0 0 auto",
            display: "flex",
          }}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path
              d={collapsed ? "M5 2l5 5-5 5" : "M9 2L4 7l5 5"}
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
        {!collapsed && <SidebarContent />}
      </aside>

      {/* Mobile trigger button */}
      <button
        className={styles.mobileToggle}
        onClick={() => setIsOpen(true)}
        aria-label="Open filters">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path
            d="M2 4h12M4 8h8M6 12h4"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
        Filters
        {activeFilterCount > 0 && (
          <span className={styles.mobileBadge}>{activeFilterCount}</span>
        )}
      </button>

      {/* Mobile drawer overlay */}
      {isOpen && (
        <div
          className={styles.overlay}
          onClick={() => setIsOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Mobile drawer */}
      <div className={`${styles.drawer} ${isOpen ? styles.drawerOpen : ""}`}>
        <div className={styles.drawerHandle} />
        <div className={styles.drawerHeader}>
          <span className={styles.sidebarTitle}>Filters</span>
          <button
            className={styles.drawerClose}
            onClick={() => setIsOpen(false)}
            aria-label="Close filters">
            &#x2715;
          </button>
        </div>
        <div className={styles.drawerScroll}>
          <SidebarContent />
        </div>
        <div className={styles.drawerFooter}>
          <button className={styles.applyBtn} onClick={() => setIsOpen(false)}>
            Apply Filters
            {activeFilterCount > 0 ? ` (${activeFilterCount})` : ""}
          </button>
        </div>
      </div>
    </>
  );
}
