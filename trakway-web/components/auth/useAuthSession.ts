'use client';

import { useEffect, useMemo, useSyncExternalStore } from 'react';
import { fetchMe, getSessionSnapshot, subscribeToSession, type AuthSession } from '@/lib/auth';

// Refresh the stored user from /api/auth/me once per page load.
let meChecked = false;

// undefined = not known yet (server render / hydration), null = logged out.
export function useAuthSession(): AuthSession | null | undefined {
  const raw = useSyncExternalStore(subscribeToSession, getSessionSnapshot, () => undefined);
  const session = useMemo(() => {
    if (raw === undefined) return undefined;
    try {
      return raw ? (JSON.parse(raw) as AuthSession) : null;
    } catch {
      return null;
    }
  }, [raw]);

  useEffect(() => {
    if (session && !meChecked) {
      meChecked = true;
      fetchMe();
    }
  }, [session]);

  return session;
}
