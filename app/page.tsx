import { redirect } from 'next/navigation';

// The classic site that lived here was removed; /new is the portfolio now and moves to / at launch.
// In the static export this becomes a meta refresh in index.html, so it works without JavaScript.
export default function Home() {
  redirect('/new');
}
