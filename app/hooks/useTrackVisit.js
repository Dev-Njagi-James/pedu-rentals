import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

export function useTrackVisit() {
  const pathname = usePathname();

  useEffect(() => {
    const key = `visited:${pathname}`;
    if (sessionStorage.getItem(key)) return;  // already tracked this session

    fetch('/api/adminRo/analytics', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: pathname }),
    });

    sessionStorage.setItem(key, '1');
  }, [pathname]);
}