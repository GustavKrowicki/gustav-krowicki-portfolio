'use client';

import { usePathname } from 'next/navigation';
import Header from './Header';
import Footer from './Footer';

export default function LayoutContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isProjectPage = pathname.startsWith('/work/') && pathname !== '/work';
  const isCityPage = pathname.startsWith('/city');

  const showHeader = !isProjectPage && !isCityPage;
  const showFooter = !isProjectPage && !isCityPage;

  return (
    <>
      {showHeader && <Header />}
      <main className={showHeader ? 'flex-1 pt-20' : 'flex-1'}>
        {children}
      </main>
      {showFooter && <Footer />}
    </>
  );
}
