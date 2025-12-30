'use client';

import { motion } from 'framer-motion';
import Image from 'next/image';
import Link from 'next/link';
import { Project } from '@/lib/types';

interface ProjectCardProps {
  project: Project;
  index: number;
}

export default function ProjectCard({ project, index }: ProjectCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
    >
      <Link href={`/work/${project.slug}`} className="group block">
        <div className="relative aspect-[16/10] bg-neutral-200 mb-6 overflow-hidden">
          <Image
            src={project.coverImage}
            alt={project.title}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-300"
          />
        </div>

        <div className="space-y-3">
          <div className="flex items-start justify-between gap-4">
            <h3 className="text-2xl font-semibold group-hover:text-accent transition-colors">
              {project.title}
            </h3>
            <span className="text-sm text-neutral-500 whitespace-nowrap">
              {project.timeline}
            </span>
          </div>

          <p className="text-neutral-600">{project.role}</p>

          <p className="text-neutral-700 leading-relaxed">
            {project.shortDescription}
          </p>

          <div className="flex flex-wrap gap-2">
            {project.tags.map((tag) => (
              <span
                key={tag}
                className="text-sm px-3 py-1 bg-neutral-100 text-neutral-700 rounded-full"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
