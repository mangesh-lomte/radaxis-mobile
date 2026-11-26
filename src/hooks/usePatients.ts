import { useQuery } from '@tanstack/react-query';
import { patientService, PatientListParams } from '../services/patientService';
import { APP_CONFIG } from '../constants/config';
import { PatientListResponse, PatientDetail } from '../types';

export function usePatients(params: PatientListParams = {}) {
  return useQuery<PatientListResponse, Error>({
    queryKey: ['patients', params],
    queryFn: () => patientService.getPatients(params),
    staleTime: APP_CONFIG.staleTimeMs,
    retry: 1,
    refetchOnWindowFocus: false,
  });
}

export function usePatientDetail(id?: string | null) {
  return useQuery<PatientDetail, Error>({
    queryKey: ['patient', id],
    queryFn: () => {
      if (!id) throw new Error('Patient ID is required');
      return patientService.getPatientById(id);
    },
    enabled: !!id,
    staleTime: APP_CONFIG.staleTimeMs,
    retry: 1,
    refetchOnWindowFocus: false,
  });
}
