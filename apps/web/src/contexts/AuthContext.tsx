import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import type { User, LoginResponse } from '../types/auth.types';
import { authApi } from '../api/auth.api';
import { apiClient } from '../api/client';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (username: string, password?: string) => Promise<LoginResponse>;
  logout: () => Promise<void>;
  hasRole: (roleCodes: string | string[]) => boolean;
  hasPermission: (module: string, action: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('erp_auth_token'));
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const logout = useCallback(async () => {
    try {
      if (token) {
        await authApi.logout();
      }
    } catch {
      // Ignore network errors on logout
    } finally {
      apiClient.setToken(null);
      setToken(null);
      setUser(null);
    }
  }, [token]);

  // Initial user fetch on load if token exists
  useEffect(() => {
    let isMounted = true;

    const initAuth = async () => {
      const storedToken = localStorage.getItem('erp_auth_token');
      if (!storedToken) {
        if (isMounted) {
          setIsLoading(false);
        }
        return;
      }

      try {
        const profile = await authApi.getProfile();
        if (isMounted) {
          const resolvedUser = (profile as any)?.user || profile;
          setUser(resolvedUser);
          setToken(storedToken);
        }
      } catch {
        if (isMounted) {
          apiClient.setToken(null);
          setToken(null);
          setUser(null);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    initAuth();

    const handleUnauthorized = () => {
      apiClient.setToken(null);
      setToken(null);
      setUser(null);
    };

    window.addEventListener('auth:unauthorized', handleUnauthorized);
    return () => {
      isMounted = false;
      window.removeEventListener('auth:unauthorized', handleUnauthorized);
    };
  }, []);

  const login = async (username: string, password?: string) => {
    setIsLoading(true);
    try {
      const response = await authApi.login({ username, password });
      apiClient.setToken(response.token);
      setToken(response.token);
      setUser(response.user);
      return response;
    } finally {
      setIsLoading(false);
    }
  };

  const hasRole = useCallback(
    (roleCodes: string | string[]) => {
      if (!user || !user.roles) return false;
      const codes = Array.isArray(roleCodes) ? roleCodes : [roleCodes];
      return user.roles.some((r) => codes.includes(r.roleCode));
    },
    [user],
  );

  const hasPermission = useCallback(
    (module: string, action: string) => {
      if (!user) return false;
      // Super admin / company admin has all permissions
      if (user.roles?.some((r) => ['super_admin', 'company_admin'].includes(r.roleCode))) {
        return true;
      }
      return !!user.permissions?.some(
        (p) => p.module === module && (p.action === action || p.action === 'all'),
      );
    },
    [user],
  );

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        isAuthenticated: !!user && !!token,
        login,
        logout,
        hasRole,
        hasPermission,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
