import { Metadata } from 'next';
import Container from '@/components/ui/Container';
import InterestMap from '@/components/interactive/InterestMap';
import Bookshelf3D from '@/components/interactive/Bookshelf3D';
import InterestCarousel from '@/components/interactive/InterestCarousel';
import TrackedSpotifyEmbed from '@/components/interactive/TrackedSpotifyEmbed';

export const metadata: Metadata = {
  title: 'About',
  description: 'Product designer based in Aarhus, Denmark, focused on research, ML/AI interfaces, and strategic thinking.',
};

export default function AboutPage() {
  // Placeholder images for interests
  const skiingImages = [
    {
      src: '/images/about/Ski 1.PNG',
      alt: 'Skiing in the mountains',
      caption: 'Skiing in the Alps',
    },
    {
      src: '/images/about/lunch ski.jpg',
      alt: 'Lunch break on the mountain',
      caption: 'Lunch on the slopes',
    },
    {
      src: '/images/about/Cheese.png',
      alt: 'Raclette after skiing',
      caption: 'Cheese break',
    },
  ];

  const footballImages = [
    {
      src: '/images/about/AGF 1.jpg',
      alt: 'AGF match day',
      caption: 'AGF home match',
    },
    {
      src: '/images/about/drengene i parken.jpg',
      alt: 'Cup final in Parken',
      caption: 'Cup final in Parken',
    },
    {
      src: '/images/about/Dortmund.png',
      alt: 'Dortmund trip',
      caption: 'Away day in Dortmund',
    },
  ];

  return (
    <div className="py-24">
      <Container maxWidth="container">
        {/* About + First Playlist */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 md:gap-16 mb-16 items-start">
          <div>
            <h1 className="text-5xl md:text-3xl font-bold mb-8">About</h1>
            <div className="space-y-6 text-lg leading-relaxed text-neutral-700">
              <p>
              I am a digital product designer currently based in Aarhus, Denmark. I am a  person, who likes to observe and discover, driven by a curious and positive mindset. I am finishing a master's in IT and Product Design at SDU in Kolding while working at the LEGO group on ML-assisted platform. My thesis argues that friction in interfaces is a design material worth keeping, a direct challenge to the assumption that easier is always better.
              </p>

          
            </div>
          </div>

          <div className="md:pt-20">
            <TrackedSpotifyEmbed
              src="https://open.spotify.com/embed/playlist/43WEe56nhD7k22nUzpMn10?utm_source=generator&theme=0"
              source="about_playlist_1"
            />
          </div>
        </div>

        {/* My Approach + Second Playlist */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 md:gap-16 mb-16 items-start">
          <div>
            <h2 className="text-5xl md:text-3xl font-bold mb-8">My Approach</h2>
            <div className="space-y-6 text-lg leading-relaxed text-neutral-700">
              <p>
              I thrive in complexity and systems thinking: understanding not just surface interactions, but the underlying structures that shape experiences. I spend my time understanding users and business goals, using whatever method fits best, qualitative or quantitative.
              </p>

              <p>Most of my projects have landed in places where things weren't settled yet. At LEGO I've been working inside the constraints of an ML-assisted product: data quality issues, algorithm behaviour, organisational priorities that shift mid-sprint. That kind of context forces you to get precise about what you actually know versus what you're assuming, and I've found I'm good at working in that gap.</p>

              <p>I've studied at 3 universities in Denmark, done semesters in Melbourne and Berlin, and worked across internships at Valtech, LEGO, and my own co-founded side project. None of it was a straight line, and I think that's made me comfortable with ambiguity and skeptical of the idea that there's only one right way to reach the goal.</p>

            

            </div>
          </div>

          <div className="md:pt-20">
            <TrackedSpotifyEmbed
              src="https://open.spotify.com/embed/playlist/6rpgDVWQUR93MLJ5fuz3sC?utm_source=generator"
              source="about_playlist_2"
            />
          </div>
        </div>

        <div className="space-y-8 text-lg leading-relaxed text-neutral-700">
          <h2 className="text-3xl font-bold mb-4">Interests & Skills</h2>

          <InterestMap />

          <h2 className="text-3xl font-bold mt-16 mb-6">Reading List</h2>

          <p className="mb-8">
            Books I've read recently. I'm interested in design, psychology
            and how technology shapes our work and lives.
          </p>

          <Bookshelf3D />

          <h2 className="text-3xl font-bold mt-16 mb-6">Beyond Work</h2>

          <p className="mb-8">
            When I'm not enjoying design, you'll find me on the slopes or on the stands cheering for my local football team.
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
