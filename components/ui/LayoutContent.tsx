'use client';

import { Agentation } from 'agentation';

export default function LayoutContent({ children }: { children: React.ReactNode }) {
  return (
    <>
      <main className="flex-1">{children}</main>
      {process.env.NODE_ENV === 'development' && <Agentation endpoint="http://localhost:4747" />}
    </>
  );
}
