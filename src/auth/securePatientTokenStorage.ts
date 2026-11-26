import * as SecureStore from 'expo-secure-store';
import { PatientProfile } from '../types/patient';

const isStaging = process.env.EXPO_PUBLIC_APP_ENV?.toLowerCase().trim() === 'staging';

const PATIENT_TOKEN_KEY = isStaging ? 'radaxis_staging_patient_token' : 'radaxis_patient_token';
const PATIENT_PROFILE_KEY = isStaging ? 'radaxis_staging_patient_profile' : 'radaxis_patient_profile';

export const securePatientTokenStorage = {
  saveToken: async (token: string): Promise<void> => {
    await SecureStore.setItemAsync(PATIENT_TOKEN_KEY, token);
  },

  getToken: async (): Promise<string | null> => {
    try {
      return await SecureStore.getItemAsync(PATIENT_TOKEN_KEY);
    } catch {
      return null;
    }
  },

  deleteToken: async (): Promise<void> => {
    try {
      await SecureStore.deleteItemAsync(PATIENT_TOKEN_KEY);
    } catch {
      // Ignored
    }
  },

  savePatient: async (patient: PatientProfile): Promise<void> => {
    await SecureStore.setItemAsync(PATIENT_PROFILE_KEY, JSON.stringify(patient));
  },

  getPatient: async (): Promise<PatientProfile | null> => {
    try {
      const raw = await SecureStore.getItemAsync(PATIENT_PROFILE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  },

  deletePatient: async (): Promise<void> => {
    try {
      await SecureStore.deleteItemAsync(PATIENT_PROFILE_KEY);
    } catch {
      // Ignored
    }
  },

  clearAll: async (): Promise<void> => {
    try {
      await SecureStore.deleteItemAsync(PATIENT_TOKEN_KEY);
    } catch {
      // Ignored
    }
    try {
      await SecureStore.deleteItemAsync(PATIENT_PROFILE_KEY);
    } catch {
      // Ignored
    }
  },
};
