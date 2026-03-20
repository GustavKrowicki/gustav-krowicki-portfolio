'use client';

import { Mail, Phone, Linkedin, MapPin } from 'lucide-react';
import { trackContactClicked, trackCvDownloaded } from '@/lib/analytics';

const contactInfo = [
  {
    icon: Mail,
    label: 'Email',
    value: 'gkkrowicki@gmail.com',
    href: 'mailto:gkkrowicki@gmail.com',
    method: 'email' as const,
  },
  {
    icon: Phone,
    label: 'Phone',
    value: '+45 29 31 88 07',
    href: 'tel:+4529318807',
    method: 'phone' as const,
  },
  {
    icon: Linkedin,
    label: 'LinkedIn',
    value: 'linkedin.com/in/gustavkrowicki',
    href: 'https://linkedin.com/in/gustavkrowicki',
    method: 'linkedin' as const,
  },
  {
    icon: MapPin,
    label: 'Location',
    value: 'Denmark',
    href: null,
    method: null,
  },
];

export default function ContactLinks() {
  return (
    <>
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
                    onClick={() => item.method && trackContactClicked(item.method)}
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
        <p className="text-lg text-neutral-700 leading-relaxed mb-6">
          Currently working as a student worker at The LEGO Group. Open to interesting conversations
          and potential future opportunities.
        </p>
        <a
          href="/cv/CV-Gustav-Krowicki.pdf"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none border-2 border-foreground text-foreground hover:bg-foreground hover:text-background px-6 py-3 text-base"
          onClick={() => trackCvDownloaded('contact')}
        >
          Download CV
        </a>
      </div>
    </>
  );
}
