'use client';

import Image from 'next/image';
import { useRouter } from 'next/navigation';

interface PortfolioModeToggleProps {
  activeMode: 'classic' | 'city';
  showIdentity?: boolean;
}

export default function PortfolioModeToggle({ activeMode, showIdentity = false }: PortfolioModeToggleProps) {
  const router = useRouter();

  return (
    <div className="flex items-center gap-3">
      {showIdentity && (
        <>
          <span className="text-sm font-semibold text-white drop-shadow-md">
            Gustav Krowicki
          </span>
          <Image
            src="/images/about/me avatar.jpeg"
            alt="Gustav Krowicki"
            width={36}
            height={36}
            className="rounded-full"
          />
        </>
      )}
      <div className="flex rounded-full border border-neutral-200 bg-neutral-100 p-0.5 text-sm">
        <button
          onClick={() => activeMode !== 'classic' && router.push('/')}
          className={`rounded-full px-3 py-1 transition-colors ${
            activeMode === 'classic'
              ? 'bg-white font-medium text-neutral-900 shadow-sm'
              : 'text-neutral-500 hover:text-neutral-700'
          }`}
        >
          Classic
        </button>
        <button
          onClick={() => activeMode !== 'city' && router.push('/city')}
          className={`rounded-full px-3 py-1 transition-colors ${
            activeMode === 'city'
              ? 'bg-white font-medium text-neutral-900 shadow-sm'
              : 'text-neutral-500 hover:text-neutral-700'
          }`}
        >
          City
        </button>
      </div>
    </div>
  );
}
