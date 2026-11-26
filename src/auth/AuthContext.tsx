import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { StaffUser } from '../types';
import { authService } from '../services/authService';
import { secureTokenStorage } from './secureTokenStorage';
import { setUnauthorizedHandler } from '../services/api';

interface AuthContextValue {
  user: StaffUser | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  sessionExpiredMessage: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  restoreSession: () => Promise<void>;
  clearSessionExpiredMessage: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const [user, setUser] = useState<StaffUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [sessionExpiredMessage, setSessionExpiredMessage] = useState<string | null>(null);

  const clearSessionExpiredMessage = useCallback(() => {
    setSessionExpiredMessage(null);
  }, []);

  const logout = useCallback(async () => {
    try {
      await authService.logout();
    } finally {
      setToken(null);
      setUser(null);
      queryClient.clear();
    }
  }, [queryClient]);

  const restoreSession = useCallback(async () => {
    setIsLoading(true);
    try {
      const storedToken = await secureTokenStorage.getToken();
      if (!storedToken) {
        setUser(null);
        setToken(null);
        return;
      }

      // Verify token and fetch fresh user profile from backend
      try {
        const verifiedUser = await authService.getCurrentUser();
        setToken(storedToken);
        setUser(verifiedUser);
        setSessionExpiredMessage(null);
      } catch (err: any) {
        // Token invalid, expired, or user deactivated
        await secureTokenStorage.clearAll();
        setToken(null);
        setUser(null);
        queryClient.clear();
        if (err?.statusCode === 401) {
          setSessionExpiredMessage('Your session has expired. Please sign in again.');
        }
      }
    } finally {
      setIsLoading(false);
    }
  }, [queryClient]);

  // Listen to 401s from the API client
  useEffect(() => {
    setUnauthorizedHandler((message: string) => {
      setUser(null);
      setToken(null);
      queryClient.clear();
      setSessionExpiredMessage(message);
    });

    return () => {
      setUnauthorizedHandler(null);
    };
  }, [queryClient]);

  // Restore session on initial mount
  useEffect(() => {
    restoreSession();
  }, [restoreSession]);

  const login = useCallback(async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const result = await authService.login(email, password);
      setToken(result.token);
      setUser(result.user);
      setSessionExpiredMessage(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        isAuthenticated: !!token && !!user,
        sessionExpiredMessage,
        login,
        logout,
        restoreSession,
        clearSessionExpiredMessage,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used inside <AuthProvider>');
  }
  return ctx;
}
