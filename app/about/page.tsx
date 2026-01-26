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
      alt: 'Drengene i Parken',
      caption: 'Drengene i Parken',
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
                I'm a digital product designer based in Aarhus, Denmark. I'm driven by curiosity
                about how people work and how technology can genuinely help them. Below you can learn a bit more about me and my approach to design.
              </p>

              <p>
                Currently, I'm at LEGO within the digital design team working with assortment and management. Besides work, i do care a bit about skiing, which involves a few trips during the winter of 26. When the mind is not on skiing, I'm have my ups and downs following the local footbal team from Aarhus, AGF. 
              </p>
            </div>
          </div>

          <div className="md:pt-20">
            <iframe
              style={{borderRadius: '12px'}}
              src="https://open.spotify.com/embed/playlist/43WEe56nhD7k22nUzpMn10?utm_source=generator&theme=0"
              width="100%"
              height="352"
              frameBorder="0"
              allowFullScreen
              allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
              loading="lazy"
            />
          </div>
        </div>

        {/* My Approach + Second Playlist */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 md:gap-16 mb-16 items-start">
          <div>
            <h2 className="text-5xl md:text-3xl font-bold mb-8">My Approach</h2>
            <div className="space-y-6 text-lg leading-relaxed text-neutral-700">
              <p>
             I thrive in complexity. I'm drawn to systems thinking, understanding not just surface interactions, but the underlying structures and connections that shape experiences. I see how parts relate to the whole, how workflows connect, and where leverage points for change exist. I spend my time understanding users and business goals, using whatever method fits best: sometimes qualitative conversations and observation, sometimes quantitative analysis and pattern-finding.
             </p>
             <p>
I'm particularly interested in the intersection of design and emerging technologies. Not just making AI interfaces look good, but thinking through how these tools reshape workflows, what new interaction patterns they enable, and what problems they actually solve. I try to stay open—open to complexity, open to different ways of understanding a problem, and open to solutions that might not fit conventional patterns. With two semesters abroad, three internships, and studies at three universities in Denmark, I'm certain that there's not only one way to reach the goal.
             </p>
            

            </div>
          </div>

          <div className="md:pt-20">
            <iframe
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
