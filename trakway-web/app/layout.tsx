import type { ReactNode } from 'react';

// This root layout is required by Next.js, but real rendering
// happens in app/[locale]/layout.tsx. proxy.ts redirects
// "/" to "/en" (or the browser's preferred locale) automatically.
export default function RootLayout({ children }: { children: ReactNode }) {
  return children;
}
