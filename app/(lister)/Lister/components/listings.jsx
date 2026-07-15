'use client';

import { useState, useEffect, useCallback } from 'react';
import PropertyCard from '@/app/(user)/properties/components/PropertyCard';
import styles from '../css/MyListing.module.css';
import AddSlotCard from './AddslotCard';
import WelcomeBanner from './WelcomeMessage';
import AddListing from './AddListing';
import ListingSummary from './ListingsSummary'
import { EDIT_WINDOW_DAYS } from '@/lib/constants';
import TopPerformer from './TopPerfomer'
import { createBrowserSupabaseClient } from '@/lib/supabase/client';
const supabase = createBrowserSupabaseClient();

const PAGE_SIZE = 20;

export default function MyListings({ slotData, onSlotAdded }) {
   const [ listings, setListings ] = useState([]);
   const [ pagination, setPagination ] = useState(null);
   const [ currentPage, setCurrentPage ] = useState(1);
   const [ loading, setLoading ] = useState(true);
   const [ error, setError ] = useState(null);
   const [ deletingId, setDeletingId ] = useState(null);
   const [ deleteError, setDeleteError ] = useState(null);
   const [ confirmId, setConfirmId ] = useState(null);
   const [ editingListing, setEditingListing ] = useState(null);
   const [ userInfo, setUserInfo ] = useState({ username: '', isNew: false, orgImage: null });

   const fetchListings = useCallback(async (page) => {
      setLoading(true);
      setError(null);
      try {
         const res = await fetch(`/api/Listing?page=${page}`);
         if (!res.ok) throw new Error('Failed to fetch listings.');
         const json = await res.json();
         setListings(json.data ?? []);
         setPagination(json.pagination ?? null);
      } catch (err) {
         setError(err.message);
      } finally {
         setLoading(false);
      }
   }, []);

   useEffect(() => {
      fetchListings(currentPage);
   }, [ currentPage, fetchListings ]);

   // When edit completes or is cancelled, return to listings and refresh
   const handleEditDone = useCallback(() => {
      setEditingListing(null);
      fetchListings(currentPage);
   }, [ currentPage, fetchListings ]);

   const handlePageChange = (page) => {
      setCurrentPage(page);
      window.scrollTo({ top: 0, behavior: 'smooth' });
   };

   const handleDeleteClick = (listing_id) => {
      if (confirmId !== listing_id) {
         setConfirmId(listing_id);
         setDeleteError(null);
         return;
      }
      executeDelete(listing_id);
   };

   const cancelConfirm = () => setConfirmId(null);

   const executeDelete = async (listing_id) => {
      setDeletingId(listing_id);
      setDeleteError(null);

      const prev = listings;
      setListings(ls => ls.filter(l => l.listing_id !== listing_id));
      setConfirmId(null);

      try {
         const res = await fetch(`/api/Listing?listing_id=${listing_id}`, {
            method: 'DELETE',
         });

         if (!res.ok) {
            const json = await res.json().catch(() => ({}));
            throw new Error(json.error ?? 'Delete failed.');
         }

         fetchListings(currentPage);
         if (onSlotAdded) onSlotAdded();
      } catch (err) {
         setListings(prev);
         setDeleteError(err.message);
      } finally {
         setDeletingId(null);
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
      if (currentPage > 3) pages.push('...');
      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);
      for (let i = start; i <= end; i++) pages.push(i);
      if (currentPage < totalPages - 2) pages.push('...');
      pages.push(totalPages);
      return pages;
   };

   function canEdit(created_at) {
      if (!created_at) return false;
      const normalized = created_at.endsWith('Z') || created_at.includes('+')
         ? created_at
         : created_at.replace(' ', 'T') + 'Z';
      const diffMs = Date.now() - new Date(normalized).getTime();
      return diffMs / (1000 * 60 * 60 * 24) <= EDIT_WINDOW_DAYS;
   }

   useEffect(() => {
      const init = async () => {
         try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const res = await fetch('/api/account');
            const json = await res.json();

            const isNew = user?.created_at
               ? (Date.now() - new Date(user.created_at).getTime()) < 60 * 1000
               : false;

            setUserInfo({ username: json.username ?? '', isNew, orgImage: null });
         } catch { }
      };
      init();
   }, []);

   // Render edit form instead of listings grid
   if (editingListing) {
      return (
         <AddListing
            canAdd={slotData?.can_add ?? false}
            prefill={editingListing}
            onDone={handleEditDone}
         />
      );
   }

   return (
      <div className={styles.root}>
         <WelcomeBanner
            username={userInfo.username}
            isNew={userInfo.isNew}
            orgImage={userInfo.orgImage}
         />

         <ListingSummary />
         <TopPerformer />
         <AddSlotCard onSlotAdded={() => { fetchListings(currentPage); if (onSlotAdded) onSlotAdded(); }} />
         {/* ── Header ── */}
         <div className={styles.header}>
            <h2 className={styles.title}>My Listings</h2>
            <div className={styles.headerMeta}>
               {!loading && pagination && (
                  <span className={styles.count}>
                     {pagination.total_records} listing{pagination.total_records !== 1 ? 's' : ''}
                  </span>
               )}
               {/*{slotData && (
                  <>
                     <span className={styles.metaDivider}>·</span>
                     <span className={`${styles.count} ${!slotData.can_add ? styles.countWarning : ''}`}>
                        {slotData.slots} listing slot{slotData.slots !== 1 ? 's' : ''}
                     </span>
                  </>
               )} */}
            </div>
         </div>

         {/* ── Global delete error ── */}
         {deleteError && (
            <p className={styles.errorBanner}>{deleteError}</p>
         )}

         {/* ── Fetch error ── */}
         {error && (
            <div className={styles.errorState}>{error}</div>
         )}



         {/* ── Skeletons ── */}
         {loading && (
            <div className={styles.grid}>
               {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className={styles.skeleton} />
               ))}
            </div>
         )}

         {/* ── Empty ── */}
         {!loading && !error && listings.length === 0 && (
            <div className={styles.emptyState}>
               <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
                  <path d="M3 10V20M21 10V20M3 10h18M3 10L12 3l9 7"
                     stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
                  <rect x="9" y="14" width="6" height="6" stroke="currentColor" strokeWidth="1.2" />
               </svg>
               <p>You have no listings yet.</p>
            </div>
         )}

         {/* ── Grid ── */}
         {!loading && listings.length > 0 && (
            <div className={styles.grid}>
               {listings.map(listing => (
                  <div key={listing.listing_id} className={styles.cardWrapper}>
                     <PropertyCard listing={listing} />

                     <div className={styles.cardActions}>
                        {confirmId === listing.listing_id ? (
                           <div className={styles.confirmRow}>
                              <span className={styles.confirmText}>Delete this listing?</span>
                              <button
                                 className={styles.confirmYes}
                                 onClick={() => handleDeleteClick(listing.listing_id)}
                                 disabled={deletingId === listing.listing_id}
                              >
                                 {deletingId === listing.listing_id ? 'Deleting…' : 'Yes, delete'}
                              </button>
                              <button
                                 className={styles.confirmNo}
                                 onClick={cancelConfirm}
                                 disabled={deletingId === listing.listing_id}
                              >
                                 Cancel
                              </button>
                           </div>
                        ) : (
                           <button
                              className={styles.deleteBtn}
                              onClick={() => handleDeleteClick(listing.listing_id)}
                              disabled={deletingId === listing.listing_id}
                              aria-label={`Delete ${listing.property_name}`}
                           >
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                                 stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                                 <polyline points="3 6 5 6 21 6" />
                                 <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                                 <path d="M10 11v6M14 11v6" />
                                 <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                              </svg>
                              Delete listing
                           </button>
                        )}
                        <button
                           className={styles.editBtn}
                           onClick={() => setEditingListing(listing)}
                           disabled={!canEdit(listing.created_at)}
                           title={!canEdit(listing.created_at) ? 'Edit window has expired' : 'Edit listing'}
                        >
                           Edit
                        </button>
                     </div>
                  </div>
               ))}
            </div>
         )}

         {/* ── Pagination ── */}
         {!loading && totalPages > 1 && (
            <div className={styles.pagination}>
               <button
                  className={styles.pageBtn}
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  aria-label="Previous page"
               >
                  &#8592;
               </button>

               {pageNumbers().map((p, i) =>
                  p === '...' ? (
                     <span key={`ellipsis-${i}`} className={styles.ellipsis}>…</span>
                  ) : (
                     <button
                        key={p}
                        className={`${styles.pageBtn} ${p === currentPage ? styles.pageBtnActive : ''}`}
                        onClick={() => handlePageChange(p)}
                     >
                        {p}
                     </button>
                  )
               )}

               <button
                  className={styles.pageBtn}
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  aria-label="Next page"
               >
                  &#8594;
               </button>
            </div>
         )}
      </div>
   );
}