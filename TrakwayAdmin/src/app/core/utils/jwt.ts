// Reads the payload of a JWT without verifying it (the API verifies on every request).
export function decodeJwt<T = Record<string, unknown>>(token: string): T | null {
  try {
    const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(atob(base64)) as T;
  } catch {
    return null;
  }
}

// True when the token is malformed or its `exp` is in the past.
export function isTokenExpired(token: string): boolean {
  const payload = decodeJwt<{ exp?: number }>(token);
  if (!payload) return true;
  return payload.exp !== undefined && payload.exp * 1000 <= Date.now();
}
