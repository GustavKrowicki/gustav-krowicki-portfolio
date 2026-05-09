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

      {/* Hero Info Section */}
      <section className="py-16 md:py-20">
        <Container maxWidth="container">
          <span className="inline-block px-3 py-1 bg-neutral-100 text-neutral-700 text-sm rounded-full mb-6">
            UX Design Intern
          </span>
          <h1 className="text-5xl md:text-6xl font-bold mb-12">
            Valtech
          </h1>

          <div className="grid grid-cols-12 gap-x-6 md:gap-x-8 gap-y-10">
            <div className="col-span-12 md:col-span-9">
              <p className="text-lg leading-relaxed text-neutral-700">
                During my internship as a UX designer at Valtech in Aarhus,
                I spent my time mainly on two projects within Vestas&rsquo;s
                customer-facing digital solutions. In both, I was involved
                from the start of each project to handoff.
              </p>
            </div>
            <div className="hidden md:block md:col-span-1" />
            <div className="col-span-12 md:col-span-2">
              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-medium text-neutral-500 uppercase tracking-wide mb-2">Team</h3>
                  <p className="text-neutral-700">Johannes Wigh-Poulsen</p>
                  <p className="text-neutral-700">Sune Depping Jeppesen</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-neutral-500 uppercase tracking-wide mb-2">Tools</h3>
                  <p className="text-neutral-700">Miro, Figma, Google Analytics</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-neutral-500 uppercase tracking-wide mb-2">Timeline</h3>
                  <p className="text-neutral-700">August 2023 – December 2023</p>
                </div>
              </div>
            </div>
          </div>
        </Container>
      </section>

      {/* Recommendations — moved up */}
      <RecommendationsSection
        title="Recommendations"
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
            </figure>
          </div>
        </Container>
      </section>

      {/* Practice */}
      <section className="py-16 md:py-24">
        <Container maxWidth="container">
          <div className="grid grid-cols-12 gap-x-6 md:gap-x-8 gap-y-8">
            <div className="col-span-12 md:col-span-2">
              <h3 className="text-sm font-medium text-neutral-500 uppercase tracking-wide">
                The practice
              </h3>
            </div>
            <div className="col-span-12 md:col-span-8">
              <div className="space-y-6 text-lg leading-relaxed text-neutral-700">
                <p>
                  I participated actively in design crits at Valtech, took an
                  active role helping peers with their projects, and contributed
                  to plan and execute research and workshops.
                </p>
                <p>
                  I was in charge of designing a design guide for a CMS website,
                  ensuring a cohesive product experience across branding and
                  marketing websites. Alongside that I took on smaller design
                  tasks that required a switch in the day-to-day mindset.
                </p>
              </div>
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
            </figure>
          </div>
        </Container>
      </section>

      {/* Context */}
      <section className="py-16 md:py-24 mt-16 md:mt-24 bg-neutral-50">
        <Container maxWidth="container">
          <div className="grid grid-cols-12 gap-x-6 md:gap-x-8 gap-y-10">
            <div className="col-span-12 md:col-span-2">
              <h3 className="text-sm font-medium text-neutral-500 uppercase tracking-wide">
                Context
              </h3>
            </div>
            <div className="col-span-12 md:col-span-8">
              <h2 className="text-3xl md:text-4xl font-bold text-black mb-8">
                Research as the spine of every project
              </h2>
              <p className="text-lg leading-relaxed text-neutral-700">
                In both projects I actively participated in design sprint
                sessions with stakeholders to gather feedback and improve
                ongoing work. I conducted user research using both qualitative
                and quantitative methods — contextual inquiry, interview, and
                web analytics.
              </p>
            </div>

            <div className="hidden md:block md:col-span-2" />
            <div className="col-span-12 md:col-span-8">
              <ul className="space-y-3 text-lg leading-relaxed text-neutral-700">
                {[
                  'Mapping the research',
                  'Journey mapping',
                  'Wireframing',
                  'Prototyping',
                  'Validating wireframes and concepts with customers and stakeholders',
                ].map((item) => (
                  <li key={item} className="flex gap-3">
                    <span className="text-neutral-400">•</span>
                    <span>{item}</span>
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
            </figure>
          </div>
        </Container>
      </section>
    </CaseStudyWrapper>
  );
}
