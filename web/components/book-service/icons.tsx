import type { ReactNode } from 'react';

export type BookServiceIcon =
  | 'pin'
  | 'wrench'
  | 'clock'
  | 'truck'
  | 'shieldBadge'
  | 'car'
  | 'gear'
  | 'calendar'
  | 'user'
  | 'phone'
  | 'mail'
  | 'arrowRight'
  | 'lock'
  | 'clipboard'
  | 'tools'
  | 'mapPin'
  | 'shieldCheck'
  | 'users';

const PATHS: Record<BookServiceIcon, ReactNode> = {
  pin: (
    <>
      <path d="M12 21s-7-6.1-7-11.5A7 7 0 0 1 19 9.5C19 14.9 12 21 12 21Z" />
      <circle cx="12" cy="9.5" r="2.3" />
    </>
  ),
  wrench: (
    <path d="M14.7 6.3a3 3 0 1 1-4.4 4.1L5 15.7V19h3.3l5.3-5.3a3 3 0 1 1 4.1-4.4L21 6l-3-3-3.3 3.3Z" />
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3 2" />
    </>
  ),
  truck: (
    <>
      <path d="M2 8h11v9H2z" />
      <path d="M13 11h4l3 3v3h-7z" />
      <circle cx="6" cy="18.5" r="1.6" />
      <circle cx="16.5" cy="18.5" r="1.6" />
    </>
  ),
  shieldBadge: (
    <>
      <circle cx="12" cy="9" r="5" />
      <path d="M9 13.5 7 21l5-2.5L17 21l-2-7.5" />
    </>
  ),
  car: (
    <>
      <path d="M4 16V11l2-4h12l2 4v5" />
      <path d="M2 16h20" />
      <circle cx="7" cy="17.5" r="1.6" />
      <circle cx="17" cy="17.5" r="1.6" />
    </>
  ),
  gear: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 3v2.2M12 18.8V21M4.2 12H2M22 12h-2.2M6 6l1.5 1.5M16.5 16.5 18 18M18 6l-1.5 1.5M7.5 16.5 6 18" />
    </>
  ),
  calendar: (
    <>
      <rect x="3.5" y="5" width="17" height="16" rx="2" />
      <path d="M3.5 10h17M8 3v4M16 3v4" />
    </>
  ),
  user: (
    <>
      <circle cx="12" cy="8" r="3.5" />
      <path d="M5 20c0-3.6 3.1-6.5 7-6.5s7 2.9 7 6.5" />
    </>
  ),
  phone: (
    <path d="M6.6 10.8c1.4 2.8 3.8 5.2 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1C10.6 21 3 13.4 3 4c0-.6.4-1 1-1h3.2c.6 0 1 .4 1 1 0 1.3.2 2.5.6 3.6.1.3 0 .7-.2 1L6.6 10.8Z" />
  ),
  mail: (
    <>
      <rect x="3" y="5.5" width="18" height="13" rx="2" />
      <path d="m3.5 7 8.5 6 8.5-6" />
    </>
  ),
  arrowRight: <path d="M5 12h14M13 6l6 6-6 6" />,
  lock: (
    <>
      <rect x="4.5" y="10.5" width="15" height="9.5" rx="1.5" />
      <path d="M7.5 10.5V7a4.5 4.5 0 0 1 9 0v3.5" />
    </>
  ),
  clipboard: (
    <>
      <rect x="5" y="4.5" width="14" height="17" rx="1.5" />
      <rect x="8.5" y="2.5" width="7" height="4" rx="1" />
      <path d="M8.5 11h7M8.5 14.5h7M8.5 18h4" />
    </>
  ),
  tools: (
    <>
      <path d="M6.5 4 4 6.5l3 3 2.5-2.5M4 20l6-6M14 7l3 3M9.5 9.5l7 7a2.1 2.1 0 0 0 3-3l-7-7" />
    </>
  ),
  mapPin: (
    <>
      <path d="M9 4 4 6v14l5-2 6 2 5-2V4l-5 2-6-2Z" />
      <path d="M9 4v14M15 6v14" />
      <circle cx="17" cy="9" r="2" />
    </>
  ),
  shieldCheck: (
    <>
      <path d="M12 2.5 4 5.5v6c0 5 3.4 8.4 8 10 4.6-1.6 8-5 8-10v-6l-8-3Z" />
      <path d="m8.8 12 2.2 2.2 4.2-4.2" />
    </>
  ),
  users: (
    <>
      <circle cx="9" cy="8" r="3" />
      <path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6" />
      <path d="M16 4.3a3 3 0 0 1 0 5.9M20 20c0-2.8-1.9-5.1-4.5-5.8" />
    </>
  )
};

export function BookServiceIconGlyph({
  icon,
  className
}: {
  icon: BookServiceIcon;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      {PATHS[icon]}
    </svg>
  );
}
