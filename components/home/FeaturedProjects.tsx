'use client';

import { motion } from 'framer-motion';
import Image from 'next/image';
import Link from 'next/link';
import Container from '@/components/ui/Container';
import { getAllProjects } from '@/lib/projects';

export default function FeaturedProjects() {
  const projects = getAllProjects();

  return (
    <section className="py-10">
      <Container maxWidth="container">
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <div className="grid md:grid-cols-2 gap-8 lg:gap-12">
            {projects.map((project, index) => (
              <motion.div
                key={project.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
              >
                <Link
                  href={`/work/${project.slug}`}
                  className="group block"
                >
                  <div className="relative aspect-[16/10] mb-6 overflow-hidden rounded-lg">
                    <Image
                      src={project.coverImage}
                      alt={project.title}
                      fill
                      className="object-contain group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-4">
                      <h3 className="text-2xl font-semibold">
                        {project.title}
                      </h3>
                    </div>

                    <p className="text-sm text-neutral-500">{project.role}</p>

                    <p className="text-neutral-600 leading-relaxed">
                      {project.shortDescription}
                    </p>

                    <div className="flex flex-wrap gap-2">
                      {project.tags.slice(0, 3).map((tag) => (
                        <span
                          key={tag}
                          className="text-sm px-3 py-1 bg-neutral-200 text-neutral-700 rounded-full"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </Container>
    </section>
  );
}
