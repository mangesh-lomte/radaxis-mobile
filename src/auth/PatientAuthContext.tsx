import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { OtpRequestResponse, PatientProfile } from '../types/patient';
import { portalService } from '../services/portalService';
import { securePatientTokenStorage } from './securePatientTokenStorage';
import { ApiError } from '../services/api';

interface PatientAuthContextValue {
  patient: PatientProfile | null;
  patientToken: string | null;
  isPatientLoading: boolean;
  isPatientAuthenticated: boolean;
  patientSessionExpiredMessage: string | null;
  requestOtp: (phone: string) => Promise<OtpRequestResponse>;
  verifyOtp: (params: {
    phone: string;
    otp: string;
    firstName?: string;
    lastName?: string;
    dateOfBirth?: string;
    gender?: string;
  }) => Promise<void>;
  patientLogout: () => Promise<void>;
  restorePatientSession: () => Promise<void>;
  clearPatientSessionExpiredMessage: () => void;
}

const PatientAuthContext = createContext<PatientAuthContextValue | null>(null);

export function PatientAuthProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const [patient, setPatient] = useState<PatientProfile | null>(null);
  const [patientToken, setPatientToken] = useState<string | null>(null);
  const [isPatientLoading, setIsPatientLoading] = useState<boolean>(true);
  const [patientSessionExpiredMessage, setPatientSessionExpiredMessage] = useState<string | null>(null);

  const clearPatientSessionExpiredMessage = useCallback(() => {
    setPatientSessionExpiredMessage(null);
  }, []);

  const patientLogout = useCallback(async () => {
    try {
      await securePatientTokenStorage.clearAll();
    } finally {
      setPatientToken(null);
      setPatient(null);
      portalService.resetSessionOverlay();
      queryClient.clear();
    }
  }, [queryClient]);

  const restorePatientSession = useCallback(async () => {
    setIsPatientLoading(true);
    try {
      const storedToken = await securePatientTokenStorage.getToken();
      const storedProfile = await securePatientTokenStorage.getPatient();

      if (!storedToken || !storedProfile) {
        setPatient(null);
        setPatientToken(null);
        return;
      }

      // Verify token freshness against backend appointments endpoint
      try {
        await portalService.getAppointments(storedToken);
        setPatientToken(storedToken);
        setPatient(storedProfile);
        setPatientSessionExpiredMessage(null);
      } catch (err: unknown) {
        if (err instanceof ApiError && err.statusCode === 401) {
          await securePatientTokenStorage.clearAll();
          setPatient(null);
          setPatientToken(null);
          portalService.resetSessionOverlay();
          queryClient.clear();
          setPatientSessionExpiredMessage('Your patient session has expired. Please sign in again.');
        } else {
          // Network fluctuation: preserve offline cached profile
          setPatientToken(storedToken);
          setPatient(storedProfile);
        }
      }
    } finally {
      setIsPatientLoading(false);
    }
  }, [queryClient]);

  useEffect(() => {
    restorePatientSession();
  }, [restorePatientSession]);

  const requestOtp = useCallback(async (phone: string): Promise<OtpRequestResponse> => {
    return portalService.requestOtp(phone);
  }, []);

  const verifyOtp = useCallback(
    async (params: {
      phone: string;
      otp: string;
      firstName?: string;
      lastName?: string;
      dateOfBirth?: string;
      gender?: string;
    }): Promise<void> => {
      setIsPatientLoading(true);
      try {
        const result = await portalService.verifyOtp(params);
        await securePatientTokenStorage.saveToken(result.token);
        await securePatientTokenStorage.savePatient(result.patient);
        setPatientToken(result.token);
        setPatient(result.patient);
        setPatientSessionExpiredMessage(null);
      } finally {
        setIsPatientLoading(false);
      }
    },
    []
  );

  return (
    <PatientAuthContext.Provider
      value={{
        patient,
        patientToken,
        isPatientLoading,
        isPatientAuthenticated: !!patientToken && !!patient,
        patientSessionExpiredMessage,
        requestOtp,
        verifyOtp,
        patientLogout,
        restorePatientSession,
        clearPatientSessionExpiredMessage,
      }}
    >
      {children}
    </PatientAuthContext.Provider>
  );
}

export function usePatientAuth(): PatientAuthContextValue {
  const ctx = useContext(PatientAuthContext);
  if (!ctx) {
    throw new Error('usePatientAuth must be used inside <PatientAuthProvider>');
  }
  return ctx;
}
