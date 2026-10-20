import {
  AuthSession,
  DecodedJwtPayload,
  LoginRequest,
  LoginResponseData,
  RefreshTokenRequest,
  UserDTO,
} from './types';
import { ApiClientError } from '../../lib/api-client';

export const ACCESS_TOKEN_KEY = 'token';
export const REFRESH_TOKEN_KEY = 'refresh_token';
export const USER_PROFILE_KEY = 'admin_user';

/**
 * Safely parses base64 / base64url encoded string in browser or Node environments.
 */
function base64UrlDecode(str: string): string {
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4 !== 0) {
    base64 += '=';
  }
  if (typeof window !== 'undefined' && typeof window.atob === 'function') {
    const binary = window.atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return new TextDecoder().decode(bytes);
  }
  // Node / test environment fallback
  if (typeof globalThis !== 'undefined' && (globalThis as any).Buffer) {
    return (globalThis as any).Buffer.from(base64, 'base64').toString('utf8');
  }
  return decodeURIComponent(
    atob(base64)
      .split('')
      .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
      .join(''),
  );
}

/**
 * Decodes standard JWT payload without verifying signature (verification is done server-side).
 */
export function parseJwtPayload(token: string): DecodedJwtPayload | null {
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length < 2) return null;

  try {
    const jsonString = base64UrlDecode(parts[1]);
    return JSON.parse(jsonString) as DecodedJwtPayload;
  } catch {
    return null;
  }
}

/**
 * Extracts list of authorities from the JWT `auth` claim (space-delimited string).
 */
export function extractAuthorities(token: string): string[] {
  const payload = parseJwtPayload(token);
  if (!payload || !payload.auth || typeof payload.auth !== 'string') {
    return [];
  }
  return payload.auth.trim().split(/\s+/).filter(Boolean);
}

/**
 * Checks whether the granted authorities contain the required ROLE_ADMIN.
 */
export function hasAdminAuthority(authorities: string[]): boolean {
  return authorities.includes('ROLE_ADMIN');
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Field errors of the login form; an empty object means it can be sent. */
export function validateLogin(email: string, password: string): { email?: string; password?: string } {
  const value = email.trim();
  return {
    ...(!value ? { email: 'Nhập email.' } : !EMAIL.test(value) ? { email: 'Email không đúng định dạng.' } : {}),
    ...(!password ? { password: 'Nhập mật khẩu.' } : {}),
  };
}

/**
 * Checks if the JWT access token is expired or will expire within the buffer window.
 * Default buffer: 30 seconds before actual expiration.
 */
export function isTokenExpired(token: string, bufferSeconds: number = 30): boolean {
  const payload = parseJwtPayload(token);
  if (!payload || typeof payload.exp !== 'number') {
    return true;
  }
  const expiryMs = payload.exp * 1000;
  return Date.now() >= expiryMs - bufferSeconds * 1000;
}

/* =========================================================================
   LOCAL STORAGE HELPERS
   ========================================================================= */

export function getStoredAccessToken(): string | null {
  if (typeof window === 'undefined') return null;
  return (
    localStorage.getItem(ACCESS_TOKEN_KEY) ||
    localStorage.getItem('admin_token') ||
    (typeof sessionStorage !== 'undefined' ? sessionStorage.getItem(ACCESS_TOKEN_KEY) : null) ||
    null
  );
}

export function getStoredRefreshToken(): string | null {
  if (typeof window === 'undefined') return null;
  return (
    localStorage.getItem(REFRESH_TOKEN_KEY) ||
    localStorage.getItem('admin_refresh_token') ||
    null
  );
}

export function getStoredUser(): UserDTO | null {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem(USER_PROFILE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as UserDTO;
  } catch {
    return null;
  }
}

export function saveAuthSession(session: AuthSession): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(ACCESS_TOKEN_KEY, session.accessToken);
  localStorage.setItem(REFRESH_TOKEN_KEY, session.refreshToken);
  localStorage.setItem(USER_PROFILE_KEY, JSON.stringify(session.user));
}

export function clearAuthSession(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem('admin_token');
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  localStorage.removeItem('admin_refresh_token');
  localStorage.removeItem(USER_PROFILE_KEY);
  if (typeof sessionStorage !== 'undefined') {
    sessionStorage.removeItem(ACCESS_TOKEN_KEY);
  }
}

/* =========================================================================
   BACKEND AUTH API CALLS
   ========================================================================= */

/**
 * Calls backend POST /api/auth/login.
 */
export async function loginApi(credentials: LoginRequest): Promise<LoginResponseData> {
  const response = await fetch('/api/auth/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(credentials),
  });

  const contentType = response.headers.get('content-type') || '';
  let payload: any = null;
  if (contentType.includes('application/json')) {
    try {
      payload = await response.json();
    } catch {
      payload = null;
    }
  }

  if (!response.ok) {
    const status = response.status;
    const errorMsg = payload?.error || (status === 401 ? 'Bad credentials' : 'UNKNOWN_ERROR');

    if (status === 401) {
      throw new ApiClientError('Email hoặc mật khẩu không chính xác.', 'INVALID_CREDENTIALS', 401);
    }
    if (status === 403 && errorMsg === 'USER_NOT_ACTIVATED') {
      throw new ApiClientError(
        'Tài khoản chưa được kích hoạt. Vui lòng liên hệ quản trị viên.',
        'ACCOUNT_NOT_ACTIVATED',
        403,
      );
    }
    if (status === 400 && payload?.data && typeof payload.data === 'object') {
      throw new ApiClientError(
        'Dữ liệu đăng nhập không hợp lệ.',
        'VALIDATION_FAILED',
        400,
        payload.data,
      );
    }
    throw new ApiClientError(
      payload?.message || 'Đăng nhập không thành công, vui lòng thử lại.',
      errorMsg,
      status,
    );
  }

  // FormatRestResponse wrapper unwrapping
  const data: LoginResponseData =
    payload && typeof payload === 'object' && 'data' in payload ? payload.data : payload;

  if (!data?.access_token) {
    throw new ApiClientError('Phản hồi từ máy chủ không hợp lệ.', 'INVALID_SERVER_RESPONSE', 500);
  }

  return data;
}

/**
 * Calls backend POST /api/auth/refresh to rotate tokens.
 */
export async function refreshApi(refreshToken: string): Promise<LoginResponseData> {
  const body: RefreshTokenRequest = { refreshToken };
  const response = await fetch('/api/auth/refresh', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(body),
  });

  const contentType = response.headers.get('content-type') || '';
  let payload: any = null;
  if (contentType.includes('application/json')) {
    try {
      payload = await response.json();
    } catch {
      payload = null;
    }
  }

  if (!response.ok) {
    throw new ApiClientError(
      'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.',
      'REFRESH_TOKEN_EXPIRED',
      response.status,
    );
  }

  const data: LoginResponseData =
    payload && typeof payload === 'object' && 'data' in payload ? payload.data : payload;

  if (!data?.access_token) {
    throw new ApiClientError('Phản hồi làm mới phiên không hợp lệ.', 'INVALID_SERVER_RESPONSE', 500);
  }

  return data;
}
