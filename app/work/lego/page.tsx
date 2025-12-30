import { Metadata } from 'next';
import CaseHero from '@/components/case-study/CaseHero';
import CaseSection from '@/components/case-study/CaseSection';
import MetaInfo from '@/components/case-study/MetaInfo';
import ProcessStep from '@/components/case-study/ProcessStep';
import QuoteBlock from '@/components/case-study/QuoteBlock';
import { getProjectBySlug } from '@/lib/projects';

export const metadata: Metadata = {
  title: 'ML-Assisted Internal Product - LEGO',
  description: 'Conducted research and designed interfaces for an ML-powered tool at LEGO',
};

export default function LegoPage() {
  const project = getProjectBySlug('lego');

  if (!project) {
    return <div>Project not found</div>;
  }

  return (
    <div>
      <CaseHero
        title={project.title}
        role={project.role}
        timeline={project.timeline}
        coverImage={project.coverImage}
        tags={project.tags}
      />

      <CaseSection title="Overview" maxWidth="content">
        <p>
          At LEGO, I'm designing an internal tool that uses machine learning to assist
          product designers in their creative work. This project sits at the intersection
          of AI capabilities, creative workflows, and organizational constraints.
        </p>
        <p>
          The challenge isn't just about making ML accessible—it's about understanding
          how designers work, what they need from AI assistance, and how to build trust
          in algorithmic recommendations within a highly iterative creative process.
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
            <h3 className="text-2xl font-semibold mb-4">The Challenge</h3>
            <p className="text-neutral-700 leading-relaxed mb-4">
              Designing for ML-assisted tools requires balancing multiple constraints:
              the uncertainty of algorithm outputs, the expectations of creative professionals,
              stakeholder needs, and organizational priorities.
            </p>
            <p className="text-neutral-700 leading-relaxed">
              This isn't a traditional interface design problem—it requires understanding
              complex workflows, building trust in AI systems, and designing for scenarios
              where the algorithm might fail or produce unexpected results.
            </p>
          </div>
        </div>
      </CaseSection>

      <CaseSection title="Research & Discovery" maxWidth="content">
        <p>
          I started by conducting user interviews with product designers across different
          teams to understand their current workflows, pain points, and attitudes toward
          AI-assisted tools.
        </p>

        <QuoteBlock
          quote="I don't want the tool to design for me. I want it to help me explore possibilities faster."
          author="Senior Product Designer"
        />

        <p>
          Key insights emerged around trust, control, and transparency. Designers were
          open to ML assistance but skeptical about 'black box' systems. They needed to
          understand why the algorithm made certain suggestions and maintain control over
          the final decisions.
        </p>

        <p>
          I also spent time with ML engineers to understand the capabilities and limitations
          of the underlying models. This helped me design interfaces that set appropriate
          expectations and gracefully handle edge cases.
        </p>
      </CaseSection>

      <CaseSection title="Process" maxWidth="content" background="gray">
        <div className="space-y-8">
          <ProcessStep
            number={1}
            title="User Research"
            description="Conducted interviews with 12 product designers to understand workflows, pain points, and attitudes toward AI assistance. Shadowed designers to observe their creative process and identify opportunities for ML support."
          />

          <ProcessStep
            number={2}
            title="Technical Discovery"
            description="Worked closely with ML engineers to understand model capabilities, limitations, and failure modes. This informed realistic interface design and appropriate user expectations."
          />

          <ProcessStep
            number={3}
            title="Concept Exploration"
            description="Created multiple interface concepts exploring different approaches to surfacing ML recommendations. Tested these with users through rapid prototyping and feedback sessions."
          />

          <ProcessStep
            number={4}
            title="Iterative Design"
            description="Refined the interface based on user feedback, focusing on transparency, control, and trust-building. Designed for both successful predictions and edge cases where the algorithm struggles."
          />
        </div>
      </CaseSection>

      <CaseSection title="Design Approach" maxWidth="content">
        <h3 className="text-2xl font-semibold mb-4">Transparency & Control</h3>
        <p>
          The interface makes ML recommendations visible but never automatic. Designers can
          see why the algorithm made a suggestion, adjust parameters, and always maintain
          final control over decisions.
        </p>

        <h3 className="text-2xl font-semibold mb-4 mt-8">Progressive Disclosure</h3>
        <p>
          Rather than overwhelming users with all ML capabilities at once, the interface
          progressively reveals features as users gain confidence. This helps build trust
          and prevents cognitive overload.
        </p>

        <h3 className="text-2xl font-semibold mb-4 mt-8">Graceful Degradation</h3>
        <p>
          The tool is designed to work even when ML predictions are uncertain or unavailable.
          This ensures designers can continue their work without disruption while the system
          learns and improves.
        </p>
      </CaseSection>

      <CaseSection title="Impact & Learnings" maxWidth="content" background="gray">
        <p>
          This project reinforced that designing for ML isn't about hiding complexity—it's
          about making it understandable and controllable. Creative professionals want tools
          that augment their thinking, not replace it.
        </p>

        <p>
          Working across disciplines (design, engineering, product) highlighted the importance
          of shared language and mental models. Many challenges came from misaligned expectations
          about what the tool should do and how users would interact with it.
        </p>

        <p>
          The most valuable insight: building trust in AI tools requires transparency about
          both capabilities and limitations. Users appreciate honesty about when the algorithm
          isn't confident, which paradoxically increases their overall trust in the system.
        </p>
      </CaseSection>
    </div>
  );
}
