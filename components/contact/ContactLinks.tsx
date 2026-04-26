'use client';

import { Mail, Phone, MapPin } from 'lucide-react';

function Linkedin({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 76.624 65.326" fill="currentColor" className={className}>
      <path d="M1165,274.515a1.2,1.2,0,0,0,1.21-1.269c0-.9-.543-1.33-1.657-1.33h-1.8v4.712h.677v-2.054h.832l.019.025,1.291,2.029h.724l-1.389-2.1Zm-.783-.472h-.785V272.45h.995c.514,0,1.1.084,1.1.757,0,.774-.593.836-1.314.836" transform="translate(-1092.136 -213.406)" />
      <path d="M958.98,112.559h-9.6V97.525c0-3.585-.064-8.2-4.993-8.2-5,0-5.765,3.906-5.765,7.939v15.294h-9.6V81.642h9.216v4.225h.129a10.1,10.1,0,0,1,9.093-4.994c9.73,0,11.524,6.4,11.524,14.726ZM918.19,77.416a5.571,5.571,0,1,1,5.57-5.572,5.571,5.571,0,0,1-5.57,5.572m4.8,35.143h-9.61V81.642h9.61Zm40.776-55.2h-55.21a4.728,4.728,0,0,0-4.781,4.67v55.439a4.731,4.731,0,0,0,4.781,4.675h55.21a4.741,4.741,0,0,0,4.8-4.675V62.025a4.738,4.738,0,0,0-4.8-4.67" transform="translate(-903.776 -57.355)" />
      <path d="M1156.525,264.22a4.418,4.418,0,1,0,.085,0h-.085m0,8.33a3.874,3.874,0,1,1,3.809-3.938c0,.022,0,.043,0,.065a3.791,3.791,0,0,1-3.708,3.871h-.1" transform="translate(-1084.362 -207.809)" />
    </svg>
  );
}
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
                    className="text-lg text-foreground hover:underline transition-all"
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
