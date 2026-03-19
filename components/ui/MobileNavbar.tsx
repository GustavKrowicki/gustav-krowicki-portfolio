'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { User, Mail, Download } from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { label: 'About', href: '/about', icon: User },
  { label: 'Contact', href: '/contact', icon: Mail },
];

export default function MobileNavbar() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background border-t border-neutral-200 md:hidden">
      <ul className="flex items-center justify-around h-16 px-4">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/');

          return (
            <li key={item.href}>
              <Link
                href={item.href}
                className={cn(
                  'flex flex-col items-center gap-1 px-3 py-2 text-neutral-600 transition-colors',
                  isActive && 'text-foreground'
                )}
              >
                <Icon className="w-5 h-5" />
                <span className="text-xs">{item.label}</span>
              </Link>
            </li>
          );
        })}
        <li>
          <a
            href="/cv/CV-Gustav-Krowicki.pdf"
            target="_blank"
            rel="noopener noreferrer"
            className="flex flex-col items-center gap-1 px-3 py-2 text-neutral-600 transition-colors"
          >
            <Download className="w-5 h-5" />
            <span className="text-xs">CV</span>
          </a>
        </li>
      </ul>
    </nav>
  );
}
