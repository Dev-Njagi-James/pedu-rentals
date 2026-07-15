'use client';

import { useState, useEffect } from 'react';
import { createBrowserSupabaseClient } from '@/lib/supabase/client';
import styles from '../css/ListingsSummary.module.css';

const supabase = createBrowserSupabaseClient();

function getSlotColor(slotsUsed, slots) {
   if (!slots) return 'green';
   if (slotsUsed >= slots) return 'red';
   if (slotsUsed >= slots / 2) return 'orange';
   return 'green';
}

export default function ListingsSummary() {
   const [ data, setData ] = useState(null);
   const [ loading, setLoading ] = useState(true);

   useEffect(() => {
      const init = async () => {
         try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const [
               { data: lister },
               { count: listingCount },
               summaryRes,
            ] = await Promise.all([
               supabase.from('Listers_Info').select('"Slots"').eq('"lister_UUID"', user.id).single(),
               supabase.from('Property_Listing').select('listing_id', { count: 'exact', head: true }).eq('user_id', user.id),
               fetch('/api/analytics/summary'),
            ]);

            const summary = summaryRes.ok ? await summaryRes.json() : {};

            setData({
               slots: lister?.Slots ?? 0,
               slotsUsed: listingCount ?? 0,
               totalViews: summary?.totalViews ?? 0,
               totalCalls: summary?.totalCalls ?? 0,
            });
         } catch {
            // non-blocking
         } finally {
            setLoading(false);
         }
      };
      init();
   }, []);

   const usedPercent = data ? Math.round((data.slotsUsed / data.slots) * 100) : 0;
   const slotColor = data ? getSlotColor(data.slotsUsed, data.slots) : 'green';

   return (
      <section className={styles.section}>
         <h3 className={styles.heading}>Listings Summary</h3>

         <div className={styles.grid}>

            {/* ── Listing Slots ── */}
            <div
               className={`${styles.card} ${styles.cardSlots}`}
               style={{ '--slot-color': slotColor }}
            >
               <div className={styles.cardTop}>
                  <span className={styles.cardLabel}>Listing Slots</span>
                  <span className={styles.cardBig}>
                     {loading ? '—' : data?.slots ?? 0}
                  </span>
               </div>
               <div className={styles.progressTrack}>
                  <div
                     className={styles.progressFill}
                     style={{ width: loading ? '0%' : `${usedPercent}%` }}
                  />
               </div>
               <span className={styles.progressLabel}>
                  {loading ? '…' : `${data?.slotsUsed} of ${data?.slots} used`}
               </span>
            </div>

            {/* ── Total Views ── */}
            <div className={`${styles.card} ${styles.cardTint}`}>
               <span className={styles.cardLabel}>Total Views</span>
               <span className={styles.cardBig}>
                  {loading ? '—' : data?.totalViews ?? 0}
               </span>
            </div>

            {/* ── Total Calls ── */}
            <div className={`${styles.card} ${styles.cardTint}`}>
               <span className={styles.cardLabel}>Total Calls</span>
               <span className={styles.cardBig}>
                  {loading ? '—' : data?.totalCalls ?? 0}
               </span>
            </div>

         </div>
      </section>
   );
}