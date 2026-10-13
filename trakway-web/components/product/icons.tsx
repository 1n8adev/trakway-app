import type { ReactNode } from 'react';

export type ProductFeatureIcon =
  | 'location'
  | 'speed'
  | 'phone'
  | 'battery'
  | 'share'
  | 'drop'
  | 'bell'
  | 'key'
  | 'shield'
  | 'alert'
  | 'history'
  | 'map';

const FEATURE_ICON_PATHS: Record<ProductFeatureIcon, ReactNode> = {
  location: (
    <>
      <path d="M12 21s-7-6.1-7-11.5A7 7 0 0 1 19 9.5C19 14.9 12 21 12 21Z" />
      <circle cx="12" cy="9.5" r="2.3" />
    </>
  ),
  speed: <path d="M13 3 4 14h6l-1 7 9-11h-6l1-7Z" strokeLinejoin="round" />,
  phone: (
    <path d="M6.6 10.8c1.4 2.8 3.8 5.2 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1C10.6 21 3 13.4 3 4c0-.6.4-1 1-1h3.2c.6 0 1 .4 1 1 0 1.3.2 2.5.6 3.6.1.3 0 .7-.2 1L6.6 10.8Z" />
  ),
  battery: (
    <>
      <rect x="3" y="8" width="16" height="8" rx="1.5" />
      <path d="M21 10.5v3" strokeLinecap="round" />
      <path d="M7 11v2M10 11v2M13 11v2" strokeLinecap="round" />
    </>
  ),
  share: (
    <>
      <circle cx="18" cy="5" r="2.3" />
      <circle cx="6" cy="12" r="2.3" />
      <circle cx="18" cy="19" r="2.3" />
      <path d="m8.1 10.8 7.8-4.4M8.1 13.2l7.8 4.4" />
    </>
  ),
  drop: <path d="M12 2.5c3.5 4.4 6.5 8.4 6.5 11.8a6.5 6.5 0 1 1-13 0c0-3.4 3-7.4 6.5-11.8Z" />,
  bell: (
    <>
      <path d="M6 10a6 6 0 1 1 12 0c0 4 1.5 5.5 1.5 5.5h-15S6 14 6 10Z" />
      <path d="M10 19a2 2 0 0 0 4 0" strokeLinecap="round" />
    </>
  ),
  key: (
    <>
      <circle cx="8" cy="15" r="4" />
      <path d="M11 12 20 3M17 6l2.5 2.5M14 9l2 2" strokeLinecap="round" />
    </>
  ),
  shield: <path d="M12 2.5 4 5.5v6c0 5 3.4 8.4 8 10 4.6-1.6 8-5 8-10v-6l-8-3Z" strokeLinejoin="round" />,
  alert: (
    <>
      <path d="M12 3 2 20h20L12 3Z" strokeLinejoin="round" />
      <path d="M12 10v4" strokeLinecap="round" />
      <circle cx="12" cy="17" r="0.9" fill="currentColor" stroke="none" />
    </>
  ),
  history: (
    <>
      <rect x="5" y="3.5" width="14" height="17" rx="1.5" />
      <path d="M8.5 8h7M8.5 12h7M8.5 16h4" strokeLinecap="round" />
    </>
  ),
  map: (
    <>
      <path d="M9 4 4 6v14l5-2 6 2 5-2V4l-5 2-6-2Z" strokeLinejoin="round" />
      <path d="M9 4v14M15 6v14" />
    </>
  )
};

export function FeatureIconGlyph({ icon, className }: { icon: ProductFeatureIcon; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinejoin="round"
      className={className}
    >
      {FEATURE_ICON_PATHS[icon]}
    </svg>
  );
}

export function SignalIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" className={className}>
      <path d="M4 20V13M9 20V9M14 20V5M19 20v-9" />
    </svg>
  );
}

export function CheckIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M5 13l4 4L19 7" />
    </svg>
  );
}

export function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M12 2C6.5 2 2 6.4 2 12c0 1.8.5 3.6 1.4 5.1L2 22l5.1-1.3A10 10 0 0 0 12 22c5.5 0 10-4.4 10-10S17.5 2 12 2Zm0 18.1c-1.6 0-3.2-.4-4.6-1.3l-.3-.2-3 .8.8-2.9-.2-.3A8.1 8.1 0 1 1 12 20.1Zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1-.2.2-.6.8-.8 1-.1.2-.3.2-.5.1-.7-.3-1.4-.7-2-1.3-.5-.5-1-1.1-1.4-1.7-.1-.2 0-.4.1-.5.1-.1.2-.3.4-.4.1-.2.2-.3.2-.5.1-.2 0-.4 0-.5-.1-.1-.6-1.5-.8-2-.2-.5-.4-.5-.6-.5h-.5c-.2 0-.5.1-.7.3-.2.2-1 1-1 2.4s1 2.8 1.1 3c.1.2 2 3 4.8 4.3.7.3 1.2.5 1.6.6.7.2 1.3.2 1.8.1.5-.1 1.5-.6 1.8-1.2.2-.6.2-1.1.2-1.2-.1-.2-.3-.2-.5-.3Z" />
    </svg>
  );
}
