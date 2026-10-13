'use client';

import { useEffect, useRef, useState } from 'react';
import { Link, useRouter } from '@/i18n/navigation';
import { logout, type AuthSession } from '@/lib/auth';
import { useAuthSession } from './useAuthSession';
import { BookServiceIconGlyph, type BookServiceIcon } from '@/components/book-service/icons';

const ACCOUNT_LINKS: { href: string; label: string; icon: BookServiceIcon }[] = [
  { href: '/account', label: 'My account', icon: 'user' },
  { href: '/account/orders', label: 'My orders', icon: 'truck' },
  { href: '/account/addresses', label: 'My addresses', icon: 'pin' }
];

function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? '') + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase() || '?';
}

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? null
    : date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function Avatar({ name, size = 'sm' }: { name: string; size?: 'sm' | 'lg' }) {
  return (
    <span
      className={`flex shrink-0 items-center justify-center rounded-full bg-brand-100 font-bold text-brand-600 ${
        size === 'lg' ? 'h-12 w-12 text-base' : 'h-9 w-9 text-sm'
      }`}
    >
      {initials(name)}
    </span>
  );
}

// Name, contact details and verification status of the logged-in customer.
export function UserInfo({ session }: { session: AuthSession }) {
  const user = session.user;
  if (!user) return null;
  const memberSince = formatDate(user.created_at);

  return (
    <div className="flex items-start gap-3">
      <Avatar name={user.name} size="lg" />
      <div className="min-w-0">
        <p className="truncate font-bold text-gray-900">{user.name}</p>
        <p className="truncate text-sm text-gray-500">{user.email}</p>
        {user.phone && <p className="text-sm text-gray-500">{user.phone}</p>}
        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
          {user.email_verified ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2 py-0.5 font-semibold text-green-700">
              <BookServiceIconGlyph icon="shieldCheck" className="h-3.5 w-3.5" />
              Verified
            </span>
          ) : (
            <span className="rounded-full bg-amber-50 px-2 py-0.5 font-semibold text-amber-700">Email not verified</span>
          )}
          {/* {memberSince && <span className="text-gray-400">Member since {memberSince}</span>} */}
        </div>
      </div>
    </div>
  );
}

function useLogout() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  async function handleLogout() {
    setPending(true);
    await logout();
    setPending(false);
    router.refresh();
  }
  return { pending, handleLogout };
}

export function LogoutButton({ onDone, className }: { onDone?: () => void; className: string }) {
  const { pending, handleLogout } = useLogout();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={async () => {
        await handleLogout();
        onDone?.();
      }}
      className={className}
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
        <path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3M10 17l-5-5 5-5M5 12h11" />
      </svg>
      {pending ? 'Logging out…' : 'Log out'}
    </button>
  );
}

// Desktop header: "Login / Register" link, or an avatar menu once logged in.
export function HeaderAccount() {
  const session = useAuthSession();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('pointerdown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  // Reserve the space until the session is read, so the header doesn't jump.
  if (session === undefined) return <span className="h-9 w-32" aria-hidden="true" />;

  if (!session?.user) {
    return (
      <Link href="/auth" className="inline-flex items-center gap-2 text-[15px] font-medium text-gray-700 hover:text-ink-700">
        <BookServiceIconGlyph icon="user" className="h-5 w-5" />
        Login / Register
      </Link>
    );
  }

  const user = session.user;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex items-center gap-2 rounded-full py-1 pr-2 pl-1 text-[15px] font-medium text-gray-700 hover:bg-gray-50"
      >
        <Avatar name={user.name} />
        <span className="max-w-32 truncate">Hi, {user.name.split(' ')[0]}</span>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={`transition ${open ? 'rotate-180' : ''}`}>
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>

      {open && (
        <div role="menu" className="absolute top-full right-0 z-30 mt-2 w-80 rounded-xl border border-gray-100 bg-white p-4 shadow-lg">
          <UserInfo session={session} />
          <div className="mt-4 space-y-0.5 border-t border-gray-100 pt-3">
            {ACCOUNT_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                role="menuitem"
                onClick={() => setOpen(false)}
                className="flex items-center gap-2 rounded-md px-2 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 hover:text-ink-700"
              >
                <BookServiceIconGlyph icon={link.icon} className="h-4 w-4 text-gray-400" />
                {link.label}
              </Link>
            ))}
            <LogoutButton
              onDone={() => setOpen(false)}
              className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-sm font-semibold text-red-600 hover:bg-red-50 disabled:opacity-60"
            />
          </div>
        </div>
      )}
    </div>
  );
}

// Mobile menu: login/register buttons, or the user's info with a logout button.
export function MobileAccount({ onNavigate }: { onNavigate: () => void }) {
  const session = useAuthSession();
  if (session === undefined) return null;

  if (!session?.user) {
    return (
      <div className="grid grid-cols-2 gap-2 pb-3">
        <Link
          href="/auth?tab=login"
          onClick={onNavigate}
          className="rounded-md border border-gray-200 px-4 py-2.5 text-center text-sm font-semibold text-gray-800 hover:bg-gray-50"
        >
          Log in
        </Link>
        <Link
          href="/auth?tab=register"
          onClick={onNavigate}
          className="rounded-md bg-brand-600 px-4 py-2.5 text-center text-sm font-semibold text-white hover:bg-brand-700"
        >
          Register
        </Link>
      </div>
    );
  }

  return (
    <div className="mb-2 rounded-xl bg-gray-50 p-4">
      <UserInfo session={session} />
      <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm font-semibold text-gray-700">
        {ACCOUNT_LINKS.map((link) => (
          <Link key={link.href} href={link.href} onClick={onNavigate} className="hover:text-ink-700">
            {link.label}
          </Link>
        ))}
      </div>
      <LogoutButton
        onDone={onNavigate}
        className="mt-3 flex items-center gap-2 text-sm font-semibold text-red-600 disabled:opacity-60"
      />
    </div>
  );
}
