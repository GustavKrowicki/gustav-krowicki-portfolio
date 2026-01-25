'use client';

import { usePathname } from 'next/navigation';
import Header from './Header';
import Footer from './Footer';
import { PortfolioModeProvider, usePortfolioMode } from '@/contexts/PortfolioModeContext';

function LayoutContentInner({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { mode, isHydrated } = usePortfolioMode();
  const isProjectPage = pathname.startsWith('/work/') && pathname !== '/work';
  const isCityMode = isHydrated && mode === 'city';

  // Hide header/footer in City mode for full immersion
  const showHeader = !isProjectPage && !isCityMode;
  const showFooter = !isProjectPage && !isCityMode;

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

export default function LayoutContent({ children }: { children: React.ReactNode }) {
  return (
    <PortfolioModeProvider>
      <LayoutContentInner>{children}</LayoutContentInner>
    </PortfolioModeProvider>
  );
}
