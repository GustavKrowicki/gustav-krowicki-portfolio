import Link from 'next/link';
import Container from './Container';

const socialLinks = [
  { label: 'LinkedIn', href: 'https://linkedin.com/in/gustavkrowicki' },
  { label: 'Email', href: 'mailto:gkkrowicki@gmail.com' }
];

const footerLinks = [
  { label: 'Work', href: '/work' },
  { label: 'About', href: '/about' },
  { label: 'Contact', href: '/contact' }
];

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-neutral-200 mt-32 py-12">
      <Container>
        <div className="flex flex-col md:flex-row justify-between gap-8">
          <div className="space-y-4">
            <p className="text-lg font-semibold">Gustav Krowicki</p>
            <p className="text-neutral-600">Product Designer</p>
            <p className="text-neutral-600">Copenhagen, Denmark</p>
          </div>

          <div className="flex flex-col md:flex-row gap-12">
            <div>
              <p className="font-medium mb-3">Navigation</p>
              <ul className="space-y-2">
                {footerLinks.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-neutral-600 hover:text-foreground transition-colors"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <p className="font-medium mb-3">Connect</p>
              <ul className="space-y-2">
                {socialLinks.map((link) => (
                  <li key={link.href}>
                    <a
                      href={link.href}
                      className="text-neutral-600 hover:text-foreground transition-colors"
                      target={link.href.startsWith('http') ? '_blank' : undefined}
                      rel={link.href.startsWith('http') ? 'noopener noreferrer' : undefined}
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-neutral-200">
          <p className="text-sm text-neutral-500">
            © {currentYear} Gustav Krowicki. All rights reserved.
          </p>
        </div>
      </Container>
    </footer>
  );
}
