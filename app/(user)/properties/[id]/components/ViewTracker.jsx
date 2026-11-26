'use client';

import { useEffect } from 'react';
import { useTrackVisit } from '@/app/hooks/useTrackVisit';

export default function ViewTracker({ listingId }) {
  useTrackVisit();

  useEffect(() => {
    try {
      const key = `pedu_viewed_${listingId}`;
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, '1');
    } catch {
      // storage unavailable — count the view anyway
    }

    fetch(`/api/listings/${listingId}/view`, { method: 'POST' });
  }, [listingId]);

  return null;
}