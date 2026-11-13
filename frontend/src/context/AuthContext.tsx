import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import type { User, UserRole, LoginCredentials } from '../types';
import { authApi } from '../api';
import { isTokenExpired } from '../utils/jwt';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (credentials: LoginCredentials) => Promise<User>;
  logout: () => Promise<void>;
  updateUser: (updatedUser: User) => void;
  refreshUser: () => Promise<User>;
  hasRole: (allowedRoles: UserRole[]) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const TOKEN_STORAGE_KEY = 'cms_access_token';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const navigate = useNavigate();

  // Initialize token from storage, immediately evicting if already expired
  const [token, setToken] = useState<string | null>(() => {
    const stored = localStorage.getItem(TOKEN_STORAGE_KEY);
    if (!stored) return null;
    if (isTokenExpired(stored)) {
      console.warn('[Auth] Evicting stale/expired token found in localStorage during bootstrap.');
      localStorage.removeItem(TOKEN_STORAGE_KEY);
      sessionStorage.setItem('cms_session_expired', 'true');
      return null;
    }
    return stored;
  });

  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Initialize and validate session on mount
  useEffect(() => {
    let isMounted = true;

    const initializeAuth = async () => {
      const storedToken = localStorage.getItem(TOKEN_STORAGE_KEY);
      if (!storedToken) {
        if (isMounted) setIsLoading(false);
        return;
      }

      // Check client-side expiry before emitting an unnecessary backend request
      if (isTokenExpired(storedToken)) {
        console.warn('[Auth] Stored session token is expired. Clearing local session state.');
        localStorage.removeItem(TOKEN_STORAGE_KEY);
        sessionStorage.setItem('cms_session_expired', 'true');
        if (isMounted) {
          setToken(null);
          setUser(null);
          setIsLoading(false);
        }
        return;
      }

      try {
        const userProfile = await authApi.getMe();
        if (isMounted) {
          setUser(userProfile);
          setToken(storedToken);
        }
      } catch (err: unknown) {
        console.warn('[Auth] Session token validation failed on backend. Clearing session:', err);
        localStorage.removeItem(TOKEN_STORAGE_KEY);
        sessionStorage.setItem('cms_session_expired', 'true');
        if (isMounted) {
          setToken(null);
          setUser(null);
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    initializeAuth();
    return () => {
      isMounted = false;
    };
  }, []);

  // Listen for unauthorized/expired custom event dispatched from Axios interceptors
  useEffect(() => {
    const handleUnauthorized = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      console.warn('[Auth] Received unauthorized signal:', detail?.reason || 'unauthorized');
      localStorage.removeItem(TOKEN_STORAGE_KEY);
      setToken(null);
      setUser(null);

      const currentPath = window.location.pathname;
      if (currentPath !== '/login' && currentPath !== '/') {
        navigate('/login', {
          replace: true,
          state: {
            sessionExpired: true,
            from: { pathname: currentPath, search: window.location.search },
          },
        });
      }
    };

    window.addEventListener('cms:auth-unauthorized', handleUnauthorized);
    return () => {
      window.removeEventListener('cms:auth-unauthorized', handleUnauthorized);
    };
  }, [navigate]);

  // Periodic passive session check every 30 seconds for active tabs
  useEffect(() => {
    if (!token) return;

    const intervalId = setInterval(() => {
      if (isTokenExpired(token)) {
        console.warn('[Auth] Active session token expired during idle period. Redirecting to login.');
        localStorage.removeItem(TOKEN_STORAGE_KEY);
        sessionStorage.setItem('cms_session_expired', 'true');
        setToken(null);
        setUser(null);

        const currentPath = window.location.pathname;
        if (currentPath !== '/login' && currentPath !== '/') {
          navigate('/login', {
            replace: true,
            state: {
              sessionExpired: true,
              from: { pathname: currentPath, search: window.location.search },
            },
          });
        }
      }
    }, 30000);

    return () => clearInterval(intervalId);
  }, [token, navigate]);

  const login = async (credentials: LoginCredentials): Promise<User> => {
    setIsLoading(true);
    try {
      const response = await authApi.login(credentials);
      localStorage.setItem(TOKEN_STORAGE_KEY, response.access_token);
      sessionStorage.removeItem('cms_session_expired');
      setToken(response.access_token);
      setUser(response.user);
      return response.user;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = useCallback(async () => {
    try {
      if (token) {
        await authApi.logout();
      }
    } catch (err) {
      console.warn('[Auth] Logout audit call completed with error:', err);
    } finally {
      localStorage.removeItem(TOKEN_STORAGE_KEY);
      sessionStorage.removeItem('cms_session_expired');
      setToken(null);
      setUser(null);
    }
  }, [token]);

  const updateUser = useCallback((updatedUser: User) => {
    setUser(updatedUser);
  }, []);

  const refreshUser = useCallback(async (): Promise<User> => {
    const profile = await authApi.getMe();
    setUser(profile);
    return profile;
  }, []);

  const hasRole = (allowedRoles: UserRole[]): boolean => {
    if (!user) return false;
    return allowedRoles.includes(user.role);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: Boolean(user && token && !isTokenExpired(token)),
        isLoading,
        login,
        logout,
        updateUser,
        refreshUser,
        hasRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

// oxlint-disable-next-line react/only-export-components
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;
