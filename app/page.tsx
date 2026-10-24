import { redirect } from 'next/navigation';

// The classic site that lived here was removed; /new is the portfolio now and moves to / at launch.
// The redirect that visitors get is the edge rule in public/_redirects; this client-side one is only a fallback.
export default function Home() {
  redirect('/new');
}
