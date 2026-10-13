'use client';

import { useEffect, type ReactNode } from 'react';
import { Link, usePathname, useRouter } from '@/i18n/navigation';
import { useAuthSession } from '@/components/auth/useAuthSession';
import { Avatar, LogoutButton } from '@/components/auth/HeaderAccount';
import { BookServiceIconGlyph, type BookServiceIcon } from '@/components/book-service/icons';

const NAV: { href: string; label: string; icon: BookServiceIcon }[] = [
  { href: '/account', label: 'Dashboard', icon: 'user' },
  { href: '/account/orders', label: 'My orders', icon: 'truck' },
  { href: '/account/addresses', label: 'Addresses', icon: 'pin' },
  { href: '/cart', label: 'My cart', icon: 'clipboard' }
];

// Banner title for the current account page.
function pageTitle(pathname: string) {
  if (pathname.startsWith('/account/orders/')) return 'Order Details';
  if (pathname.startsWith('/account/orders')) return 'My Orders';
  if (pathname.startsWith('/account/addresses')) return 'My Addresses';
  return 'My Account';
}

// Same title strip as the About / Products pages.
function PageBanner({ title }: { title: string }) {
  return (
    <div className="bg-gray-bread py-6 text-start">
      <div className="mx-auto px-4 lg:max-w-7xl">
        <h1 className="mb-0 text-2xl font-bold text-gray-900 text-white sm:text-3xl md:text-4xl">{title}</h1>
      </div>
    </div>
  );
}

// Account pages: sends logged-out visitors to login (and back here afterwards),
// and lays out the sidebar next to the page content.
export default function AccountShell({ children }: { children: ReactNode }) {
  const session = useAuthSession();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (session === null) router.replace(`/auth?tab=login&next=${encodeURIComponent(pathname)}`);
  }, [session, pathname, router]);

  if (!session?.user) {
    return (
      <div>
        <PageBanner title={pageTitle(pathname)} />
        <div className="mx-auto grid max-w-7xl gap-6 px-4 py-10 lg:grid-cols-12" aria-busy="true">
          <div className="h-72 animate-pulse rounded-2xl bg-gray-100 lg:col-span-3" />
          <div className="h-96 animate-pulse rounded-2xl bg-gray-100 lg:col-span-9" />
        </div>
      </div>
    );
  }

  const user = session.user;

  return (
    <div className="bg-gray-50">
      <PageBanner title={pageTitle(pathname)} />
      <div className="mx-auto grid max-w-7xl items-start gap-6 px-4 py-8 sm:py-12 lg:grid-cols-12">
        <aside className="rounded-2xl border border-gray-200 bg-white p-4 lg:sticky lg:top-6 lg:col-span-3">
          <div className="flex items-center gap-3 border-b border-gray-100 px-2 pb-4">
            <Avatar name={user.name} size="lg" />
            <div className="min-w-0">
              <p className="truncate font-bold text-gray-900">{user.name}</p>
              <p className="truncate text-sm text-gray-500">{user.email}</p>
            </div>
          </div>

          <nav aria-label="Account" className="mt-3 flex gap-1 overflow-x-auto lg:flex-col">
            {NAV.map((item) => {
              // Exact match for the dashboard; sub-pages (order details) keep their section active.
              const active = item.href === '/account' ? pathname === item.href : pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? 'page' : undefined}
                  className={`flex shrink-0 items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold transition ${
                    active ? 'bg-brand-50 text-brand-600' : 'text-gray-700 hover:bg-gray-50 hover:text-ink-700'
                  }`}
                >
                  <BookServiceIconGlyph icon={item.icon} className="h-5 w-5" />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="mt-3 border-t border-gray-100 pt-3">
            <LogoutButton className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold text-red-600 hover:bg-red-50 disabled:opacity-60" />
          </div>
        </aside>

        <main className="min-w-0 lg:col-span-9">{children}</main>
      </div>
    </div>
  );
}
