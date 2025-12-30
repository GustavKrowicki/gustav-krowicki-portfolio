import { Metadata } from 'next';
import CaseHero from '@/components/case-study/CaseHero';
import CaseSection from '@/components/case-study/CaseSection';
import MetaInfo from '@/components/case-study/MetaInfo';
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
    <div>
      <CaseHero
        title={project.title}
        role={project.role}
        timeline={project.timeline}
        coverImage={project.coverImage}
        tags={project.tags}
      />

      <CaseSection title="The Problem" maxWidth="content">
        <p>
          Creating custom data visualizations often requires either design skills to use
          tools like Figma or coding knowledge to work with libraries like D3.js. This
          creates a barrier for people who have data insights they want to communicate
          but lack the technical or design skills to visualize them effectively.
        </p>
        <p>
          I wanted to build a tool that bridges this gap—allowing users to generate
          professional-looking visualizations through an intuitive interface without
          needing to code or master complex design software.
        </p>
      </CaseSection>

      <CaseSection background="gray">
        <div className="grid md:grid-cols-3 gap-8">
          <MetaInfo
            role={project.role}
            timeline={project.timeline}
            tools={project.tools}
          />
          <div className="md:col-span-2">
            <h3 className="text-2xl font-semibold mb-4">The Approach</h3>
            <p className="text-neutral-700 leading-relaxed mb-4">
              This project combined design thinking with technical implementation. I needed
              to understand how people think about data visualization, design an interface
              that made complex capabilities accessible, and build it using React and D3.js.
            </p>
            <p className="text-neutral-700 leading-relaxed">
              The challenge was creating something flexible enough for diverse use cases
              but simple enough that anyone could pick it up without a tutorial.
            </p>
          </div>
        </div>
      </CaseSection>

      <CaseSection title="Design Process" maxWidth="content">
        <h3 className="text-2xl font-semibold mb-4">Understanding User Needs</h3>
        <p>
          I started by interviewing people who regularly create visualizations—analysts,
          researchers, students—to understand their workflows and pain points. Common
          themes emerged around simplicity, customization, and export options.
        </p>

        <h3 className="text-2xl font-semibold mb-4 mt-8">Interface Design</h3>
        <p>
          The interface needed to balance power with simplicity. I organized controls
          into logical groups (data input, visualization type, styling) and used
          progressive disclosure to avoid overwhelming users with options upfront.
        </p>

        <p>
          Live preview was crucial—users could see changes immediately as they adjusted
          parameters, making the tool feel responsive and allowing for rapid iteration.
        </p>

        <h3 className="text-2xl font-semibold mb-4 mt-8">Visualization Types</h3>
        <p>
          Rather than supporting every possible chart type, I focused on a core set
          of versatile visualizations: bar charts, line graphs, scatter plots, and
          simple network diagrams. This kept the tool manageable while covering most
          common use cases.
        </p>
      </CaseSection>

      <CaseSection title="Technical Implementation" maxWidth="content" background="gray">
        <h3 className="text-2xl font-semibold mb-4">Tech Stack</h3>
        <p>
          Built with React for the interface and D3.js for visualization rendering.
          This combination provided flexibility—D3's powerful data manipulation and
          SVG generation combined with React's component architecture and state management.
        </p>

        <h3 className="text-2xl font-semibold mb-4 mt-8">Data Processing</h3>
        <p>
          Users could input data in multiple formats (CSV, JSON, manual entry). The tool
          validates data, suggests appropriate visualization types based on data structure,
          and handles common formatting issues gracefully.
        </p>

        <h3 className="text-2xl font-semibold mb-4 mt-8">Export Options</h3>
        <p>
          Visualizations can be exported as PNG images or SVG files, making them suitable
          for presentations, reports, or further editing in design tools. This flexibility
          was essential for practical use.
        </p>
      </CaseSection>

      <CaseSection title="Key Features" maxWidth="content">
        <div className="space-y-6">
          <div className="bg-neutral-50 p-6 rounded-lg">
            <h3 className="font-semibold text-xl mb-2">Real-time Preview</h3>
            <p className="text-neutral-700">
              All changes are reflected immediately in the preview, allowing users to
              experiment and iterate quickly without waiting for renders.
            </p>
          </div>

          <div className="bg-neutral-50 p-6 rounded-lg">
            <h3 className="font-semibold text-xl mb-2">Smart Defaults</h3>
            <p className="text-neutral-700">
              The tool suggests appropriate visualization types based on data structure
              and applies sensible default styling, reducing the decisions users need
              to make.
            </p>
          </div>

          <div className="bg-neutral-50 p-6 rounded-lg">
            <h3 className="font-semibold text-xl mb-2">Customization Controls</h3>
            <p className="text-neutral-700">
              Users can adjust colors, labels, axes, and styling to match their needs
              or brand guidelines without writing code.
            </p>
          </div>

          <div className="bg-neutral-50 p-6 rounded-lg">
            <h3 className="font-semibold text-xl mb-2">Responsive Output</h3>
            <p className="text-neutral-700">
              Visualizations adapt to different screen sizes, ensuring they look good
              whether viewed on mobile, desktop, or printed.
            </p>
          </div>
        </div>
      </CaseSection>

      <CaseSection title="Learnings & Outcomes" maxWidth="content" background="gray">
        <p>
          This project reinforced that good tool design requires deep understanding of
          both the domain and the users. Data visualization has its own vocabulary and
          conventions—respecting these while making them accessible was key.
        </p>

        <p>
          Balancing flexibility with simplicity is always a challenge. I learned to
          identify the 20% of features that deliver 80% of value and focus there,
          rather than trying to support every edge case from day one.
        </p>

        <p>
          Most importantly, combining design and development skills allowed me to iterate
          quickly and make holistic decisions. Understanding the technical constraints
          informed better design choices, and design thinking led to cleaner code architecture.
        </p>
      </CaseSection>
    </div>
  );
}
