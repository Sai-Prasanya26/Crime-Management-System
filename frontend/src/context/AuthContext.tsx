import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { User, UserRole, LoginCredentials } from '../types';
import { authApi } from '../api';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (credentials: LoginCredentials) => Promise<User>;
  logout: () => Promise<void>;
  hasRole: (allowedRoles: UserRole[]) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const TOKEN_STORAGE_KEY = 'cms_access_token';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(TOKEN_STORAGE_KEY));
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

      try {
        const userProfile = await authApi.getMe();
        if (isMounted) {
          setUser(userProfile);
          setToken(storedToken);
        }
      } catch {
        console.warn('[Auth] Session token invalid or expired, clearing session.');
        localStorage.removeItem(TOKEN_STORAGE_KEY);
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

  const login = async (credentials: LoginCredentials): Promise<User> => {
    setIsLoading(true);
    try {
      const response = await authApi.login(credentials);
      localStorage.setItem(TOKEN_STORAGE_KEY, response.access_token);
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
      setToken(null);
      setUser(null);
    }
  }, [token]);

  const hasRole = (allowedRoles: UserRole[]): boolean => {
    if (!user) return false;
    return allowedRoles.includes(user.role);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: Boolean(user && token),
        isLoading,
        login,
        logout,
        hasRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;
