import type { Metadata } from 'next';
import AuthShell from '@/components/auth/AuthShell';
import AuthTabs, { type AuthTab } from '@/components/auth/AuthTabs';

export const metadata: Metadata = {
  title: 'Login or Register',
  robots: { index: false }
};

// Only same-site paths are allowed as a post-login redirect.
function safeRedirect(next: string | undefined) {
  return next && next.startsWith('/') && !next.startsWith('//') && !next.startsWith('/\\') ? next : '/';
}

export default async function AuthPage({
  searchParams
}: {
  searchParams: Promise<{ tab?: string; next?: string }>;
}) {
  const { tab, next } = await searchParams;
  const initialTab: AuthTab = tab === 'register' ? 'register' : 'login';

  return (
    <AuthShell>
      <AuthTabs initialTab={initialTab} redirectTo={safeRedirect(next)} />
    </AuthShell>
  );
}
