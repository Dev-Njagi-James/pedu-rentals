'use client';

import styles from '../css/MyListing.module.css';
import ListingSummary from './ListingsSummary';
import TopPerformer from './TopPerfomer';

export default function DashboardPanel() {
   return (
      <div className={styles.root}>
         <ListingSummary />
         <TopPerformer />
      </div>
   );
}