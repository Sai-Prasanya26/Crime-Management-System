import axios, { AxiosError } from 'axios';
import { isTokenExpired } from '../utils/jwt';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api/v1';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000,
});

// Single-flight lock & debouncing to prevent multiple simultaneous 401/expired handlers from triggering redirect loops
let isHandlingUnauthorized = false;
let lastUnauthorizedNoticeTime = 0;

/**
 * Cleanly handles unauthorized (401/expired) state:
 * - Evicts invalid token from localStorage
 * - Sets session_expired flag in sessionStorage for LoginPage notification
 * - Dispatches 'cms:auth-unauthorized' custom window event to notify AuthContext
 * - Debounces redundant invocations within a 2-second window
 */
export function notifyUnauthorized(reason: 'expired' | 'unauthorized' | 'invalid' = 'unauthorized') {
  const now = Date.now();
  if (isHandlingUnauthorized || now - lastUnauthorizedNoticeTime < 2000) {
    return;
  }
  isHandlingUnauthorized = true;
  lastUnauthorizedNoticeTime = now;

  try {
    localStorage.removeItem('cms_access_token');
    sessionStorage.setItem('cms_session_expired', 'true');
  } catch {
    // Storage access fallback
  }

  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('cms:auth-unauthorized', {
        detail: { reason, timestamp: now },
      })
    );
  }

  setTimeout(() => {
    isHandlingUnauthorized = false;
  }, 2000);
}

// Request interceptor: Attach JWT Bearer token and validate client-side expiry
apiClient.interceptors.request.use(
  (config) => {
    const isPublicAuthEndpoint =
      config.url?.includes('/auth/login') ||
      config.url?.endsWith('/login');

    const token = localStorage.getItem('cms_access_token');

    if (token && !isPublicAuthEndpoint) {
      if (isTokenExpired(token)) {
        console.warn('[API Client] Client-side JWT inspection detected expired token. Halting request and initiating re-authentication.');
        notifyUnauthorized('expired');
        const err = new Error('Authentication session expired. Please sign in again to continue.') as Error & {
          status?: number;
          code?: string;
        };
        err.status = 401;
        err.code = 'SESSION_EXPIRED';
        return Promise.reject(err);
      }

      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor: Unified error formatting, 401 handling, and 403 role enforcement
apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError<{ detail?: string }>) => {
    let message = 'An unexpected error occurred';
    let statusCode: number | undefined = undefined;

    if (error.code === 'ECONNABORTED' || error.message?.toLowerCase().includes('timeout')) {
      message = 'Request timed out while analyzing data. The server is processing complex calculations. Please retry.';
      statusCode = 408;
    } else if (!error.response) {
      message = 'Unable to connect to the backend server. Please verify the backend service is running on port 8000.';
      statusCode = 0;
    } else {
      statusCode = error.response.status;
      if (statusCode === 401) {
        message = error.response.data?.detail || 'Authentication session expired or required. Please log in to access intelligence data.';
        // Trigger re-authentication flow with single-flight debounce
        notifyUnauthorized(message.toLowerCase().includes('expired') ? 'expired' : 'unauthorized');
      } else if (statusCode === 403) {
        // HTTP 403 Forbidden: Do NOT log the user out! User is authenticated but lacks required RBAC role.
        message = error.response.data?.detail || 'Access forbidden. Required operational role not assigned.';
      } else if (statusCode === 404) {
        message = error.response.data?.detail || 'Requested analytical record or district was not found.';
      } else if (statusCode === 503) {
        message = error.response.data?.detail || 'Server or database service is temporarily unavailable.';
      } else if (statusCode >= 500) {
        message = error.response.data?.detail || 'Internal server error while compiling report data. Please retry.';
      } else if (error.response.data?.detail) {
        message = error.response.data.detail;
      }
    }

    console.error(`[API Error ${statusCode || 'NET'}] ${error.config?.method?.toUpperCase()} ${error.config?.url}:`, message);
    const err = new Error(message) as Error & { status?: number; code?: string };
    err.status = statusCode;
    err.code = error.code;
    return Promise.reject(err);
  }
);

export default apiClient;
