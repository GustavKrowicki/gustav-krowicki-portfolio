'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Container from './Container';
import { cn } from '@/lib/utils';

const navItems = [
  { label: 'Work', href: '/work' },
  { label: 'About', href: '/about' },
  { label: 'Contact', href: '/contact' }
];

export default function Header() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-sm ">
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
          </ul>
        </nav>
      </Container>
    </header>
  );
}
