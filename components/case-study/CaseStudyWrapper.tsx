'use client';

import { useRouter } from 'next/navigation';
import { X } from 'lucide-react';
import { motion } from 'framer-motion';

interface CaseStudyWrapperProps {
  children: React.ReactNode;
}

export default function CaseStudyWrapper({ children }: CaseStudyWrapperProps) {
  const router = useRouter();

  const handleClose = () => {
    // Return city-mode visitors to the city instead of the classic landing
    // page. Read the query directly (not useSearchParams) so this client
    // wrapper doesn't force a Suspense boundary on every case-study page.
    const from = new URLSearchParams(window.location.search).get('from');
    if (from === 'city') {
      router.push('/city?return=1');
    } else {
      router.push('/');
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <motion.button
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        onClick={handleClose}
        className="fixed top-6 left-6 z-50 w-12 h-12 flex items-center justify-center bg-white/90 backdrop-blur-sm rounded-full shadow-lg hover:bg-white transition-colors"
        aria-label="Close case study"
      >
        <X className="w-6 h-6 text-foreground" />
      </motion.button>
      {children}
    </div>
  );
}
