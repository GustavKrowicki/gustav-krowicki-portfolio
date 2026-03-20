import { Metadata } from 'next';
import Container from '@/components/ui/Container';
import ContactLinks from '@/components/contact/ContactLinks';

export const metadata: Metadata = {
  title: 'Contact',
  description: 'Get in touch with Gustav Krowicki - Product Designer based in Aarhus, Denmark.',
};

export default function ContactPage() {
  return (
    <div className="py-24">
      <Container maxWidth="content">
        <h1 className="text-5xl md:text-6xl font-bold mb-8">Get in Touch</h1>

        <p className="text-xl text-neutral-600 mb-16 leading-relaxed">
          I&apos;m always happy to chat about design, research, or interesting problems.
          Feel free to reach out through any of the channels below.
        </p>

        <ContactLinks />
      </Container>
    </div>
  );
}
