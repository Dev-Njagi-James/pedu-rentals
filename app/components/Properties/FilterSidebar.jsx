'use client';

import { useState, useEffect, useCallback } from 'react';
import styles from '../css/Properties/FilterSidebar.module.css';

const PRICE_RANGES = [
   { label: '2,000 and below', value: 'below_2000' },
   { label: '2,000 – 4,000', value: '2000_4000' },
   { label: '5,000 – 8,000', value: '5000_8000' },
   { label: '9,000 – 12,000', value: '9000_12000' },
   { label: '13,000 – 20,000', value: '13000_20000' },
   { label: '20,000 and above', value: 'above_20000' },
];

const RENT_DURATIONS = [
   { label: 'Short-term', value: 'short-term' },
   { label: 'Long-term', value: 'long-term' },
];

const FURNISHING = [
   { label: 'Furnished', value: 'furnished' },
   { label: 'Un-Furnished', value: 'unfurnished' },
];

export default function FilterSidebar({ onFilterChange, initialFilters }) {
   const [ filterData, setFilterData ] = useState({ wards: [], categories: [] });
   const [ loading, setLoading ] = useState(true);
   const [ error, setError ] = useState(null);
   const [ collapsed, setCollapsed ] = useState(false);

   const [ isOpen, setIsOpen ] = useState(false);
   const [ expandedSections, setExpandedSections ] = useState({
      ward: true,
      category: true,
      type: true,
      price: true,
      duration: true,
      furnishing: true,
   });

   const [ filters, setFilters ] = useState({
      ward_id: initialFilters?.ward_id ?? null,
      category_id: initialFilters?.category_id ?? null,
      type_ids: initialFilters?.type_ids ?? [],
      price_range: initialFilters?.price_range ?? null,
      rent_duration: initialFilters?.rent_duration ?? null,
      property_interior: initialFilters?.property_interior ?? null,
   })

   const CATEGORY_ORDER = { 1: 0, 2: 1, 4: 2, 3: 3, 5: 4 }

   useEffect(() => {
      async function fetchFilters() {
         try {
            const res = await fetch('/api/filters');
            if (!res.ok) throw new Error('Failed to load filters');
            const data = await res.json();
            data.categories = [ ...data.categories ].sort(
               (a, b) => (CATEGORY_ORDER[ a.category_id ] ?? 99) - (CATEGORY_ORDER[ b.category_id ] ?? 99)
            )
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
         document.body.style.overflow = 'hidden';
      } else {
         document.body.style.overflow = '';
      }
      return () => { document.body.style.overflow = ''; };
   }, [ isOpen ]);

   const toggleSection = (key) => {
      setExpandedSections(prev => ({ ...prev, [ key ]: !prev[ key ] }));
   };

   const handleSingleSelect = (key, value) => {
      const updated = { ...filters, [ key ]: filters[ key ] === value ? null : value };
      setFilters(updated);
      onFilterChange?.(updated);
   };

   const handleTypeToggle = (type_id) => {
      const exists = filters.type_ids.includes(type_id);
      const updated = {
         ...filters,
         type_ids: exists
            ? filters.type_ids.filter(id => id !== type_id)
            : [ ...filters.type_ids, type_id ],
      };
      setFilters(updated);
      onFilterChange?.(updated);
   };

   const clearAll = () => {
      const reset = {
         ward_id: null,
         category_id: null,
         type_ids: [],
         price_range: null,
         rent_duration: null,
         property_interior: null,
      };
      setFilters(reset);
      onFilterChange?.(reset);
   };

   const activeFilterCount = [
      filters.ward_id,
      filters.category_id,
      filters.type_ids.length > 0,
      filters.price_range,
      filters.rent_duration,
      filters.property_interior,
   ].filter(Boolean).length;

   const visibleCategories = filters.category_id
      ? filterData.categories.filter(c => c.category_id === filters.category_id)
      : filterData.categories;

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
                     onClick={() => toggleSection('ward')}
                  >
                     <span>Ward</span>
                     <span className={`${styles.chevron} ${expandedSections.ward ? styles.chevronUp : ''}`}>
                        &#8249;
                     </span>
                  </button>
                  {expandedSections.ward && (
                     <div className={styles.sectionBody}>
                        <select
                           className={styles.selectInput}
                           value={filters.ward_id ?? ''}
                           onChange={e => handleSingleSelect('ward_id', e.target.value ? Number(e.target.value) : null)}
                        >
                           <option value="">All Wards</option>
                           {filterData.wards.map(w => (
                              <option key={w.ward_id} value={w.ward_id}>{w.ward_name}</option>
                           ))}
                        </select>
                     </div>
                  )}
               </div>

               {/* Property Category */}
               <div className={styles.section}>
                  <button
                     className={styles.sectionToggle}
                     onClick={() => toggleSection('category')}
                  >
                     <span>Property Category</span>
                     <span className={`${styles.chevron} ${expandedSections.category ? styles.chevronUp : ''}`}>
                        &#8249;
                     </span>
                  </button>
                  {expandedSections.category && (
                     <div className={styles.sectionBody}>
                        <select
                           className={styles.selectInput}
                           value={filters.category_id ?? ''}
                           onChange={e => {
                              const val = e.target.value ? Number(e.target.value) : null;
                              const updated = { ...filters, category_id: val, type_ids: [] };
                              setFilters(updated);
                              onFilterChange?.(updated);
                           }}
                        >
                           <option value="">All Categories</option>
                           {filterData.categories.map(c => (
                              <option key={c.category_id} value={c.category_id}>{c.category_name}</option>
                           ))}
                        </select>
                     </div>
                  )}
               </div>

               {/* Property Type */}
               <div className={styles.section}>
                  <button
                     className={styles.sectionToggle}
                     onClick={() => toggleSection('type')}
                  >
                     <span>Property Type</span>
                     <span className={`${styles.chevron} ${expandedSections.type ? styles.chevronUp : ''}`}>
                        &#8249;
                     </span>
                  </button>
                  {expandedSections.type && (
                     <div className={styles.sectionBody}>
                        {visibleCategories.length === 0 && (
                           <p className={styles.emptyNote}>Select a category first</p>
                        )}
                        {visibleCategories.map(cat => (
                           <div key={cat.category_id} className={styles.typeGroup}>
                              {!filters.category_id && (
                                 <span className={styles.typeGroupLabel}>{cat.category_name}</span>
                              )}
                              {cat.types.map(type => (
                                 <label key={type.type_id} className={styles.checkLabel}>
                                    <input
                                       type="checkbox"
                                       className={styles.checkbox}
                                       checked={filters.type_ids.includes(type.type_id)}
                                       onChange={() => handleTypeToggle(type.type_id)}
                                    />
                                    <span className={styles.checkText}>{type.type_name}</span>
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
                     onClick={() => toggleSection('price')}
                  >
                     <span>Price Range</span>
                     <span className={`${styles.chevron} ${expandedSections.price ? styles.chevronUp : ''}`}>
                        &#8249;
                     </span>
                  </button>
                  {expandedSections.price && (
                     <div className={styles.sectionBody}>
                        {PRICE_RANGES.map(p => (
                           <label key={p.value} className={styles.checkLabel}>
                              <input
                                 type="checkbox"
                                 className={styles.checkbox}
                                 checked={filters.price_range === p.value}
                                 onChange={() => handleSingleSelect('price_range', p.value)}
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
                     onClick={() => toggleSection('duration')}
                  >
                     <span>Renting Duration</span>
                     <span className={`${styles.chevron} ${expandedSections.duration ? styles.chevronUp : ''}`}>
                        &#8249;
                     </span>
                  </button>
                  {expandedSections.duration && (
                     <div className={styles.sectionBody}>
                        {RENT_DURATIONS.map(d => (
                           <label key={d.value} className={styles.checkLabel}>
                              <input
                                 type="checkbox"
                                 className={styles.checkbox}
                                 checked={filters.rent_duration === d.value}
                                 onChange={() => handleSingleSelect('rent_duration', d.value)}
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
                     onClick={() => toggleSection('furnishing')}
                  >
                     <span>Furnishing</span>
                     <span className={`${styles.chevron} ${expandedSections.furnishing ? styles.chevronUp : ''}`}>
                        &#8249;
                     </span>
                  </button>
                  {expandedSections.furnishing && (
                     <div className={styles.sectionBody}>
                        {FURNISHING.map(f => (
                           <label key={f.value} className={styles.checkLabel}>
                              <input
                                 type="checkbox"
                                 className={styles.checkbox}
                                 checked={filters.property_interior === f.value}
                                 onChange={() => handleSingleSelect('property_interior', f.value)}
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
         <aside className={`${styles.sidebar} ${collapsed ? styles.sidebarCollapsed : ''}`}>
            <button
               className={styles.collapseBtn}
               onClick={() => setCollapsed(prev => !prev)}
               aria-label={collapsed ? 'Expand filters' : 'Collapse filters'}
               style={{ margin: collapsed ? '16px auto' : '16px 0 0 auto', display: 'flex' }}
            >
               <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path
                     d={collapsed ? 'M5 2l5 5-5 5' : 'M9 2L4 7l5 5'}
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
            aria-label="Open filters"
         >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
               <path d="M2 4h12M4 8h8M6 12h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
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
         <div className={`${styles.drawer} ${isOpen ? styles.drawerOpen : ''}`}>
            <div className={styles.drawerHandle} />
            <div className={styles.drawerHeader}>
               <span className={styles.sidebarTitle}>Filters</span>
               <button
                  className={styles.drawerClose}
                  onClick={() => setIsOpen(false)}
                  aria-label="Close filters"
               >
                  &#x2715;
               </button>
            </div>
            <div className={styles.drawerScroll}>
               <SidebarContent />
            </div>
            <div className={styles.drawerFooter}>
               <button className={styles.applyBtn} onClick={() => setIsOpen(false)}>
                  Apply Filters{activeFilterCount > 0 ? ` (${activeFilterCount})` : ''}
               </button>
            </div>
         </div>
      </>
   );
}