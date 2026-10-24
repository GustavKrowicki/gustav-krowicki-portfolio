import Image from 'next/image';
import { getAllProjects } from '@/lib/projects';
import { contactInfo } from '@/components/contact/ContactLinks';
import { trackContactClicked } from '@/lib/analytics';
import { posts } from '@/components/home/LinkedInPosts';
import UniWorkCarousel from '../UniWorkCarousel';


// Short version of the classic home: introduction, case studies, uni work and contact. The cases come right after the
// first line, so a phone's short sheet shows the work first; the rest of the intro follows them.
export default function HomeSection({ onOpenCase }: { onOpenCase: (slug: string) => void }) {
  const cases = (
    <section>
      <h3 className="text-sm font-medium text-neutral-500">Case studies</h3>
      <ul className="mt-3 space-y-1">
        {getAllProjects().map((project) => (
          <li key={project.slug}>
            <button
              type="button"
              onClick={() => onOpenCase(project.slug)}
              className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left transition-colors hover:bg-neutral-100"
            >
              <Image
                src={project.coverImage}
                alt=""
                width={44}
                height={44}
                className="h-11 w-11 shrink-0 rounded-full object-cover"
              />
              <span>
                <span className="block font-medium text-neutral-900">{project.title}</span>
                <span className="block text-sm text-neutral-600">{project.role}</span>
              </span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );

  return (
    <div className="space-y-8 px-6 pb-6 pt-2 md:space-y-10 md:pt-6">
      <section>
        <h2 className="text-xl font-semibold text-neutral-900 md:text-2xl">Hello, I am Gustav</h2>
        <p className="mt-1.5 leading-snug text-neutral-700">
          I design digital products with a focus on relations, systems and emerging technologies.
        </p>
      </section>
      {cases}
      <section>
        <h3 className="text-sm font-medium text-neutral-500">Uni work</h3>
        <p className="mt-2 text-sm leading-relaxed text-neutral-700">
          Projects from my studies in IT and product design at SDU in Kolding, with stakeholders across different
          industries.
        </p>
        {/* Projects from the studies shared on LinkedIn, then the recommendation letter (same list as the classic home) */}
        <div className="mt-4">
          <UniWorkCarousel items={posts} />
        </div>

      </section>

      <section>
        <h3 className="text-sm font-medium text-neutral-500">Contact</h3>
        <ul className="mt-3 space-y-3">
          {contactInfo
            .filter((item) => item.href)
            .map(({ icon: Icon, label, value, href, method }) => (
              <li key={label}>
                <a
                  href={href ?? undefined}
                  onClick={() => method && trackContactClicked(method)}
                  className="flex items-center gap-3 text-neutral-800 hover:text-neutral-950"
                  {...(method === 'linkedin' ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                >
                  <Icon className="h-4 w-4 shrink-0 text-neutral-500" />
                  <span className="text-sm">{value}</span>
                </a>
              </li>
            ))}
        </ul>
      </section>
    </div>
  );
}
