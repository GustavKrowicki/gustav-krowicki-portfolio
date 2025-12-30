import { Metadata } from 'next';
import CaseHero from '@/components/case-study/CaseHero';
import CaseSection from '@/components/case-study/CaseSection';
import MetaInfo from '@/components/case-study/MetaInfo';
import QuoteBlock from '@/components/case-study/QuoteBlock';
import { getProjectBySlug } from '@/lib/projects';

export const metadata: Metadata = {
  title: 'Cate it - Food Catering Platform',
  description: 'Co-founded and designed a platform connecting customers with local caterers',
};

export default function CateItPage() {
  const project = getProjectBySlug('cate-it');

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

      <CaseSection title="The Vision" maxWidth="content">
        <p>
          Cate it started from a simple observation: ordering catering for events is
          unnecessarily complicated. Small businesses and individuals struggle to find
          reliable local caterers, compare offerings, and build trust with vendors
          they've never worked with before.
        </p>
        <p>
          My co-founder and I set out to build a platform that would make catering
          accessible and trustworthy—connecting customers with local caterers while
          solving the core challenges of a two-sided marketplace.
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
              Building a marketplace requires solving chicken-and-egg problems: customers
              won't use a platform without caterers, and caterers won't join without
              customers. Beyond that, we had to establish trust, handle payments securely,
              and design an experience that worked for both sides.
            </p>
            <p className="text-neutral-700 leading-relaxed">
              As a bootstrapped startup, every decision had to balance user needs with
              technical constraints and business viability.
            </p>
          </div>
        </div>
      </CaseSection>

      <CaseSection title="Research & Insights" maxWidth="content">
        <p>
          We conducted interviews with both potential customers and caterers to understand
          their pain points and needs. Three key themes emerged:
        </p>

        <div className="my-8 space-y-6">
          <div className="bg-neutral-50 p-6 rounded-lg">
            <h3 className="font-semibold text-xl mb-2">Trust & Transparency</h3>
            <p className="text-neutral-700">
              Customers needed social proof and clear information before committing. Reviews,
              photos of previous work, and transparent pricing were essential for building
              confidence.
            </p>
          </div>

          <div className="bg-neutral-50 p-6 rounded-lg">
            <h3 className="font-semibold text-xl mb-2">Commitment & Communication</h3>
            <p className="text-neutral-700">
              Both sides wanted clear expectations around booking, changes, and cancellations.
              Good communication tools reduced uncertainty and improved the experience.
            </p>
          </div>

          <div className="bg-neutral-50 p-6 rounded-lg">
            <h3 className="font-semibold text-xl mb-2">Payment Security</h3>
            <p className="text-neutral-700">
              Handling money was sensitive for both parties. Customers wanted protection
              until service delivery; caterers wanted guarantee of payment for confirmed
              bookings.
            </p>
          </div>
        </div>
      </CaseSection>

      <CaseSection title="Product Strategy" maxWidth="content" background="gray">
        <h3 className="text-2xl font-semibold mb-4">MVP Focus</h3>
        <p>
          Rather than building everything at once, we focused on the core transaction flow:
          browsing caterers, requesting quotes, and confirming bookings. This let us validate
          the concept quickly and learn from real users.
        </p>

        <h3 className="text-2xl font-semibold mb-4 mt-8">Business Model</h3>
        <p>
          We chose a commission-based model that only charged caterers when they completed
          bookings. This aligned incentives—we only succeeded when they succeeded—and made
          it easy for caterers to try the platform without upfront costs.
        </p>

        <QuoteBlock
          quote="Starting with an MVP taught me the importance of ruthless prioritization. Every feature idea had to justify itself against our limited resources."
        />
      </CaseSection>

      <CaseSection title="Design Decisions" maxWidth="content">
        <h3 className="text-2xl font-semibold mb-4">Building Trust</h3>
        <p>
          We prominently featured caterer profiles with photos, menus, reviews, and
          clear pricing. This transparency helped customers make informed decisions
          and reduced pre-booking anxiety.
        </p>

        <h3 className="text-2xl font-semibold mb-4 mt-8">Quote-Based Flow</h3>
        <p>
          Instead of instant booking, we designed a quote-request flow that gave caterers
          flexibility to customize offerings and pricing. This matched how catering actually
          works—each event is somewhat unique—while still providing structure and clarity.
        </p>

        <h3 className="text-2xl font-semibold mb-4 mt-8">Mobile-First</h3>
        <p>
          Many customers browsed on mobile while planning events, and caterers needed to
          respond to requests quickly. We designed mobile-first, ensuring core flows worked
          well on small screens.
        </p>
      </CaseSection>

      <CaseSection title="Learnings & Reflections" maxWidth="content" background="gray">
        <p>
          Co-founding Cate it taught me as much about business strategy and resource
          constraints as it did about design. Every decision involved trade-offs: what
          could we build quickly vs. what would users really need? How could we grow
          both sides of the marketplace simultaneously?
        </p>

        <p>
          The experience reinforced that good product design isn't just about interfaces—it's
          about understanding the business model, the market dynamics, and how all the pieces
          fit together. It's okay to start simple and iterate based on real user feedback.
        </p>

        <p>
          Most importantly, I learned that constraints can be clarifying. Limited resources
          forced us to focus on what truly mattered, resulting in a leaner, more focused
          product than if we'd tried to build everything at once.
        </p>
      </CaseSection>
    </div>
  );
}
