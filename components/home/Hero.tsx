'use client';

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
          <p className="text-lg md:text-xl text-neutral-700 leading-relaxed max-w-3xl">
            I design digital products with a focus on user research, strategic thinking,
            and emerging technologies. Currently working on ML-assisted tools at LEGO.
          </p>
        </motion.div>
      </Container>
    </section>
  );
}
