'use client';

import { Analytics } from '@vercel/analytics/react';
import { useEffect, useState } from 'react';

export default function AnalyticsWrapper() {
  const [isBlocked, setIsBlocked] = useState<boolean | null>(null);

  useEffect(() => {
    fetch('/api/check-ip')
      .then(res => res.json())
      .then(data => setIsBlocked(data.isBlocked))
      .catch(() => setIsBlocked(false));
  }, []);

  if (isBlocked === null || isBlocked) {
    return null;
  }

  return <Analytics />;
}
