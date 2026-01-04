import { Metadata } from 'next';
import Container from '@/components/ui/Container';
import Button from '@/components/ui/Button';
import InterestMap from '@/components/interactive/InterestMap';
import Bookshelf3D from '@/components/interactive/Bookshelf3D';

export const metadata: Metadata = {
  title: 'About',
  description: 'Product designer based in Copenhagen, Denmark, focused on research, ML/AI interfaces, and strategic thinking.',
};

export default function AboutPage() {
  return (
    <div className="py-24">
      <Container maxWidth="container">
        <h1 className="text-5xl md:text-6xl font-bold mb-12">About</h1>

        <div className="space-y-8 text-lg leading-relaxed text-neutral-700">
          <p>
            I'm a product designer based in Copenhagen, Denmark. I'm driven by curiosity
            about how people work and how technology can genuinely help them.
          </p>

          <p>
            Currently, I'm at LEGO designing internal tools that use machine learning
            to support creative work. This involves understanding complex workflows,
            translating ML capabilities into intuitive interfaces, and balancing
            stakeholder needs with technical constraints.
          </p>

          <p>
            Before LEGO, I co-founded Cate it, a platform connecting customers with
            local caterers. Building a product from zero taught me about marketplace
            dynamics, trust-building in two-sided platforms, and making strategic
            decisions with limited resources.
          </p>

          <p>
            I've also worked at Valtech on client projects including digital solutions
            for Vestas, where I contributed to research, journey mapping, and prototyping
            across multiple workstreams.
          </p>

          <h2 className="text-3xl font-bold mt-16 mb-6">My Approach</h2>

          <p>
            I believe good design starts with understanding the problem deeply.
            I spend time with users, ask questions, and look for patterns. I think
            strategically about business goals and technical constraints. And I try
            to keep solutions simple and focused.
          </p>

          <p>
            I'm particularly interested in the intersection of design and emerging
            technologies—not just making AI interfaces look good, but thinking through
            how these tools change workflows and what new patterns they enable.
          </p>

          <h2 className="text-3xl font-bold mt-16 mb-6">Interests & Skills</h2>

          <InterestMap />

          <h2 className="text-3xl font-bold mt-16 mb-6">Reading List</h2>

          <p className="mb-8">
            Books I've read recently. I'm interested in design, psychology, business strategy,
            and how technology shapes our work and lives.
          </p>

          <Bookshelf3D />

          <div className="mt-16 pt-8 border-t border-neutral-200">
            <h2 className="text-2xl font-bold mb-4">Currently</h2>
            <p className="mb-6">
              I'm working full-time at LEGO but always happy to chat about design,
              research, or interesting problems. Feel free to reach out.
            </p>

            <div className="flex flex-wrap gap-4">
              <Button href="/contact" variant="primary">
                Get in Touch
              </Button>
              <Button href="/cv/CV-Gustav-Krowicki.pdf" variant="secondary" external>
                Download CV
              </Button>
            </div>
          </div>
        </div>
      </Container>
    </div>
  );
}
