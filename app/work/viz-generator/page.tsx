import { Metadata } from 'next';
import CaseStudyWrapper from '@/components/case-study/CaseStudyWrapper';
import CaseHeroAnimated from '@/components/case-study/CaseHeroAnimated';
import CaseSection from '@/components/case-study/CaseSection';
import WorkflowDiagram from '@/components/interactive/WorkflowDiagram';
import Container from '@/components/ui/Container';
import { getProjectBySlug } from '@/lib/projects';

export const metadata: Metadata = {
  title: 'Data Visualization Generator',
  description: 'Built a tool to generate custom data visualizations from user inputs',
};

export default function VizGeneratorPage() {
  const project = getProjectBySlug('viz-generator');

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
          <div className="max-w-4xl">
            <span className="inline-block px-3 py-1 bg-neutral-100 text-neutral-700 text-sm rounded-full mb-6">
              {project.role}
            </span>
            <h1 className="text-5xl md:text-6xl font-bold mb-8">
              {project.title}
            </h1>
          </div>
        </Container>
      </section>

      {/* Needs Section */}
      <CaseSection title="Needs" maxWidth="content">
        <p>
          Cate it needed a clear visual identity to establish trust in a marketplace
          context—where the sender of every communication needs to be immediately
          recognizable. I'd been curating a moodboard on Are.na with visual directions
          that could work for the brand, but my illustration skills are limited.
        </p>
        <p>
          Rather than following the traditional approach, I saw an opportunity to
          experiment with AI image generation models to create branded visuals, social
          media content, and illustrations by mixing references from my moodboard.
        </p>
      </CaseSection>

      {/* How It Works - Interactive Workflow */}
      <CaseSection title="How It Works" maxWidth="container" background="gray">
        <WorkflowDiagram />
      </CaseSection>

      {/* How I Built It Section */}
      <CaseSection title="How I Built It" maxWidth="content">
        <p>
          I started on Replit, an app builder that handles both front-end and back-end
          infrastructure. I've worked with similar tools before (like Webflow for my
          previous portfolio), but Replit's strength is integrations—which made connecting
          to my Are.na moodboard straightforward. For image generation, I integrated
          Google's models through Replit's built-in AI integration, which simplified billing.
        </p>
        <p>
          With the integrations running, I focused on the interface. I've been interested
          in node-based interactions lately, particularly for AI tools—I like working with
          visual references, and nodes let me connect and compare multiple variations easily.
          I used React Flow to build the interface on Replit.
        </p>
        <p>
          The tool worked, but I didn't want to keep paying $25/month for Replit hosting.
          I used Claude Code to restructure the architecture and migrate the app to my own
          infrastructure—my own database, my own Google AI Studio billing, my own hosting.
          I wanted to own the tool, not depend on a platform.
        </p>
      </CaseSection>

      {/* Gallery Section */}
      <section className="py-16 md:py-24 bg-neutral-50">
        <Container maxWidth="container">
          <h2 className="text-3xl md:text-4xl font-bold mb-12">Generated visuals</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
            <div className="bg-neutral-200 rounded-xl aspect-square flex items-center justify-center">
              <span className="text-neutral-400 text-sm">Image 1</span>
            </div>
            <div className="bg-neutral-200 rounded-xl aspect-square flex items-center justify-center">
              <span className="text-neutral-400 text-sm">Image 2</span>
            </div>
            <div className="bg-neutral-200 rounded-xl aspect-square flex items-center justify-center">
              <span className="text-neutral-400 text-sm">Image 3</span>
            </div>
            <div className="bg-neutral-200 rounded-xl aspect-square flex items-center justify-center">
              <span className="text-neutral-400 text-sm">Image 4</span>
            </div>
            <div className="bg-neutral-200 rounded-xl aspect-square flex items-center justify-center">
              <span className="text-neutral-400 text-sm">Image 5</span>
            </div>
            <div className="bg-neutral-200 rounded-xl aspect-square flex items-center justify-center">
              <span className="text-neutral-400 text-sm">Image 6</span>
            </div>
          </div>
        </Container>
      </section>
    </CaseStudyWrapper>
  );
}
