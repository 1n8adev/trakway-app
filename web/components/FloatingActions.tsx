import type { CSSProperties, ReactNode } from 'react';
import { Link } from '@/i18n/navigation';
import { whatsappUrl } from '@/lib/contact';
import { WhatsAppIcon } from '@/components/product/icons';
import { BookServiceIconGlyph } from '@/components/book-service/icons';

function PhoneIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M6.6 10.8c1.4 2.8 3.8 5.2 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1C10.6 21 3 13.4 3 4c0-.6.4-1 1-1h3.2c.6 0 1 .4 1 1 0 1.3.2 2.5.6 3.6.1.3 0 .7-.2 1L6.6 10.8Z" />
      <path d="M15 3.5a5.5 5.5 0 0 1 5.5 5.5M15 6.5A2.5 2.5 0 0 1 17.5 9" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

type Action = {
  label: string;
  href: string;
  external?: boolean;
  // Button colour + the matching soft ring used for the pulse.
  className: string;
  pulseClassName?: string;
  icon: ReactNode;
};

const ACTIONS: Action[] = [
  {
    label: 'Chat on WhatsApp',
    href: whatsappUrl('Hi Trakway, I would like to know more about your GPS trackers.'),
    external: true,
    className: 'bg-[#25D366] hover:bg-[#1ebe5b]',
    pulseClassName: 'bg-[#25D366]',
    icon: <WhatsAppIcon className="h-7 w-7" />
  },
  // {
  //   label: 'Book a service',
  //   href: '/book-service',
  //   className: 'bg-[#0A9BE0] hover:bg-[#0889c6]',
  //   icon: <BookServiceIconGlyph icon="wrench" className="h-6 w-6" />
  // },
  {
    label: 'Book a demo',
    href: '/contact',
    className: 'bg-[#2563EB] hover:bg-[#1d4fd8]',
    icon: <PhoneIcon className="h-6 w-6 motion-safe:animate-ring" />
  }
];

// Fixed quick-action buttons on the right edge. They slide in one after
// another; hovering shows a label that slides out to the left.
export default function FloatingActions() {
  return (
    <nav
      aria-label="Quick actions"
      className="fixed right-3 bottom-5 z-40 flex flex-col gap-5 sm:right-5 sm:gap-6 lg:top-1/2 lg:bottom-auto lg:-translate-y-1/2"
    >
      {ACTIONS.map((action, index) => {
        const content = (
          <>
            {/* Label: slides out on hover/focus (desktop) */}
            <span className="pointer-events-none absolute top-1/2 right-full mr-3 hidden -translate-y-1/2 translate-x-2 rounded-full bg-gray-900 px-3 py-1.5 text-xs font-semibold whitespace-nowrap text-white opacity-0 shadow-lg transition duration-200 group-hover:translate-x-0 group-hover:opacity-100 group-focus-visible:translate-x-0 group-focus-visible:opacity-100 sm:block">
              {action.label}
            </span>

            {action.pulseClassName && (
              <span aria-hidden="true" className={`absolute inset-0 rounded-full opacity-60 motion-safe:animate-ping ${action.pulseClassName}`} />
            )}

            <span
              className={`relative flex h-12 w-12 items-center justify-center rounded-full text-white shadow-lg ring-4 ring-white transition duration-200 group-hover:scale-110 group-hover:shadow-xl sm:h-14 sm:w-14 ${action.className}`}
            >
              {action.icon}
            </span>
          </>
        );

        const shared = {
          'aria-label': action.label,
          title: action.label,
          className: 'group relative flex rounded-full outline-none motion-safe:animate-float-in',
          // Stagger the entrance: each button follows the previous one.
          style: { animationDelay: `${300 + index * 150}ms` } as CSSProperties
        };

        return action.external ? (
          <a key={action.label} href={action.href} target="_blank" rel="noopener noreferrer" {...shared}>
            {content}
          </a>
        ) : (
          <Link key={action.label} href={action.href} {...shared}>
            {content}
          </Link>
        );
      })}
    </nav>
  );
}
