import { Metadata } from 'next';
import { Mail, Phone, Linkedin, MapPin } from 'lucide-react';
import Container from '@/components/ui/Container';

export const metadata: Metadata = {
  title: 'Contact',
  description: 'Get in touch with Gustav Krowicki - Product Designer based in Copenhagen, Denmark.',
};

const contactInfo = [
  {
    icon: Mail,
    label: 'Email',
    value: 'gkkrowicki@gmail.com',
    href: 'mailto:gkkrowicki@gmail.com'
  },
  {
    icon: Phone,
    label: 'Phone',
    value: '+45 29 31 88 07',
    href: 'tel:+4529318807'
  },
  {
    icon: Linkedin,
    label: 'LinkedIn',
    value: 'linkedin.com/in/gustavkrowicki',
    href: 'https://linkedin.com/in/gustavkrowicki'
  },
  {
    icon: MapPin,
    label: 'Location',
    value: 'Copenhagen, Denmark',
    href: null
  }
];

export default function ContactPage() {
  return (
    <div className="py-24">
      <Container maxWidth="content">
        <h1 className="text-5xl md:text-6xl font-bold mb-8">Get in Touch</h1>

        <p className="text-xl text-neutral-600 mb-16 leading-relaxed">
          I'm always happy to chat about design, research, or interesting problems.
          Feel free to reach out through any of the channels below.
        </p>

        <div className="grid gap-8 md:gap-12">
          {contactInfo.map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.label} className="flex items-start gap-4">
                <div className="flex items-center justify-center w-12 h-12 bg-neutral-100 rounded-lg flex-shrink-0">
                  <Icon className="w-5 h-5 text-neutral-700" />
                </div>

                <div>
                  <p className="text-sm font-medium text-neutral-500 mb-1">
                    {item.label}
                  </p>
                  {item.href ? (
                    <a
                      href={item.href}
                      className="text-lg text-foreground hover:text-accent transition-colors"
                      target={item.href.startsWith('http') ? '_blank' : undefined}
                      rel={item.href.startsWith('http') ? 'noopener noreferrer' : undefined}
                    >
                      {item.value}
                    </a>
                  ) : (
                    <p className="text-lg text-foreground">{item.value}</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-16 pt-16 border-t border-neutral-200">
          <h2 className="text-2xl font-bold mb-4">Availability</h2>
          <p className="text-lg text-neutral-700 leading-relaxed">
            Currently working full-time at LEGO. Open to interesting conversations
            and potential future opportunities.
          </p>
        </div>
      </Container>
    </div>
  );
}
