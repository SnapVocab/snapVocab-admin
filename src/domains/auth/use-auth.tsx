import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  AuthSession,
  AuthStatus,
  LoginRequest,
  UserDTO,
} from './types';
import {
  clearAuthSession,
  extractAuthorities,
  getStoredAccessToken,
  getStoredRefreshToken,
  getStoredUser,
  hasAdminAuthority,
  isTokenExpired,
  loginApi,
  refreshApi,
  saveAuthSession,
} from './auth-service';
import { onAuthExpired } from '../../lib/api-client';
import { queryClient } from '../../main';

export interface AuthContextValue {
  status: AuthStatus;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isBooting: boolean;
  user: UserDTO | null;
  accessToken: string | null;
  authorities: string[];
  login: (credentials: LoginRequest) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [status, setStatus] = useState<AuthStatus>('booting');
  const [user, setUser] = useState<UserDTO | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [authorities, setAuthorities] = useState<string[]>([]);

  // Restore existing session on initial load
  useEffect(() => {
    let isMounted = true;

    async function restoreSession() {
      const storedToken = getStoredAccessToken();
      const storedRefreshToken = getStoredRefreshToken();

      if (!storedToken) {
        if (isMounted) {
          setStatus('unauthenticated');
        }
        return;
      }

      // Check if token is expired
      if (isTokenExpired(storedToken)) {
        if (!storedRefreshToken) {
          clearAuthSession();
          if (isMounted) setStatus('unauthenticated');
          return;
        }

        try {
          const freshData = await refreshApi(storedRefreshToken);
          const freshAuthorities = extractAuthorities(freshData.access_token);

          if (!hasAdminAuthority(freshAuthorities)) {
            clearAuthSession();
            if (isMounted) setStatus('unauthenticated');
            return;
          }

          const freshSession: AuthSession = {
            accessToken: freshData.access_token,
            refreshToken: freshData.refresh_token,
            user: freshData.user,
            authorities: freshAuthorities,
          };
          saveAuthSession(freshSession);

          if (isMounted) {
            setAccessToken(freshData.access_token);
            setUser(freshData.user);
            setAuthorities(freshAuthorities);
            setStatus('authenticated');
          }
          return;
        } catch {
          clearAuthSession();
          if (isMounted) setStatus('unauthenticated');
          return;
        }
      }

      // Token is valid
      const existingAuthorities = extractAuthorities(storedToken);
      if (!hasAdminAuthority(existingAuthorities)) {
        clearAuthSession();
        if (isMounted) setStatus('unauthenticated');
        return;
      }

      const existingUser = getStoredUser();
      if (isMounted) {
        setAccessToken(storedToken);
        setUser(existingUser);
        setAuthorities(existingAuthorities);
        setStatus('authenticated');
      }
    }

    restoreSession();

    // Subscribe to global 401 unhandled expiry events from apiClient
    const unsubscribe = onAuthExpired(() => {
      clearAuthSession();
      queryClient.clear();
      setStatus('unauthenticated');
      setUser(null);
      setAccessToken(null);
      setAuthorities([]);
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  const login = useCallback(async (credentials: LoginRequest): Promise<void> => {
    const data = await loginApi(credentials);
    const userAuthorities = extractAuthorities(data.access_token);

    // Security Gate: User must have ROLE_ADMIN
    if (!hasAdminAuthority(userAuthorities)) {
      clearAuthSession();
      const error = new Error('Tài khoản không có quyền truy cập hệ thống quản trị.');
      (error as any).code = 'FORBIDDEN_NOT_ADMIN';
      (error as any).statusCode = 403;
      throw error;
    }

    const session: AuthSession = {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      user: data.user,
      authorities: userAuthorities,
    };
    saveAuthSession(session);

    setAccessToken(data.access_token);
    setUser(data.user);
    setAuthorities(userAuthorities);
    setStatus('authenticated');
  }, []);

  const logout = useCallback(() => {
    clearAuthSession();
    try {
      queryClient.clear();
    } catch {
      // Ignored if client already cleaned
    }
    setAccessToken(null);
    setUser(null);
    setAuthorities([]);
    setStatus('unauthenticated');
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      isAuthenticated: status === 'authenticated',
      isAdmin: hasAdminAuthority(authorities),
      isBooting: status === 'booting',
      user,
      accessToken,
      authorities,
      login,
      logout,
    }),
    [status, authorities, user, accessToken, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
