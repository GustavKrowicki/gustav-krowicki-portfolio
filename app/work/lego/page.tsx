import { Metadata } from 'next';
import Image from 'next/image';
import CaseStudyWrapper from '@/components/case-study/CaseStudyWrapper';
import CaseHeroAnimated from '@/components/case-study/CaseHeroAnimated';
import CaseSection from '@/components/case-study/CaseSection';
import TwoColumn from '@/components/case-study/TwoColumn';
import ChallengeMap from '@/components/interactive/ChallengeMap';
import Container from '@/components/ui/Container';
import { getProjectBySlug } from '@/lib/projects';

export const metadata: Metadata = {
  title: 'Designing for Autonomy in a Supervised System - LEGO',
  description: 'Designing an ML-assisted recommendation tool that protects user expertise while satisfying organizational oversight needs.',
};

export default function LegoPage() {
  const project = getProjectBySlug('lego');

  if (!project) {
    return <div>Project not found</div>;
  }

  return (
    <CaseStudyWrapper>
      <CaseHeroAnimated
        coverImage={project.coverImage}
        alt={project.title}
        objectFit="cover"
      />

      {/* Hero Info Section */}
      <section className="py-16 md:py-20">
        <Container maxWidth="container">
          <div className="max-w-4xl">
            <span className="inline-block px-3 py-1 bg-neutral-100 text-neutral-700 text-sm rounded-full mb-6">
              Contribution
            </span>
            <h1 className="text-5xl md:text-6xl font-bold mb-12">
              Designing for autonomy in a supervised system
            </h1>

            <div className="grid md:grid-cols-2 gap-8 lg:gap-12">
              <div className="space-y-4 text-lg leading-relaxed text-neutral-700">
                <p>
                  I worked on an ML-assisted recommendation tool where users generate
                  customer-specific recommendations while their supervisors generate
                  parallel lists with broader parameters.
                </p>
                <p>
                  The challenge wasn't just making ML understandable, it was designing
                  an interface that protected user expertise while satisfying
                  organizational oversight needs.
                </p>
              </div>
              <div className="space-y-4 text-lg leading-relaxed text-neutral-700">
                <p>
                  Users have direct customer knowledge that supervisors don't. The system
                  measures deviation between user and supervisor recommendations, creating
                  tension between individual expertise and organizational conformity.
                </p>
              </div>
            </div>
          </div>
        </Container>
      </section>

      <CaseSection title="Challenges" maxWidth="container" background="gray">
        <ChallengeMap />
      </CaseSection>

      <section className="py-16 md:py-24">
        <Container maxWidth="container">
          <div className="grid md:grid-cols-2 gap-12 lg:gap-16 items-start">
            <div className="space-y-6 text-lg leading-relaxed text-neutral-700">
              <h2 className="text-3xl md:text-4xl font-bold text-black">The political problem in the interface</h2>
              <p>
                Senior stakeholders wanted supervisor recommendations shown first, assuming
                users would take inspiration from them. But our research showed this would
                undermine the tool's value. Priming users with the supervisor's list would
                push them toward generic recommendations requiring more manual adjustment.
              </p>
              <p>
                We designed a solution where both recommendations generate simultaneously
                from the same action, removing the implicit hierarchy. We visually de-emphasized
                the supervisor's list and introduced it later in the workflow, after users
                engaged with their own recommendations.
              </p>
              <p>
                The compromise wasn't removing information, it was about timing and emphasis.
              </p>
            </div>
            <div className="relative rounded-2xl overflow-hidden">
              <Image
                src="/images/lego/shelf composition 1.png"
                alt="Shelf composition showing the political problem solution"
                width={1920}
                height={1080}
                className="w-full h-auto"
              />
            </div>
          </div>
        </Container>
      </section>

      <CaseSection title="Continuous feedback" maxWidth="content" background="gray">
        <TwoColumn
          left={
            <p>
              Through multiple conversations with stakeholders, we demonstrated that
              their goal (organizational alignment) and users' goal (customer-specific
              recommendations) could supplement each other if we sequenced information
              correctly.
            </p>
          }
          right={
            <p>
              The design work meant constant translation between research insights and
              stakeholder concerns. We prototyped solutions that gave ground to each
              side, making the case for designs prioritizing long-term user value over
              short-term organizational comfort.
            </p>
          }
        />
      </CaseSection>

      <section className="py-16 md:py-24">
        <Container maxWidth="container">
          <div className="grid md:grid-cols-2 gap-12 lg:gap-16 items-start">
            <div className="space-y-6 text-lg leading-relaxed text-neutral-700">
              <h2 className="text-3xl md:text-4xl font-bold text-black">Complexity</h2>
              <p>
                The model operates across multiple formats(child elements) simultaneously, adjusting
                recommendations up and down a hierarchy depending on settings—but users
                only see one format at a time. This created a fundamental disconnect
                between how the model worked and what users could observe.
              </p>
              <p>
                We designed around this mismatch by surfacing the right level of information
                at each step. Users needed to understand why they were seeing certain
                recommendations without grasping the entire system's complexity.
              </p>
              <p>
                The interface made the model's behavior legible without overwhelming users
                with everything happening behind the scenes.
              </p>
            </div>
            <div className="relative rounded-2xl overflow-hidden">
              <Image
                src="/images/lego/Shelf composition 2.png"
                alt="Shelf composition showing complexity management"
                width={1920}
                height={1080}
                className="w-full h-auto"
              />
            </div>
          </div>
        </Container>
      </section>

      <CaseSection title="Guiding input without restricting freedom" maxWidth="content" background="gray">
        <TwoColumn
          left={
            <p>
              We redesigned how users set parameters before generating recommendations.
              Early research showed users' settings often differed significantly from
              their supervisors', not wrong, but leading to more deviation and manual
              adjustment later.
            </p>
          }
          right={
            <p>
              The goal was getting users as far as possible with the initial
              recommendation, minimizing post-generation work. We focused on deliberate
              defaults, constraints, and explanations without removing the flexibility
              users needed to apply their expertise.
            </p>
          }
        />
      </CaseSection>

      <section className="py-8">
        <Container maxWidth="container">
          <div className="relative rounded-2xl overflow-hidden">
            <Image
              src="/images/lego/lego product selection .png"
              alt="Product selection interface for guiding input"
              width={1920}
              height={1080}
              className="w-full h-auto"
            />
          </div>
        </Container>
      </section>
    </CaseStudyWrapper>
  );
}
