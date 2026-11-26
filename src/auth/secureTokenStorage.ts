import * as SecureStore from 'expo-secure-store';
import { StaffUser } from '../types';
import { APP_CONFIG } from '../constants/config';

const TOKEN_KEY = APP_CONFIG.tokenKey;
const USER_KEY = APP_CONFIG.userKey;

export const secureTokenStorage = {
  saveToken: async (token: string): Promise<void> => {
    await SecureStore.setItemAsync(TOKEN_KEY, token);
  },

  getToken: async (): Promise<string | null> => {
    try {
      return await SecureStore.getItemAsync(TOKEN_KEY);
    } catch {
      return null;
    }
  },

  deleteToken: async (): Promise<void> => {
    try {
      await SecureStore.deleteItemAsync(TOKEN_KEY);
    } catch {
      // Ignored if missing
    }
  },

  saveUser: async (user: StaffUser): Promise<void> => {
    await SecureStore.setItemAsync(USER_KEY, JSON.stringify(user));
  },

  getUser: async (): Promise<StaffUser | null> => {
    try {
      const raw = await SecureStore.getItemAsync(USER_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  },

  deleteUser: async (): Promise<void> => {
    try {
      await SecureStore.deleteItemAsync(USER_KEY);
    } catch {
      // Ignored if missing
    }
  },

  clearAll: async (): Promise<void> => {
    try {
      await SecureStore.deleteItemAsync(TOKEN_KEY);
    } catch {
      // Ignored
    }
    try {
      await SecureStore.deleteItemAsync(USER_KEY);
    } catch {
      // Ignored
    }
  },
};
