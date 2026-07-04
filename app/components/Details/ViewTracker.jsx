'use client';

import { useEffect } from 'react';
import { useTrackVisit } from '@/app/hooks/useTrackVisit';

export default function ViewTracker({ listingId }) {
  useTrackVisit();

  useEffect(() => {
    fetch(`/api/listings/${listingId}/view`, { method: 'POST' });
  }, [listingId]);

  return null;
}