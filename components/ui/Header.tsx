'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Download } from 'lucide-react';
import Container from './Container';
import { cn } from '@/lib/utils';

const navItems = [
  { label: 'About', href: '/about' },
  { label: 'Contact', href: '/contact' },
  { label: 'City', href: '/city' }
];

export default function Header() {
  const pathname = usePathname();
  const [scrollY, setScrollY] = useState(0);
  const [lastScrollY, setLastScrollY] = useState(0);
  const [isScrollingUp, setIsScrollingUp] = useState(false);
  const headerHeight = 80;

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;

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

  let headerOffset = 0;

  if (scrollY < headerHeight) {
    headerOffset = scrollY;
  } else if (isScrollingUp || scrollY < 10) {
    headerOffset = 0;
  } else {
    headerOffset = headerHeight;
  }

  return (
    <header
      className="fixed top-0 left-0 right-0 z-50 transition-all duration-300 bg-background"
      style={{ transform: `translateY(-${headerOffset}px)` }}
    >
      <Container>
        <nav className="flex items-center justify-between h-20">
          <Link
            href="/"
            className="text-xl font-semibold hover:opacity-70 transition-opacity"
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
                      isActive && 'font-medium underline underline-offset-4'
                    )}
                  >
                    {item.label}
                  </Link>
                </li>
              );
            })}
            <li>
              <a
                href="/cv/CV-Gustav-Krowicki.pdf"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-base hover:opacity-70 transition-opacity"
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
