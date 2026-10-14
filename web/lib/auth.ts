// Customer auth against the Trakway backend. Runs in the browser only: the
// auth forms post straight to the backend (like the booking form) and the
// session lives in localStorage.

const PUBLIC_API_URL = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5000').replace(/\/$/, '');

const STORAGE_KEY = 'trakway.auth';

// Fired on window whenever the session is saved or cleared, so UI (e.g. the
// header) can react without a page reload.
export const AUTH_CHANGE_EVENT = 'trakway:auth-change';

export type AuthUser = {
  id: number | string;
  name: string;
  email: string;
  phone: string | null;
  email_verified: boolean;
  created_at: string;
};

type TokenResponse = {
  token_type?: string;
  access_token: string;
  expires_in: number;
  refresh_token: string;
  refresh_token_expires_at?: string;
  user?: AuthUser;
};

export type AuthSession = {
  accessToken: string;
  refreshToken: string;
  // Epoch ms when the access token expires.
  expiresAt: number;
  user: AuthUser | null;
};

export type OtpSent = { email: string; otp_expires_in?: number; resend_after?: number };

export class AuthApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public fieldErrors: Record<string, string> = {},
    // Seconds to wait before retrying (429 responses).
    public retryAfter: number | null = null
  ) {
    super(message);
  }
}

// --- Validation (mirrors the backend rules) --------------------------------

export const OTP_LENGTH = 6;
export const DEFAULT_RESEND_AFTER = 60;

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export function validateEmail(email: string): string | null {
  if (!email) return 'Email is required.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return 'Enter a valid email address.';
  return null;
}

export function validatePassword(password: string): string | null {
  if (password.length < 8) return 'Password must be at least 8 characters.';
  if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) return 'Password needs at least one letter and one number.';
  return null;
}

// Optional; +91 and spaces are accepted.
export function validatePhone(phone: string): string | null {
  if (!phone) return null;
  const digits = phone.replace(/\s+/g, '').replace(/^\+91/, '');
  if (!/^\d{10}$/.test(digits)) return 'Enter a valid 10-digit mobile number.';
  return null;
}

// --- HTTP ------------------------------------------------------------------

function pickNumber(...values: unknown[]): number | null {
  for (const value of values) {
    const n = Number(value);
    if (value !== undefined && value !== null && value !== '' && Number.isFinite(n)) return n;
  }
  return null;
}

type Method = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

// Full JSON body (envelope included). Throws AuthApiError on non-2xx.
async function requestJson(method: Method, path: string, body?: unknown, accessToken?: string): Promise<any> {
  let res: Response;
  try {
    res = await fetch(`${PUBLIC_API_URL}${path}`, {
      method,
      headers: {
        Accept: 'application/json',
        ...(body !== undefined && { 'Content-Type': 'application/json' }),
        ...(accessToken && { Authorization: `Bearer ${accessToken}` })
      },
      body: body !== undefined ? JSON.stringify(body) : undefined
    });
  } catch {
    throw new AuthApiError(0, 'Could not reach the server. Please check your connection and try again.');
  }

  const json = await res.json().catch(() => null);

  if (!res.ok) {
    const retryAfter = pickNumber(json?.retry_after, json?.data?.retry_after, res.headers.get('Retry-After'));
    let message: string = json?.message ?? 'Something went wrong. Please try again.';
    if (res.status === 429 && !json?.message) {
      message = retryAfter ? `Too many attempts. Try again in ${retryAfter}s.` : 'Too many attempts. Please wait and try again.';
    }
    throw new AuthApiError(res.status, message, json?.errors ?? {}, retryAfter);
  }

  return json;
}

async function request<T>(method: Method, path: string, body?: unknown, accessToken?: string): Promise<T> {
  const json = await requestJson(method, path, body, accessToken);
  // Accept both the `{ success, data }` envelope and a bare payload.
  return (json && typeof json === 'object' && 'data' in json ? json.data : json) as T;
}

// --- Session storage -------------------------------------------------------

export function getSession(): AuthSession | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as AuthSession) : null;
  } catch {
    return null;
  }
}

// For useSyncExternalStore: the raw stored string is a stable snapshot
// (a parsed object would be new on every read).
export function getSessionSnapshot(): string | null {
  try {
    return window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

// Notifies on changes in this tab (AUTH_CHANGE_EVENT) and other tabs (storage).
export function subscribeToSession(onChange: () => void) {
  const onStorage = (e: StorageEvent) => {
    if (e.key === null || e.key === STORAGE_KEY) onChange();
  };
  window.addEventListener(AUTH_CHANGE_EVENT, onChange);
  window.addEventListener('storage', onStorage);
  return () => {
    window.removeEventListener(AUTH_CHANGE_EVENT, onChange);
    window.removeEventListener('storage', onStorage);
  };
}

function writeSession(session: AuthSession | null) {
  try {
    if (session) window.localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    else window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Storage blocked (private mode etc.) — the session just won't persist.
  }
  window.dispatchEvent(new Event(AUTH_CHANGE_EVENT));
}

function saveTokens(tokens: TokenResponse, fallbackUser: AuthUser | null = null): AuthSession {
  const session: AuthSession = {
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token,
    expiresAt: Date.now() + tokens.expires_in * 1000,
    user: tokens.user ?? fallbackUser
  };
  writeSession(session);
  return session;
}

// --- Register --------------------------------------------------------------

export type RegisterInput = { name: string; email: string; phone?: string; password: string };

export function register(input: RegisterInput) {
  return request<OtpSent>('POST', '/api/auth/register', input);
}

export async function verifyRegistration(email: string, otp: string) {
  return saveTokens(await request<TokenResponse>('POST', '/api/auth/register/verify', { email, otp }));
}

export function resendRegistrationOtp(email: string) {
  return request<OtpSent>('POST', '/api/auth/register/resend-otp', { email });
}

// --- Login / session -------------------------------------------------------

export async function login(email: string, password: string) {
  return saveTokens(await request<TokenResponse>('POST', '/api/auth/login', { email, password }));
}

// Refresh tokens rotate: both tokens are replaced on every refresh.
let refreshInFlight: Promise<AuthSession | null> | null = null;

export function refreshSession(): Promise<AuthSession | null> {
  refreshInFlight ??= (async () => {
    const current = getSession();
    if (!current) return null;
    try {
      const tokens = await request<TokenResponse>('POST', '/api/auth/refresh', { refresh_token: current.refreshToken });
      return saveTokens(tokens, current.user);
    } catch (error) {
      // Only drop the session when the server rejects the token, not on network errors.
      if (error instanceof AuthApiError && error.status >= 400 && error.status < 500) writeSession(null);
      return null;
    }
  })().finally(() => {
    refreshInFlight = null;
  });
  return refreshInFlight;
}

// Returns a usable access token, refreshing it if it expires within 30s.
export async function getAccessToken(): Promise<string | null> {
  const session = getSession();
  if (!session) return null;
  if (session.expiresAt - Date.now() > 30_000) return session.accessToken;
  return (await refreshSession())?.accessToken ?? null;
}

async function getMe(token: string): Promise<AuthUser> {
  const raw = await request<AuthUser | { user: AuthUser }>('GET', '/api/auth/me', undefined, token);
  const user = 'user' in raw ? raw.user : raw;
  const session = getSession();
  if (session) writeSession({ ...session, user });
  return user;
}

// GET /api/auth/me — retries once with a refreshed token on 401.
export async function fetchMe(): Promise<AuthUser | null> {
  const token = await getAccessToken();
  if (!token) return null;
  try {
    return await getMe(token);
  } catch (error) {
    if (!(error instanceof AuthApiError) || error.status !== 401) return null;
    const refreshed = await refreshSession();
    return refreshed ? getMe(refreshed.accessToken).catch(() => null) : null;
  }
}

export async function logout() {
  const session = getSession();
  writeSession(null);
  if (session) {
    await request('POST', '/api/auth/logout', { refresh_token: session.refreshToken }).catch(() => {});
  }
}

// Runs `call` with the customer's access token, retrying once with a refreshed
// token on 401. Throws a 401 AuthApiError when nobody is logged in.
async function withAccessToken<R>(call: (token: string) => Promise<R>): Promise<R> {
  const token = await getAccessToken();
  if (!token) throw new AuthApiError(401, 'Please log in to continue.');
  try {
    return await call(token);
  } catch (error) {
    if (!(error instanceof AuthApiError) || error.status !== 401) throw error;
    const refreshed = await refreshSession();
    if (!refreshed) throw error;
    return call(refreshed.accessToken);
  }
}

// Calls an endpoint that needs the customer's access token; resolves with `data`.
export function authRequest<T>(method: Method, path: string, body?: unknown): Promise<T> {
  return withAccessToken((token) => request<T>(method, path, body, token));
}

// Downloads a file from an endpoint that needs the customer's access token (e.g. an invoice PDF)
// and saves it in the browser. The file name comes from Content-Disposition when the API sends one.
export async function authDownload(path: string, fallbackName: string): Promise<void> {
  const blob = await withAccessToken(async (token) => {
    let res: Response;
    try {
      res = await fetch(`${PUBLIC_API_URL}${path}`, { headers: { Authorization: `Bearer ${token}` } });
    } catch {
      throw new AuthApiError(0, 'Could not reach the server. Please check your connection and try again.');
    }
    if (!res.ok) {
      const json = await res.json().catch(() => null);
      throw new AuthApiError(res.status, json?.message ?? 'Could not download the file. Please try again.');
    }
    const match = /filename\*?=(?:UTF-8'')?"?([^";]+)"?/i.exec(res.headers.get('Content-Disposition') ?? '');
    return { data: await res.blob(), name: match ? decodeURIComponent(match[1]) : fallbackName };
  });

  const url = URL.createObjectURL(blob.data);
  const link = document.createElement('a');
  link.href = url;
  link.download = blob.name;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export type Paginated<T> = {
  data: T[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
};

// GET for paginated lists: keeps the `pagination` block next to `data`.
export async function authRequestPage<T>(path: string): Promise<Paginated<T>> {
  const json = await withAccessToken((token) => requestJson('GET', path, undefined, token));
  const data: T[] = json?.data ?? [];
  return { data, pagination: json?.pagination ?? { page: 1, limit: data.length, total: data.length, totalPages: 1 } };
}

// --- Forgot / reset password -----------------------------------------------

// Same response whether or not the email exists.
export function forgotPassword(email: string) {
  return request<Partial<OtpSent>>('POST', '/api/auth/forgot-password', { email });
}

export function verifyForgotPasswordOtp(email: string, otp: string) {
  return request<{ reset_token: string; expires_in: number }>('POST', '/api/auth/forgot-password/verify', { email, otp });
}

// Logs the customer out everywhere, so any local session is cleared too.
export async function resetPassword(resetToken: string, password: string) {
  await request('POST', '/api/auth/reset-password', { reset_token: resetToken, password });
  writeSession(null);
}
