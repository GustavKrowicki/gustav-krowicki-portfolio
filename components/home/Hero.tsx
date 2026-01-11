'use client';

import Image from 'next/image';
import { motion } from 'framer-motion';
import Container from '@/components/ui/Container';

export default function Hero() {
  return (
    <section className="py-10">
      <Container maxWidth="container">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="max-w-4xl"
        >
          <div className="flex items-center gap-4 mb-6">
            <h1 className="text-3xl md:text-4xl font-bold">
              Hello, I am Gustav
            </h1>
            <div className="shrink-0">
              <Image
                src="/images/about/me avatar.jpeg"
                alt="Gustav Krowicki"
                width={80}
                height={80}
                className="rounded-full"
              />
            </div>
          </div>
          <p className="text-lg md:text-xl text-neutral-700 leading-relaxed max-w-3xl">
            I design digital products with a focus on user research, strategic thinking,
            and emerging technologies. Currently working on ML-assisted tools at LEGO.
          </p>
        </motion.div>
      </Container>
    </section>
  );
}
