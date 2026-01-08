'use client';

import { usePathname } from 'next/navigation';
import Header from './Header';
import Footer from './Footer';

export default function LayoutContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isProjectPage = pathname.startsWith('/work/') && pathname !== '/work';

  return (
    <>
      {!isProjectPage && <Header />}
      <main className={isProjectPage ? '' : 'flex-1 pt-20'}>
        {children}
      </main>
      {!isProjectPage && <Footer />}
    </>
  );
}
