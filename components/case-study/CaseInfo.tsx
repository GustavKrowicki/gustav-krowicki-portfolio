'use client';

import { motion } from 'framer-motion';
import Container from '@/components/ui/Container';

interface CaseInfoProps {
  title: string;
  role: string;
  timeline: string;
  tags?: string[];
}

export default function CaseInfo({ title, role, timeline, tags }: CaseInfoProps) {
  return (
    <section className="py-16 md:py-20">
      <Container maxWidth="container">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="max-w-4xl"
        >
          <h1 className="text-5xl md:text-6xl font-bold mb-6">{title}</h1>

          <div className="flex flex-wrap gap-x-8 gap-y-2 text-lg text-neutral-600 mb-6">
            <div>
              <span className="font-medium">Role:</span> {role}
            </div>
            <div>
              <span className="font-medium">Timeline:</span> {timeline}
            </div>
          </div>

          {tags && tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {tags.map((tag) => (
                <span
                  key={tag}
                  className="px-3 py-1 bg-neutral-100 text-neutral-700 text-sm rounded-full"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </motion.div>
      </Container>
    </section>
  );
}
