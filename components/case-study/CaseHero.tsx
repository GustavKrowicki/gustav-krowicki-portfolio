'use client';

import { motion } from 'framer-motion';
import Image from 'next/image';
import Container from '@/components/ui/Container';

interface CaseHeroProps {
  title: string;
  role: string;
  timeline: string;
  coverImage: string;
  tags?: string[];
}

export default function CaseHero({ title, role, timeline, coverImage, tags }: CaseHeroProps) {
  return (
    <section className="py-16 md:py-24">
      <Container maxWidth="container">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="mb-12">
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
          </div>

          <div className="relative aspect-[16/9] bg-neutral-200 overflow-hidden rounded-lg">
            <Image
              src={coverImage}
              alt={title}
              fill
              className="object-cover"
              priority
            />
          </div>
        </motion.div>
      </Container>
    </section>
  );
}
