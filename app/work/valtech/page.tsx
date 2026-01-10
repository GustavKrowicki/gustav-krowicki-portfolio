import { Metadata } from 'next';
import Image from 'next/image';
import CaseStudyWrapper from '@/components/case-study/CaseStudyWrapper';
import CaseHeroAnimated from '@/components/case-study/CaseHeroAnimated';
import CaseSection from '@/components/case-study/CaseSection';
import RecommendationsSection from '@/components/case-study/RecommendationsSection';
import Container from '@/components/ui/Container';
import { getProjectBySlug } from '@/lib/projects';

export const metadata: Metadata = {
  title: 'Valtech Internship - UX Design',
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
          <div className="grid md:grid-cols-2 gap-12 lg:gap-16">
            {/* Left - Title and Description */}
            <div>
              <span className="inline-block px-3 py-1 bg-neutral-100 text-neutral-700 text-sm rounded-full mb-6">
                UX Design Intern
              </span>
              <h1 className="text-4xl md:text-5xl font-bold mb-8">
                Valtech
              </h1>
              <p className="text-lg leading-relaxed text-neutral-700">
                During my internship as a UX designer at Valtech, Aarhus, I spent my time mainly
                on two projects within Vestas's customer facing digital solutions. In both parts
                I was lucky to be involved from the start of the project, to handoff.
              </p>
            </div>

            {/* Right - Meta Info */}
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
                <p className="text-neutral-700">August 2023 - December 2023</p>
              </div>
            </div>
          </div>
        </Container>
      </section>

      {/* Full-width Image 1 */}
      <section className="py-8">
        <Container maxWidth="container">
          <div className="relative rounded-2xl overflow-hidden">
            <Image
              src="/images/valtech/vestas 1.png"
              alt="Vestas project interface"
              width={1920}
              height={1080}
              className="w-full h-auto"
            />
          </div>
        </Container>
      </section>

      {/* Description Section */}
      <CaseSection maxWidth="content">
        <p>
          Furthermore I participated actively in design crits at Valtech, had an active role
          helping my peers with their projects. I also contributed to plan and execute research
          and workshops.
        </p>
        <p>
          I was in charge of designing a design guide for a CMS website ensuring a cohesive
          product experience, across branding and product. Furthermore I worked with smaller
          design tasks, that required a switch in the day to day mind.
        </p>
      </CaseSection>

      {/* Two Images Side by Side */}
      <section className="py-8">
        <Container maxWidth="container">
          <div className="grid md:grid-cols-2 gap-6">
            <div className="relative rounded-2xl overflow-hidden">
              <Image
                src="/images/valtech/vestas drawer.png"
                alt="Vestas drawer interface"
                width={800}
                height={600}
                className="w-full h-auto"
              />
            </div>
            <div className="relative rounded-2xl overflow-hidden">
              <Image
                src="/images/valtech/vestas drawer 2.png"
                alt="Vestas drawer interface detail"
                width={800}
                height={600}
                className="w-full h-auto"
              />
            </div>
          </div>
        </Container>
      </section>

      {/* Context & Problem Discovery Section */}
      <section className="py-16 md:py-24 bg-neutral-50">
        <Container maxWidth="container">
          <div className="grid md:grid-cols-2 gap-12 lg:gap-16 items-start">
            {/* Left - Content */}
            <div className="space-y-6 text-lg leading-relaxed text-neutral-700">
              <h2 className="text-3xl md:text-4xl font-bold text-black">Context</h2>
              <p>
                In the development of the two projects I actively participated in design sprint
                sessions with stakeholders to gather feedback and improve upon ongoing projects.
              </p>
              <p>
                Conducted user research, used both qualitative and quantitative methods like
                contextual inquiry, interview, and web analytics.
              </p>

              <ul className="space-y-3 mt-6">
                <li className="flex gap-3">
                  <span className="text-neutral-400">•</span>
                  <span>Mapping the research</span>
                </li>
                <li className="flex gap-3">
                  <span className="text-neutral-400">•</span>
                  <span>Journey mapping</span>
                </li>
                <li className="flex gap-3">
                  <span className="text-neutral-400">•</span>
                  <span>Wireframing</span>
                </li>
                <li className="flex gap-3">
                  <span className="text-neutral-400">•</span>
                  <span>Prototyping</span>
                </li>
                <li className="flex gap-3">
                  <span className="text-neutral-400">•</span>
                  <span>Validating the wireframes and different concepts to customers and stakeholders</span>
                </li>
              </ul>
            </div>

            {/* Right - Image */}
            <div className="relative rounded-2xl overflow-hidden">
              <Image
                src="/images/valtech/vestas 2.png"
                alt="Vestas project work"
                width={800}
                height={600}
                className="w-full h-auto"
              />
            </div>
          </div>
        </Container>
      </section>

      <RecommendationsSection
        recommendations={[
          {
            name: 'Johannes Wigh-Poulsen',
            pdfUrl: '/recommendations/reccomendation from Johannes Wigh-Poulsen.pdf',
          },
          {
            name: 'Helle Jensen',
            pdfUrl: '/recommendations/Recommendation from Helle Jensen.pdf',
          },
        ]}
      />
    </CaseStudyWrapper>
  );
}
