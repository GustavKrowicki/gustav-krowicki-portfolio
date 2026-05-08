import { Metadata } from 'next';
import Image from 'next/image';
import CaseStudyWrapper from '@/components/case-study/CaseStudyWrapper';
import CaseHeroAnimated from '@/components/case-study/CaseHeroAnimated';
import RecommendationsSection from '@/components/case-study/RecommendationsSection';
import Container from '@/components/ui/Container';
import { getProjectBySlug } from '@/lib/projects';

export const metadata: Metadata = {
  title: 'Valtech Internship — UX Design',
  description: 'UX design internship at Valtech working on Vestas customer-facing digital solutions',
};

export default function ValtechPage() {
  const project = getProjectBySlug('valtech');

  if (!project) {
    return <div>Project not found</div>;
  }

  return (
    <CaseStudyWrapper>
      <CaseHeroAnimated
        coverImage={project.coverImage}
        alt={project.title}
      />

      {/* Editorial title spread */}
      <section className="pt-20 pb-24 md:pt-28 md:pb-32">
        <Container maxWidth="container">
          <div className="grid grid-cols-12 gap-x-6 md:gap-x-8 gap-y-10">
            <div className="col-span-12 md:col-span-2">
              <span className="text-xs uppercase tracking-[0.18em] text-neutral-500">
                UX Design Intern
              </span>
            </div>
            <div className="col-span-12 md:col-span-10">
              <h1 className="text-6xl md:text-8xl lg:text-9xl font-light tracking-tight leading-[0.95]">
                Valtech<span className="text-neutral-400">.</span>
              </h1>
            </div>

            <div className="hidden md:block md:col-span-2" />
            <div className="col-span-12 md:col-span-7">
              <p className="text-2xl md:text-3xl leading-[1.4] font-light text-neutral-800">
                During my internship as a UX designer at Valtech in Aarhus,
                I spent my time mainly on two projects within Vestas&rsquo;s
                customer-facing digital solutions —{' '}
                <em className="italic text-neutral-500">
                  involved from the start of each project, to handoff.
                </em>
              </p>
            </div>
            <div className="hidden md:block md:col-span-1" />
            <div className="col-span-12 md:col-span-2">
              <dl className="space-y-6 text-sm">
                <div>
                  <dt className="italic text-neutral-500 mb-1.5">Team</dt>
                  <dd className="text-neutral-900 leading-relaxed">
                    Johannes Wigh-Poulsen
                    <br />
                    Sune Depping Jeppesen
                  </dd>
                </div>
                <div>
                  <dt className="italic text-neutral-500 mb-1.5">Tools</dt>
                  <dd className="text-neutral-900 leading-relaxed">
                    Miro, Figma,
                    <br />
                    Google Analytics
                  </dd>
                </div>
                <div>
                  <dt className="italic text-neutral-500 mb-1.5">Timeline</dt>
                  <dd className="text-neutral-900 leading-relaxed">
                    Aug — Dec 2023
                  </dd>
                </div>
              </dl>
            </div>
          </div>
        </Container>
      </section>

      {/* Recommendations — moved up */}
      <RecommendationsSection
        eyebrow="In their words"
        title={
          <>
            Two letters of{' '}
            <em className="italic font-light text-neutral-500">recommendation</em>.
          </>
        }
        recommendations={[
          {
            name: 'Johannes Wigh-Poulsen',
            role: 'Lead UX, Valtech',
            pdfUrl: '/recommendations/reccomendation from Johannes Wigh-Poulsen.pdf',
          },
          {
            name: 'Helle Jensen',
            role: 'Valtech',
            pdfUrl: '/recommendations/Recommendation from Helle Jensen.pdf',
          },
        ]}
      />

      {/* Plate 01 — establishing shot, contained and offset */}
      <section className="pt-12 md:pt-20 pb-12 md:pb-16">
        <Container maxWidth="container">
          <div className="grid grid-cols-12 gap-x-6 md:gap-x-8">
            <figure className="col-span-12 md:col-span-10 md:col-start-2">
              <div className="relative bg-neutral-50 overflow-hidden">
                <Image
                  src="/images/valtech/vestas 1.png"
                  alt="Vestas customer-facing digital interface"
                  width={2400}
                  height={1350}
                  className="w-full h-auto"
                  sizes="(min-width: 1024px) 1066px, 100vw"
                />
              </div>
              <figcaption className="mt-4 flex items-baseline gap-3">
                <span className="text-xs uppercase tracking-[0.18em] text-neutral-500 shrink-0">
                  Fig. 01
                </span>
                <span className="text-sm italic text-neutral-500">
                  Vestas customer-facing digital solution — concept work.
                </span>
              </figcaption>
            </figure>
          </div>
        </Container>
      </section>

      {/* Editorial body — practice */}
      <section className="py-24 md:py-32">
        <Container maxWidth="container">
          <div className="grid grid-cols-12 gap-x-6 md:gap-x-8 gap-y-8">
            <div className="col-span-12 md:col-span-2">
              <span className="text-xs uppercase tracking-[0.18em] text-neutral-500">
                The practice
              </span>
            </div>
            <div className="col-span-12 md:col-span-8">
              <p className="text-2xl md:text-[1.75rem] leading-[1.45] font-light text-neutral-900">
                I participated actively in design crits at Valtech, took an
                active role helping peers with their projects, and contributed
                to plan and execute research and workshops.
              </p>
              <p className="mt-10 text-lg md:text-xl leading-[1.65] text-neutral-700 max-w-[60ch]">
                I was in charge of designing a design guide for a CMS website,
                ensuring a cohesive product experience across branding and
                product. Alongside that I took on smaller design tasks that
                required a switch in the day-to-day mindset.
              </p>
            </div>
          </div>
        </Container>
      </section>

      {/* Plates 02 & 03 — paired drawer spread, asymmetric and staggered */}
      <section className="pb-16 md:pb-24">
        <Container maxWidth="container">
          <div className="grid grid-cols-12 gap-x-6 md:gap-x-8 gap-y-12">
            <figure className="col-span-12 md:col-span-7">
              <div className="relative bg-neutral-50 overflow-hidden">
                <Image
                  src="/images/valtech/vestas drawer.png"
                  alt="Vestas drawer interface"
                  width={1600}
                  height={1000}
                  className="w-full h-auto"
                  sizes="(min-width: 768px) 720px, 100vw"
                />
              </div>
              <figcaption className="mt-4 flex items-baseline gap-3">
                <span className="text-xs uppercase tracking-[0.18em] text-neutral-500 shrink-0">
                  Fig. 02
                </span>
                <span className="text-sm italic text-neutral-500">
                  Drawer pattern — surfacing details without breaking flow.
                </span>
              </figcaption>
            </figure>
            <figure className="col-span-12 md:col-span-5 md:mt-32">
              <div className="relative bg-neutral-50 overflow-hidden">
                <Image
                  src="/images/valtech/vestas drawer 2.png"
                  alt="Vestas drawer interface, detail"
                  width={1200}
                  height={900}
                  className="w-full h-auto"
                  sizes="(min-width: 768px) 500px, 100vw"
                />
              </div>
              <figcaption className="mt-4 flex items-baseline gap-3">
                <span className="text-xs uppercase tracking-[0.18em] text-neutral-500 shrink-0">
                  Fig. 03
                </span>
                <span className="text-sm italic text-neutral-500">
                  Detail — typographic rhythm inside the drawer.
                </span>
              </figcaption>
            </figure>
          </div>
        </Container>
      </section>

      {/* Context — asymmetric body */}
      <section className="py-24 md:py-32 mt-24 md:mt-32 bg-neutral-50">
        <Container maxWidth="container">
          <div className="grid grid-cols-12 gap-x-6 md:gap-x-8 gap-y-12">
            <div className="col-span-12 md:col-span-2">
              <span className="text-xs uppercase tracking-[0.18em] text-neutral-500">
                Context
              </span>
            </div>
            <div className="col-span-12 md:col-span-8">
              <h2 className="text-4xl md:text-6xl font-light leading-[1.05] tracking-tight mb-12 md:mb-16">
                Research as the{' '}
                <em className="italic font-light text-neutral-500">spine</em>{' '}
                of every project.
              </h2>
              <p className="text-xl md:text-2xl leading-normal font-light text-neutral-900 max-w-[60ch]">
                In both projects I actively participated in design sprint
                sessions with stakeholders to gather feedback and improve
                ongoing work. I conducted user research using both qualitative
                and quantitative methods — contextual inquiry, interview, and
                web analytics.
              </p>
            </div>

            <div className="hidden md:block md:col-span-2" />
            <div className="col-span-12 md:col-span-8">
              <ul className="divide-y divide-neutral-200 border-t border-b border-neutral-200">
                {[
                  'Mapping the research',
                  'Journey mapping',
                  'Wireframing',
                  'Prototyping',
                  'Validating wireframes and concepts with customers and stakeholders',
                ].map((item, i) => (
                  <li
                    key={item}
                    className="flex items-baseline gap-6 py-4 md:py-5"
                  >
                    <span className="text-xs tabular-nums text-neutral-400 w-8 shrink-0">
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <span className="text-base md:text-lg text-neutral-800">
                      {item}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </Container>
      </section>

      {/* Plate 04 — closing plate, offset right and narrower */}
      <section className="py-16 md:py-24 mb-12 md:mb-24">
        <Container maxWidth="container">
          <div className="grid grid-cols-12 gap-x-6 md:gap-x-8">
            <figure className="col-span-12 md:col-span-9 md:col-start-3">
              <div className="relative bg-neutral-50 overflow-hidden">
                <Image
                  src="/images/valtech/vestas 2.png"
                  alt="Vestas project work"
                  width={1800}
                  height={1200}
                  className="w-full h-auto"
                  sizes="(min-width: 1024px) 940px, 100vw"
                />
              </div>
              <figcaption className="mt-4 flex items-baseline gap-3">
                <span className="text-xs uppercase tracking-[0.18em] text-neutral-500 shrink-0">
                  Fig. 04
                </span>
                <span className="text-sm italic text-neutral-500">
                  Project artefact — research synthesis on the wall.
                </span>
              </figcaption>
            </figure>
          </div>
        </Container>
      </section>
    </CaseStudyWrapper>
  );
}
