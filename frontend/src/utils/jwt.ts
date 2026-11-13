/**
 * JWT Utility Functions for Client-Side Token Inspection and Expiration Verification.
 * Ensures consistent authentication state handling and prevents transmission of stale tokens.
 */

export interface JWTPayload {
  sub: string;
  role: string;
  iat: number;
  exp: number;
  [key: string]: unknown;
}

/**
 * Safely parses the payload portion of a standard base64url-encoded JWT.
 * Returns the decoded JSON object or null if invalid or malformed.
 */
export function parseJwtPayload(token: string | null | undefined): JWTPayload | null {
  if (!token || typeof token !== 'string') {
    return null;
  }

  const parts = token.trim().split('.');
  if (parts.length !== 3) {
    return null;
  }

  try {
    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
    const jsonPayload = decodeURIComponent(
      atob(padded)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload) as JWTPayload;
  } catch {
    try {
      // Fallback standard atob
      const base64Url = parts[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
      return JSON.parse(atob(padded)) as JWTPayload;
    } catch {
      return null;
    }
  }
}

/**
 * Evaluates whether a JWT access token has expired or is absent/invalid.
 * Includes a configurable safety buffer (default 10 seconds) to preemptively
 * prevent race conditions during in-flight network requests.
 *
 * @param token - Raw JWT string
 * @param bufferSeconds - Safety buffer in seconds (default 10s)
 * @returns true if token is missing, malformed, or expired; false if currently valid
 */
export function isTokenExpired(token: string | null | undefined, bufferSeconds = 10): boolean {
  if (!token) {
    return true;
  }

  const payload = parseJwtPayload(token);
  if (!payload || typeof payload.exp !== 'number') {
    return true;
  }

  // exp is Unix epoch timestamp in seconds; Date.now() is in milliseconds
  const expirationTimeMs = payload.exp * 1000;
  const cutoffTimeMs = Date.now() + bufferSeconds * 1000;

  return cutoffTimeMs >= expirationTimeMs;
}

/**
 * Returns remaining lifetime in seconds for the token.
 * Returns 0 if expired or invalid.
 */
export function getTokenRemainingSeconds(token: string | null | undefined): number {
  if (!token) {
    return 0;
  }

  const payload = parseJwtPayload(token);
  if (!payload || typeof payload.exp !== 'number') {
    return 0;
  }

  const currentSeconds = Math.floor(Date.now() / 1000);
  const remaining = payload.exp - currentSeconds;
  return remaining > 0 ? remaining : 0;
}
