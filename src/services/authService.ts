import { apiClient } from './api';
import { secureTokenStorage } from '../auth/secureTokenStorage';
import { AuthResponseData, StaffUser, ApiResponse } from '../types';

export interface HealthResponse {
  status: 'healthy' | 'degraded';
  timestamp: string;
  environment: string;
  version: string;
  database: {
    connected: boolean;
  };
}

export const authService = {
  /**
   * Authenticate clinical staff user via POST /api/v1/auth/login
   */
  login: async (email: string, password: string): Promise<AuthResponseData> => {
    const res = await apiClient<AuthResponseData>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
      skipAuth: true,
    });

    const { token, user } = res.data;

    await Promise.all([
      secureTokenStorage.saveToken(token),
      secureTokenStorage.saveUser(user),
    ]);

    return res.data;
  },

  /**
   * Retrieve current verified staff identity via GET /api/v1/auth/me
   */
  getCurrentUser: async (): Promise<StaffUser> => {
    const res = await apiClient<StaffUser>('/auth/me');
    await secureTokenStorage.saveUser(res.data);
    return res.data;
  },

  /**
   * Clear local session storage
   */
  logout: async (): Promise<void> => {
    await secureTokenStorage.clearAll();
  },

  /**
   * Check production system health via GET /api/v1/health
   */
  getHealth: async (): Promise<HealthResponse> => {
    const res = await apiClient<HealthResponse>('/health', {
      skipAuth: true,
      timeoutMs: 5000,
    });
    return res.data;
  },
};
