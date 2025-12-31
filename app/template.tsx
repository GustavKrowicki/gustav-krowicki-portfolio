'use client';

import { motion } from 'framer-motion';
import { usePathname } from 'next/navigation';

export default function Template({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isProjectPage = pathname.startsWith('/work/') && pathname !== '/work';

  if (isProjectPage) {
    return (
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{
          type: 'spring',
          stiffness: 300,
          damping: 30,
          mass: 0.8
        }}
        className="fixed inset-0 bg-background z-50 overflow-y-auto"
      >
        {children}
      </motion.div>
    );
  }

  return <>{children}</>;
}
