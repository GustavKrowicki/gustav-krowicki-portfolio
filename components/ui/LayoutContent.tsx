'use client';

import { usePathname } from 'next/navigation';
import Header from './Header';
import Footer from './Footer';
import MobileNavbar from './MobileNavbar';

export default function LayoutContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isProjectPage = pathname.startsWith('/work/') && pathname !== '/work';

  return (
    <>
      {!isProjectPage && <Header />}
      <main className={isProjectPage ? '' : 'flex-1 pt-20 pb-16 md:pb-0'}>
        {children}
      </main>
      {!isProjectPage && <Footer />}
      {!isProjectPage && <MobileNavbar />}
    </>
  );
}
