'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

// The classic site that lived here was removed; /new is the portfolio now and moves to / at launch.
export default function Home() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/new');
  }, [router]);
  return null;
}
