'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Download } from 'lucide-react';
import Container from './Container';
import ModeToggle from './ModeToggle';
import { usePortfolioMode } from '@/contexts/PortfolioModeContext';
import { cn } from '@/lib/utils';

const navItems = [
  { label: 'About', href: '/about' },
  { label: 'Contact', href: '/contact' }
];

export default function Header() {
  const pathname = usePathname();
  const { mode, isHydrated } = usePortfolioMode();
  const [scrollY, setScrollY] = useState(0);
  const [lastScrollY, setLastScrollY] = useState(0);
  const [isScrollingUp, setIsScrollingUp] = useState(false);
  const headerHeight = 80; // 80px (h-20 = 5rem = 80px)

  const isCityMode = isHydrated && mode === 'city';

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;

      // Detect scroll direction
      if (currentScrollY < lastScrollY) {
        setIsScrollingUp(true);
      } else if (currentScrollY > lastScrollY) {
        setIsScrollingUp(false);
      }

      setScrollY(currentScrollY);
      setLastScrollY(currentScrollY);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, [lastScrollY]);

  // Calculate header offset based on scroll position and direction
  let headerOffset = 0;

  if (scrollY < headerHeight) {
    // In the first 80px, gradually hide as you scroll down
    headerOffset = scrollY;
  } else if (isScrollingUp || scrollY < 10) {
    // Show header when scrolling up or at top
    headerOffset = 0;
  } else {
    // Fully hidden when scrolled past header height and scrolling down
    headerOffset = headerHeight;
  }

  return (
    <header
      className={cn(
        "fixed top-0 left-0 right-0 z-50 transition-all duration-300",
        isCityMode ? "bg-slate-900/90 backdrop-blur-sm text-white" : "bg-background"
      )}
      style={{ transform: `translateY(-${headerOffset}px)` }}
    >
      <Container>
        <nav className="flex items-center justify-between h-20">
          <Link
            href="/"
            className={cn(
              "text-xl font-semibold hover:opacity-70 transition-opacity",
              isCityMode && "text-white"
            )}
          >
            Gustav Krowicki
          </Link>

          <ul className="flex items-center gap-8">
            {navItems.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={cn(
                      'text-base hover:opacity-70 transition-opacity',
                      isActive && 'font-medium underline underline-offset-4',
                      isCityMode && 'text-slate-300 hover:text-white'
                    )}
                  >
                    {item.label}
                  </Link>
                </li>
              );
            })}
            <li>
              <ModeToggle />
            </li>
            <li>
              <a
                href="/cv/CV-Gustav-Krowicki.pdf"
                target="_blank"
                rel="noopener noreferrer"
                className={cn(
                  "flex items-center gap-2 text-base hover:opacity-70 transition-opacity",
                  isCityMode && "text-slate-300 hover:text-white"
                )}
              >
                <Download className="w-4 h-4" />
                <span>Download CV</span>
              </a>
            </li>
          </ul>
        </nav>
      </Container>
    </header>
  );
}
