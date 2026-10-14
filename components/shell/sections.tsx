import { CableCar, FileUser, PencilLine, Trophy, UserStar, type LucideIcon } from 'lucide-react';
import { getAllProjects } from '@/lib/projects';

// The rail order follows the IA (Figma "IA v2"). Home has no icon: the rail shows Gustav's photo for it.
export type SectionId = 'home' | 'achievements' | 'avatar' | 'work' | 'hobbies' | 'cv';

export interface ShellSection {
  id: SectionId;
  label: string;
  icon?: LucideIcon;
}

export const SECTIONS: ShellSection[] = [
  { id: 'home', label: 'Home' },
  { id: 'achievements', label: 'Achievements', icon: Trophy },
  { id: 'avatar', label: 'Avatar', icon: UserStar },
  { id: 'work', label: 'Work', icon: PencilLine },
  { id: 'hobbies', label: 'About me', icon: CableCar },
  { id: 'cv', label: 'CV', icon: FileUser },
];

// Placeholder content for step 1 of the shell. Each section gets its real content in step 2.
export function SectionContent({ id, selectedProject }: { id: SectionId; selectedProject: string | null }) {
  switch (id) {
    case 'home':
      return (
        <Placeholder title="Hello" note="Introduction, case studies, uni work and contact." />
      );
    case 'achievements':
      return <Placeholder title="Achievements" note="Places, photos, workshop, music, food and books found in the city." />;
    case 'avatar':
      return <Placeholder title="Create your own avatar" note="Face, hair, body and shoes." />;
    case 'work':
      return <WorkList selectedProject={selectedProject} />;
    case 'hobbies':
      return <Placeholder title="About me" note="One card for each free time area, with its place in the city." />;
    case 'cv':
      return (
        <div>
          <h2 className="text-2xl font-semibold text-neutral-900">Resume</h2>
          <a
            href="/cv/CV-Gustav-Krowicki.pdf"
            download
            className="mt-4 inline-block text-sm font-medium text-neutral-900 underline underline-offset-4"
          >
            Download CV (PDF)
          </a>
        </div>
      );
  }
}

function Placeholder({ title, note }: { title: string; note: string }) {
  return (
    <div>
      <h2 className="text-2xl font-semibold text-neutral-900">{title}</h2>
      <p className="mt-3 text-sm leading-relaxed text-neutral-600">{note}</p>
    </div>
  );
}

function WorkList({ selectedProject }: { selectedProject: string | null }) {
  return (
    <div>
      <h2 className="text-2xl font-semibold text-neutral-900">Work</h2>
      <ul className="mt-6 space-y-3">
        {getAllProjects().map((project) => (
          <li
            key={project.slug}
            aria-current={project.slug === selectedProject ? 'true' : undefined}
            className={`rounded-lg border px-4 py-3 ${
              project.slug === selectedProject ? 'border-neutral-900 bg-white' : 'border-neutral-200'
            }`}
          >
            <p className="font-medium text-neutral-900">{project.title}</p>
            <p className="text-sm text-neutral-600">{project.role}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
