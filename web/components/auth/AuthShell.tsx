import type { ReactNode } from 'react';
import { BookServiceIconGlyph, type BookServiceIcon } from '@/components/book-service/icons';

const benefits: { icon: BookServiceIcon; title: string; description: string }[] = [
  { icon: 'calendar', title: 'Book services faster', description: 'Your details are saved for every booking' },
  { icon: 'clipboard', title: 'Track your orders', description: 'See order and installation status in one place' },
  { icon: 'shieldCheck', title: 'Secure by design', description: 'Email verification and encrypted passwords' }
];

// Two-column auth layout: brand panel on large screens, form card on the right.
export default function AuthShell({ children }: { children: ReactNode }) {
  return (
    <div className="bg-gray-50">
      <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-12 lg:grid-cols-2 lg:py-20">
        <div className="relative hidden overflow-hidden rounded-3xl bg-ink-700 p-10 text-white lg:block">
          {/* <div className="pointer-events-none absolute -top-20 -right-20 h-56 w-56 rounded-full bg-brand-600/20" />
          <div className="pointer-events-none absolute -bottom-24 -left-16 h-64 w-64 rounded-full bg-white/5" /> */}

          <div className="relative">
            <p className="flex items-center gap-3 text-sm font-bold tracking-[0.2em] text-brand-600 uppercase">
              <span className="h-0.5 w-6 bg-brand-600" />
              Trakway Account
            </p>
            <h1 className="mt-4 text-3xl font-extrabold leading-tight xl:text-4xl">
              Everything for your vehicles, in one place
            </h1>
            <p className="mt-4 text-white/70">Manage bookings, orders and devices with a single Trakway account.</p>

            <ul className="mt-10 space-y-6">
              {benefits.map((benefit) => (
                <li key={benefit.title} className="flex items-start gap-4">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/10 text-brand-600">
                    <BookServiceIconGlyph icon={benefit.icon} className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="font-bold">{benefit.title}</p>
                    <p className="mt-0.5 text-sm text-white/70">{benefit.description}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mx-auto w-full max-w-md lg:max-w-none">{children}</div>
      </div>
    </div>
  );
}
