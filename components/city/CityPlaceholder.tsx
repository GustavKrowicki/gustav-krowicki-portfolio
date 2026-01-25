'use client';

import { usePortfolioMode } from '@/contexts/PortfolioModeContext';
import Container from '@/components/ui/Container';

export default function CityPlaceholder() {
  const { setMode } = usePortfolioMode();

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 flex items-center justify-center">
      <Container>
        <div className="text-center max-w-2xl mx-auto">
          <div className="mb-8">
            <div className="w-32 h-32 mx-auto bg-slate-700 rounded-2xl flex items-center justify-center mb-6">
              <svg
                className="w-16 h-16 text-slate-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                />
              </svg>
            </div>
            <h1 className="text-4xl font-bold text-white mb-4">
              Gustav&apos;s City
            </h1>
            <p className="text-xl text-slate-300 mb-2">
              Coming Soon
            </p>
          </div>

          <p className="text-slate-400 mb-8 leading-relaxed">
            An interactive isometric city where you can explore my work,
            career journey, and projects in a unique visual experience.
            Walk through different districts representing my career stages
            and click on buildings to learn more.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={() => setMode('classic')}
              className="px-6 py-3 bg-white text-slate-900 rounded-lg font-medium hover:bg-slate-100 transition-colors"
            >
              View Classic Portfolio
            </button>
            <a
              href="https://github.com/twofactor/pogicity-demo"
              target="_blank"
              rel="noopener noreferrer"
              className="px-6 py-3 border border-slate-600 text-slate-300 rounded-lg font-medium hover:border-slate-500 hover:text-white transition-colors"
            >
              See Pogicity Inspiration
            </a>
          </div>

          <div className="mt-16 grid grid-cols-2 sm:grid-cols-4 gap-4 text-left">
            <div className="bg-slate-800/50 p-4 rounded-lg">
              <div className="text-2xl mb-2">🏢</div>
              <h3 className="text-white font-medium text-sm">Corporate District</h3>
              <p className="text-slate-500 text-xs mt-1">LEGO, Valtech</p>
            </div>
            <div className="bg-slate-800/50 p-4 rounded-lg">
              <div className="text-2xl mb-2">🎓</div>
              <h3 className="text-white font-medium text-sm">Education District</h3>
              <p className="text-slate-500 text-xs mt-1">SDU</p>
            </div>
            <div className="bg-slate-800/50 p-4 rounded-lg">
              <div className="text-2xl mb-2">🚀</div>
              <h3 className="text-white font-medium text-sm">Startup District</h3>
              <p className="text-slate-500 text-xs mt-1">Cate it</p>
            </div>
            <div className="bg-slate-800/50 p-4 rounded-lg">
              <div className="text-2xl mb-2">🏠</div>
              <h3 className="text-white font-medium text-sm">Personal District</h3>
              <p className="text-slate-500 text-xs mt-1">Side projects</p>
            </div>
          </div>
        </div>
      </Container>
    </div>
  );
}
