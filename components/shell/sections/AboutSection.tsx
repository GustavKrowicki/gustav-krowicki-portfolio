import Image from 'next/image';
import { BookOpen, Music, type LucideIcon } from 'lucide-react';

// One card per free time area, each tied to its place in the city (buildingId in lib/city/buildings.ts).
// Step 3 of the shell makes a card show that place; for now the card names it.
interface Hobby {
  title: string;
  text: string;
  place: string;
  buildingId: string;
  image?: string;
  icon?: LucideIcon;
}

const HOBBIES: Hobby[] = [
  {
    title: 'Skiing',
    text: 'Skiing in the Alps, with lunch on the slopes.',
    place: 'Ski slope',
    buildingId: 'ski-chute-2',
    image: '/images/about/Ski 2.jpg',
  },
  {
    title: 'Football',
    text: 'AGF home matches, a cup final in Parken and an away day in Dortmund.',
    place: 'Aarhus stadium',
    buildingId: 'aarhus-stadium',
    image: '/images/about/AGF 1.jpg',
  },
  {
    title: 'Music',
    text: 'Playlists I keep coming back to.',
    place: 'Northside stage',
    buildingId: 'northside-stage',
    icon: Music,
  },
  {
    title: 'Books',
    text: 'My reading list.',
    place: 'Dokk1 library',
    buildingId: 'dokk1-library',
    icon: BookOpen,
  },
];

export default function AboutSection() {
  return (
    <div className="px-6 py-6">
      <h2 className="text-2xl font-semibold text-neutral-900">About me</h2>
      <p className="mt-3 leading-relaxed text-neutral-700">
        I am a digital product designer based in Aarhus, Denmark, driven by a curious and positive mindset. I am
        finishing a master&apos;s in IT and Product Design at SDU in Kolding while working at the LEGO group on an
        ML-assisted platform.
      </p>

      <ul className="mt-8 grid grid-cols-2 gap-4">
        {HOBBIES.map(({ title, text, place, image, icon: Icon }) => (
          <li key={title} className="overflow-hidden rounded-lg bg-[#FDFDFD]">
            <span className="relative flex aspect-[4/3] items-center justify-center bg-neutral-100">
              {image ? (
                <Image src={image} alt="" fill sizes="160px" className="object-cover" />
              ) : (
                Icon && <Icon className="h-8 w-8 text-neutral-400" strokeWidth={1.5} />
              )}
            </span>
            <span className="block px-3 py-3">
              <span className="block font-medium text-neutral-900">{title}</span>
              <span className="mt-1 block text-xs leading-snug text-neutral-600">{text}</span>
              <span className="mt-2 block text-xs text-neutral-500">In the city: {place}</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
