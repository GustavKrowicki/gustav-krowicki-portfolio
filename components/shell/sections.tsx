import { CableCar, FileUser, PencilLine, Trophy, UserStar, type LucideIcon } from 'lucide-react';
import { CASES } from '@/components/cases';
import HomeSection from './sections/HomeSection';
import WorkSection from './sections/WorkSection';
import AboutSection from './sections/AboutSection';
import CvSection from './sections/CvSection';
import AchievementsSection from './sections/AchievementsSection';
import AvatarSection from './sections/AvatarSection';

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

interface SectionContentProps {
  id: SectionId;
  openCase: string | null;
  onOpenCase: (slug: string) => void;
  onOpenSection: (id: SectionId) => void;
}

// An open case replaces the section it was opened from; the panel header then shows Back.
export function SectionContent({ id, openCase, onOpenCase, onOpenSection }: SectionContentProps) {
  if (openCase) {
    const Case = CASES[openCase];
    return Case ? <Case /> : <Placeholder title="Case not found" note={openCase} />;
  }

  switch (id) {
    case 'home':
      return <HomeSection onOpenCase={onOpenCase} onOpenSection={onOpenSection} />;
    case 'work':
      return <WorkSection onOpenCase={onOpenCase} />;
    case 'hobbies':
      return <AboutSection />;
    case 'cv':
      return <CvSection />;
    case 'achievements':
      return <AchievementsSection onOpenSection={onOpenSection} />;
    case 'avatar':
      return <AvatarSection />;
  }
}

function Placeholder({ title, note }: { title: string; note: string }) {
  return (
    <div className="px-6 py-6">
      <h2 className="text-2xl font-semibold text-neutral-900">{title}</h2>
      <p className="mt-3 text-sm leading-relaxed text-neutral-600">{note}</p>
    </div>
  );
}
