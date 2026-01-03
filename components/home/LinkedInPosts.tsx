'use client';

import dynamic from 'next/dynamic';
import Container from '@/components/ui/Container';

// Dynamically import PDFViewer to avoid SSR issues
const PDFViewer = dynamic(() => import('./PDFViewer'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-96">
      <p className="text-neutral-500">Loading PDF viewer...</p>
    </div>
  ),
});

interface Post {
  type: 'linkedin' | 'pdf';
  embedUrl: string;
  title?: string;
}

const posts: Post[] = [
  {
    type: 'linkedin',
    embedUrl: 'https://www.linkedin.com/embed/feed/update/urn:li:ugcPost:7391793210458722304?collapsed=1',
    title: 'Post 1',
  },
  {
    type: 'linkedin',
    embedUrl: 'https://www.linkedin.com/embed/feed/update/urn:li:ugcPost:7386496614867177472?collapsed=1',
    title: 'Post 2',
  },
  {
    type: 'linkedin',
    embedUrl: 'https://www.linkedin.com/embed/feed/update/urn:li:ugcPost:7374141334649069569?collapsed=1',
    title: 'Post 3',
  },
  {
    type: 'pdf',
    embedUrl: '/recommendations/Recommendation%20letter,%20Gustav%20Krowicki.pdf',
    title: 'Recommendation',
  },
];

export default function LinkedInPosts() {
  return (
    <section className="py-24 bg-neutral-50">
      <Container>
        <div className="mb-12">
          <h2 className="text-4xl md:text-5xl font-bold mb-4">Recent Posts</h2>
          <p className="text-lg text-neutral-600">
            Thoughts on design, research, and product development
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {posts.map((post, index) => (
            <div
              key={index}
              className="bg-white rounded-xl overflow-hidden shadow-sm border border-neutral-200 hover:shadow-md transition-shadow duration-200"
            >
              {post.type === 'pdf' ? (
                <PDFViewer url={post.embedUrl} />
              ) : (
                <iframe
                  src={post.embedUrl}
                  height="600"
                  width="100%"
                  allowFullScreen
                  title={post.title || `LinkedIn Post ${index + 1}`}
                  className="w-full border-0"
                />
              )}
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
}
