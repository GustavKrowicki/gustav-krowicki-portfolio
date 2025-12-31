import { Metadata } from 'next';
import CaseStudyWrapper from '@/components/case-study/CaseStudyWrapper';
import CaseHeroAnimated from '@/components/case-study/CaseHeroAnimated';
import CaseInfo from '@/components/case-study/CaseInfo';
import CaseSection from '@/components/case-study/CaseSection';
import MetaInfo from '@/components/case-study/MetaInfo';
import QuoteBlock from '@/components/case-study/QuoteBlock';
import { getProjectBySlug } from '@/lib/projects';

export const metadata: Metadata = {
  title: 'Valtech Internship Projects',
  description: 'Client work on digital solutions including research, prototyping, and design systems',
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

      <CaseInfo
        title={project.title}
        role={project.role}
        timeline={project.timeline}
        tags={project.tags}
      />

      <CaseSection title="Overview" maxWidth="content">
        <p>
          During my internship at Valtech, I worked on multiple client projects spanning
          research, design, and prototyping. This experience gave me exposure to enterprise
          product development, cross-functional collaboration, and the consultancy approach
          to solving complex business challenges.
        </p>
        <p>
          My primary project was supporting digital solutions for Vestas, a global leader
          in wind energy. I contributed across multiple workstreams—from early research
          to interface design and prototyping.
        </p>
      </CaseSection>

      <CaseSection background="gray">
        <div className="grid md:grid-cols-3 gap-8">
          <MetaInfo
            role={project.role}
            timeline={project.timeline}
            tools={project.tools}
            team={project.team}
          />
          <div className="md:col-span-2">
            <h3 className="text-2xl font-semibold mb-4">The Context</h3>
            <p className="text-neutral-700 leading-relaxed mb-4">
              Working at a consultancy meant balancing client needs, stakeholder expectations,
              and technical constraints while maintaining quality design standards. Projects
              moved quickly, requiring adaptability and clear communication.
            </p>
            <p className="text-neutral-700 leading-relaxed">
              I learned to navigate complex stakeholder landscapes, present work effectively,
              and contribute meaningfully to projects I joined mid-stream.
            </p>
          </div>
        </div>
      </CaseSection>

      <CaseSection title="Key Activities" maxWidth="content">
        <h3 className="text-2xl font-semibold mb-4">User Research</h3>
        <p>
          Conducted interviews with field technicians and operations managers to understand
          their workflows and pain points. This research informed our understanding of how
          digital tools could better support their daily work.
        </p>
        <p>
          I learned to synthesize insights from diverse user groups and translate them into
          actionable design requirements that resonated with both users and stakeholders.
        </p>

        <h3 className="text-2xl font-semibold mb-4 mt-8">Journey Mapping</h3>
        <p>
          Created detailed journey maps documenting current-state workflows and identifying
          opportunities for improvement. These artifacts became crucial alignment tools,
          helping stakeholders visualize the user experience and prioritize features.
        </p>

        <h3 className="text-2xl font-semibold mb-4 mt-8">Wireframing & Prototyping</h3>
        <p>
          Developed wireframes and interactive prototypes to explore different solutions
          and gather feedback. I learned to balance fidelity with speed—knowing when rough
          sketches were sufficient vs. when polished prototypes helped communicate ideas.
        </p>

        <QuoteBlock
          quote="Gustav quickly understood our complex domain and contributed meaningful insights that shaped the product direction."
          author="Senior Design Lead, Valtech"
        />
      </CaseSection>

      <CaseSection title="Projects & Contributions" maxWidth="content" background="gray">
        <h3 className="text-2xl font-semibold mb-4">Vestas Digital Solutions</h3>
        <p>
          Supported design work for internal tools used by wind turbine technicians and
          operations teams. Focused on making complex technical information accessible
          and creating mobile-friendly interfaces for field use.
        </p>

        <h3 className="text-2xl font-semibold mb-4 mt-8">Design System Work</h3>
        <p>
          Contributed to evolving the design system, creating component documentation
          and ensuring consistency across multiple product workstreams. This taught me
          the importance of systematic thinking and design at scale.
        </p>

        <h3 className="text-2xl font-semibold mb-4 mt-8">Stakeholder Workshops</h3>
        <p>
          Participated in and helped facilitate workshops with client stakeholders to
          align on product vision, gather requirements, and validate design directions.
          These sessions taught me how to navigate different perspectives and build
          consensus.
        </p>
      </CaseSection>

      <CaseSection title="Learnings" maxWidth="content">
        <p>
          Working at Valtech showed me the consultancy side of product design—how to quickly
          understand new domains, work effectively with client teams, and deliver value
          within tight timelines.
        </p>

        <p>
          I learned that enterprise products have unique constraints: legacy systems, complex
          stakeholder landscapes, and diverse user groups with sometimes conflicting needs.
          Good design in this context requires diplomacy, clear communication, and strategic
          thinking about what's feasible.
        </p>

        <p>
          The experience also reinforced the value of research and documentation. In fast-paced
          projects with rotating team members, clear artifacts (journey maps, research findings,
          design systems) become essential for maintaining continuity and alignment.
        </p>

        <p>
          Most importantly, I saw how design can create business value when aligned with
          organizational goals. The best designs weren't just beautiful interfaces—they were
          solutions that addressed real user needs while supporting strategic business objectives.
        </p>
      </CaseSection>
    </CaseStudyWrapper>
  );
}
