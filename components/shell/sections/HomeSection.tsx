import Image from 'next/image';
import { getAllProjects } from '@/lib/projects';
import { contactInfo } from '@/components/contact/ContactLinks';
import { trackContactClicked } from '@/lib/analytics';
import { posts } from '@/components/home/LinkedInPosts';

// Projects from the studies, shared on LinkedIn (same list as the classic home), and the recommendation letter.
const LINKEDIN_POSTS = posts.filter((post) => post.type === 'linkedin');
const RECOMMENDATION = posts.find((post) => post.type === 'pdf');

// Short version of the classic home: introduction, case studies, uni work and contact.
export default function HomeSection({ onOpenCase }: { onOpenCase: (slug: string) => void }) {
  return (
    <div className="space-y-10 px-6 py-6">
      <section>
        <h2 className="text-2xl font-semibold text-neutral-900">Hello, I am Gustav</h2>
        <p className="mt-3 leading-relaxed text-neutral-700">
          I design digital products with a focus on user research, strategic thinking, and emerging technologies.
          Currently working on ML-assisted tools at the LEGO group. Happy to chat on new opportunities in second
          half&nbsp;2026.
        </p>
      </section>

      <section>
        <h3 className="text-sm font-medium text-neutral-500">Case studies</h3>
        <ul className="mt-3 space-y-1">
          {getAllProjects().map((project) => (
            <li key={project.slug}>
              <button
                type="button"
                onClick={() => onOpenCase(project.slug)}
                className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left transition-colors hover:bg-white"
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

      <section>
        <h3 className="text-sm font-medium text-neutral-500">Uni work</h3>
        <p className="mt-2 text-sm leading-relaxed text-neutral-700">
          Projects from my studies in IT and product design at SDU in Kolding, with stakeholders across different
          industries.
        </p>
        <ul className="mt-4 space-y-4">
          {LINKEDIN_POSTS.map((post) => (
            <li key={post.embedUrl} className="overflow-hidden rounded-lg border border-neutral-200 bg-white">
              {/* Same LinkedIn embeds as the classic home; lazy so they load when scrolled into view. */}
              <iframe
                src={post.embedUrl}
                title={post.title ?? 'LinkedIn post'}
                loading="lazy"
                height={600}
                className="w-full border-0"
              />
            </li>
          ))}
        </ul>
        {RECOMMENDATION && (
          <a
            href={RECOMMENDATION.embedUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 inline-block text-sm font-medium text-neutral-900 underline underline-offset-4"
          >
            Recommendation letter (PDF)
          </a>
        )}

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
