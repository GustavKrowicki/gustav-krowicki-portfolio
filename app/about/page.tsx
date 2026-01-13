import { Metadata } from 'next';
import Container from '@/components/ui/Container';
import InterestMap from '@/components/interactive/InterestMap';
import Bookshelf3D from '@/components/interactive/Bookshelf3D';
import InterestCarousel from '@/components/interactive/InterestCarousel';

export const metadata: Metadata = {
  title: 'About',
  description: 'Product designer based in Aarhus, Denmark, focused on research, ML/AI interfaces, and strategic thinking.',
};

export default function AboutPage() {
  // Placeholder images for interests
  const skiingImages = [
    {
      src: '/images/interests/skiing/skiing-1.jpg',
      alt: 'Skiing in the mountains',
      caption: 'Skiing in the Alps',
    },
    {
      src: '/images/interests/skiing/skiing-2.jpg',
      alt: 'Powder skiing',
      caption: 'Fresh powder day',
    },
    {
      src: '/images/interests/skiing/skiing-3.jpg',
      alt: 'Ski resort view',
      caption: 'Mountain views',
    },
  ];

  const footballImages = [
    {
      src: '/images/interests/football/football-1.jpg',
      alt: 'BIF home game',
      caption: 'BIF home match',
    },
    {
      src: '/images/interests/football/football-2.jpg',
      alt: 'Stadium atmosphere',
      caption: 'Match day atmosphere',
    },
    {
      src: '/images/interests/football/football-3.jpg',
      alt: 'Celebrating with fans',
      caption: 'Celebrating with the fans',
    },
  ];

  return (
    <div className="py-24">
      <Container maxWidth="container">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 md:gap-16 mb-16">
          <div>
            <h1 className="text-5xl md:text-6xl font-bold mb-8">About</h1>
            <div className="space-y-6 text-lg leading-relaxed text-neutral-700">
              <p>
                I'm a product designer based in Aarhus, Denmark. I'm driven by curiosity
                about how people work and how technology can genuinely help them.
              </p>

              <p>
                Currently, I'm at LEGO designing internal tools that use machine learning
                to support creative work. This involves understanding complex workflows,
                translating ML capabilities into intuitive interfaces, and balancing
                stakeholder needs with technical constraints.
              </p>

            </div>
          </div>

          <div>
            <h2 className="text-5xl md:text-6xl font-bold mb-8">My Approach</h2>
            <div className="space-y-6 text-lg leading-relaxed text-neutral-700">
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
            </div>
          </div>
        </div>

        <div className="space-y-8 text-lg leading-relaxed text-neutral-700">
          <h2 className="text-3xl font-bold mb-8">Interests & Skills</h2>

          <InterestMap />

          <h2 className="text-3xl font-bold mt-16 mb-6">Reading List</h2>

          <p className="mb-8">
            Books I've read recently. I'm interested in design, psychology, business strategy,
            and how technology shapes our work and lives.
          </p>

          <Bookshelf3D />

          <h2 className="text-3xl font-bold mt-16 mb-4">Music</h2>

          <p className="mb-8">
            Playlists I'm currently listening to. Music helps me focus and sets the mood for different types of work.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <iframe
              data-testid="embed-iframe"
              style={{borderRadius: '12px'}}
              src="https://open.spotify.com/embed/playlist/43WEe56nhD7k22nUzpMn10?utm_source=generator&theme=0"
              width="100%"
              height="352"
              frameBorder="0"
              allowFullScreen
              allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
              loading="lazy"
            />
            <iframe
              data-testid="embed-iframe"
              style={{borderRadius: '12px'}}
              src="https://open.spotify.com/embed/playlist/6rpgDVWQUR93MLJ5fuz3sC?utm_source=generator"
              width="100%"
              height="352"
              frameBorder="0"
              allowFullScreen
              allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
              loading="lazy"
            />
          </div>

          <h2 className="text-3xl font-bold mt-16 mb-6">Beyond Work</h2>

          <p className="mb-8">
            When I'm not designing, you'll find me on the slopes or cheering for my local football team.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
            <InterestCarousel title="Skiing" images={skiingImages} />
            <InterestCarousel title="Football" images={footballImages} />
          </div>
        </div>
      </Container>
    </div>
  );
}
