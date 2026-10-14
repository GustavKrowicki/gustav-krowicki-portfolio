import Image from 'next/image';
import { getAllProjects } from '@/lib/projects';

// One card per case study; a card opens the case in the panel.
export default function WorkSection({ onOpenCase }: { onOpenCase: (slug: string) => void }) {
  return (
    <div className="px-6 py-6">
      <h2 className="text-2xl font-semibold text-neutral-900">Work</h2>
      <ul className="mt-6 space-y-6">
        {getAllProjects().map((project) => (
          <li key={project.slug}>
            <button type="button" onClick={() => onOpenCase(project.slug)} className="group block w-full text-left">
              <span className="relative block aspect-[16/9] overflow-hidden rounded-lg bg-white">
                <Image
                  src={project.coverImage}
                  alt=""
                  fill
                  sizes="(min-width: 768px) 320px, 100vw"
                  className="object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                />
              </span>
              <span className="mt-3 block font-medium text-neutral-900">{project.title}</span>
              <span className="block text-sm text-neutral-600">{project.role}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
