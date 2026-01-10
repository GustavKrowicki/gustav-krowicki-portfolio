import { Metadata } from 'next';
import CaseStudyWrapper from '@/components/case-study/CaseStudyWrapper';
import CaseHeroAnimated from '@/components/case-study/CaseHeroAnimated';
import CaseSection from '@/components/case-study/CaseSection';
import TwoColumn from '@/components/case-study/TwoColumn';
import InsightCards from '@/components/case-study/InsightCards';
import StrategicDecisions from '@/components/case-study/StrategicDecisions';
import Container from '@/components/ui/Container';
import { getProjectBySlug } from '@/lib/projects';

export const metadata: Metadata = {
  title: 'Building a Two-Sided Marketplace - Cate it',
  description: 'Co-founded and designed a platform connecting event planners with food trucks',
};

export default function CateItPage() {
  const project = getProjectBySlug('cate-it');

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
              Co-founder, Product Designer
            </span>
            <h1 className="text-5xl md:text-6xl font-bold mb-8">
              Building a two-sided marketplace with real constraints
            </h1>

            <div className="flex flex-wrap gap-x-8 gap-y-2 text-lg text-neutral-600 mb-12">
              <div>
                <span className="font-medium">Team:</span> Anders (Front-end), Johannes (Full-stack)
              </div>
            </div>

            <div className="space-y-4 text-lg leading-relaxed text-neutral-700 max-w-2xl">
              <p>
                Food truck owners struggle to get booked for events. Event planners don't
                have a reliable way to find and book food trucks. Existing solutions are
                either generic event platforms or require upfront subscriptions that don't
                work for seasonal small businesses.
              </p>
            </div>
          </div>
        </Container>
      </section>

      <CaseSection title="Why existing solutions don't work for food truck owners" maxWidth="content" background="gray">
        <p>
          Food truck businesses are highly seasonal. Revenue drops significantly in winter
          months. Any fixed monthly cost—like a subscription—becomes a real burden when
          cash flow is tight. Existing platforms don't account for this reality, making
          them unattractive to the very people they're trying to serve.
        </p>
      </CaseSection>

      <CaseSection 
        title="Research and insights" 
        maxWidth="container"
        className="bg-[#2C2929] [&_h2]:text-white"
      >
        <InsightCards
          cards={[
            {
              header: 'Seasonality is a real concern',
              text: 'Eight conversations with food truck owners revealed consistent patterns. January and February are slow months. Any fat in the budget during winter is a problem. Fixed costs don\'t work for this business model.',
              backgroundColor: 'yellow',
            },
            {
              header: 'The community is welcoming',
              text: 'Food truck owners remember what it\'s like starting out. They\'re happy to refer you to others in the space. This openness gave us access to more conversations and validated that there\'s genuine interest in solving this problem.',
              backgroundColor: 'orange',
            },
            {
              header: 'They\'re okay with manual processes',
              text: 'Food truck owners were surprisingly comfortable with bookings going through their email rather than a fancy platform. This insight let us de-risk the launch with a simpler MVP.',
              backgroundColor: 'cream',
            },
          ]}
        />
      </CaseSection>

      <section className="py-16 md:py-24">
        <Container maxWidth="container">
          <StrategicDecisions
            header="STRATEGIC DECISIONS"
            leftTitle="How we learned"
            leftText="We initially planned a subscription model—predictable revenue for us, clear value prop for them. But research with food truck owners showed this wouldn't work given their seasonal cash flow."
            rightTitle="The insight and choice we made"
            rightText="We pivoted to a percentage fee per booking, charged to both food truck owners and event planners. No fixed costs. The platform only makes money when they make money. This aligns our incentives with theirs and removes the barrier that would've prevented sign-ups."
          />
        </Container>
      </section>

      <section className="py-16 md:py-24">
        <Container maxWidth="container">
          <div className="grid md:grid-cols-2 gap-8 lg:gap-16 items-start">
            {/* Left Column - Content */}
            <div className="space-y-6 text-lg leading-relaxed text-neutral-700">
              <h2 className="text-3xl md:text-4xl font-bold text-black">Design solution</h2>
              <p>
                We built a simple email form that redirects booking information to the food
                truck owner's inbox. No complex booking flow yet. No payment processing. Just
                enough to test if the value proposition works.
              </p>
              <p>
                The site is live at cateit.com with four food trucks signed up. We're focusing
                on supply-side first—getting food trucks on the platform before pushing hard
                on event planner acquisition.
              </p>

              <div className="mt-8">
                <h3 className="font-semibold text-xl mb-4">Design compromises we made</h3>
                <ul className="space-y-3 text-neutral-700">
                  <li className="flex gap-3">
                    <span className="text-neutral-400">•</span>
                    <span>The site uses a modular system limited to five components across all pages—faster to build, but limits flexibility</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="text-neutral-400">•</span>
                    <span>Food truck editing is in a modal instead of a drawer</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="text-neutral-400">•</span>
                    <span>Landing page is more generic than ideal—we cut location-specific carousels to ship faster</span>
                  </li>
                </ul>
              </div>

              <p className="mt-8">
                More interested? Take a look at{' '}
                <a
                  href="https://cateit.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline"
                >
                  cateit.com
                </a>
              </p>
            </div>

            {/* Right Column - Image Placeholder */}
            <div className="bg-neutral-100 rounded-2xl aspect-[4/3] flex items-center justify-center">
              <span className="text-neutral-400 text-sm">Image placeholder</span>
            </div>
          </div>
        </Container>
      </section>

      <CaseSection title="Current status" maxWidth="content" background="gray">
        <div className="space-y-6">
          <div>
            <h3 className="font-semibold text-xl mb-3">Where we are now (pre soft-launch)</h3>
            <p>
              Site is live with food trucks listed. We haven't done the marketing push yet.
              Next step is building out the full booking flow and onboarding more trucks.
            </p>
          </div>

          <div>
            <h3 className="font-semibold text-xl mb-3">What we've learned about launching</h3>
            <p>
              Building a marketplace part-time across three cities is hard. We've had to
              align three different motivations: one person wants it on their CV, one sees
              it as a hobby, and I want it to become my job. We've learned where to cut
              corners and where not to.
            </p>
          </div>

          <div>
            <h3 className="font-semibold text-xl mb-3">Next priorities</h3>
            <ul className="space-y-2 text-neutral-700">
              <li className="flex gap-3">
                <span className="text-neutral-400">•</span>
                <span>Complete the booking flow with payment processing</span>
              </li>
              <li className="flex gap-3">
                <span className="text-neutral-400">•</span>
                <span>Validate pricing through early bookings</span>
              </li>
              <li className="flex gap-3">
                <span className="text-neutral-400">•</span>
                <span>Push marketing to get more food trucks on board</span>
              </li>
              <li className="flex gap-3">
                <span className="text-neutral-400">•</span>
                <span>Test whether we can generate enough demand to make the marketplace viable</span>
              </li>
            </ul>
          </div>
        </div>
      </CaseSection>
    </CaseStudyWrapper>
  );
}
