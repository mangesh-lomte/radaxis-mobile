/**
 * RadAxis RIS Mobile — Patient Portal Data Hooks
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { portalService } from '../services/portalService';
import { usePatientAuth } from '../auth/PatientAuthContext';
import {
  AvailableExamination,
  BookAppointmentPayload,
  PatientAppointment,
  PatientReport,
  SlotsResponse,
} from '../types/patient';

export function usePatientAppointments() {
  const { patientToken, isPatientAuthenticated } = usePatientAuth();

  return useQuery<PatientAppointment[]>({
    queryKey: ['patient', 'appointments', patientToken],
    queryFn: () => portalService.getAppointments(patientToken || undefined),
    enabled: isPatientAuthenticated && !!patientToken,
  });
}

export function usePatientReports() {
  const { patientToken, isPatientAuthenticated } = usePatientAuth();

  return useQuery<PatientReport[]>({
    queryKey: ['patient', 'reports', patientToken],
    queryFn: () => portalService.getReports(patientToken || undefined),
    enabled: isPatientAuthenticated && !!patientToken,
  });
}

export function useExaminations(modality?: string) {
  return useQuery<AvailableExamination[]>({
    queryKey: ['patient', 'examinations', modality],
    queryFn: () => portalService.getExaminations(modality),
  });
}

export function useAvailableSlots(modality?: string, date?: string) {
  return useQuery<SlotsResponse>({
    queryKey: ['patient', 'slots', modality, date],
    queryFn: () => portalService.getSlots(modality!, date!),
    enabled: !!modality && !!date,
  });
}

export function useBookAppointment() {
  const queryClient = useQueryClient();
  const { patientToken } = usePatientAuth();

  return useMutation({
    mutationFn: (variables: {
      payload: BookAppointmentPayload;
      examDetails?: AvailableExamination;
      equipmentName?: string;
    }) =>
      portalService.bookAppointment(
        variables.payload,
        variables.examDetails,
        variables.equipmentName,
        patientToken || undefined
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patient', 'appointments'] });
      queryClient.invalidateQueries({ queryKey: ['patient', 'slots'] });
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      queryClient.invalidateQueries({ queryKey: ['worklist'] });
      queryClient.invalidateQueries({ queryKey: ['patients'] });
      queryClient.invalidateQueries({ queryKey: ['receptionQueue'] });
    },
  });
}

export function useRescheduleAppointment() {
  const queryClient = useQueryClient();
  const { patientToken } = usePatientAuth();

  return useMutation({
    mutationFn: (variables: {
      appointmentId: string;
      newStart: string;
      reason?: string;
      durationMinutes?: number;
    }) =>
      portalService.rescheduleAppointment(
        variables.appointmentId,
        variables.newStart,
        variables.reason,
        variables.durationMinutes,
        patientToken || undefined
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patient', 'appointments'] });
      queryClient.invalidateQueries({ queryKey: ['patient', 'slots'] });
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      queryClient.invalidateQueries({ queryKey: ['worklist'] });
    },
  });
}

export function useCancelAppointment() {
  const queryClient = useQueryClient();
  const { patientToken } = usePatientAuth();

  return useMutation({
    mutationFn: (variables: { appointmentId: string; reason: string }) =>
      portalService.cancelAppointment(variables.appointmentId, variables.reason, patientToken || undefined),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patient', 'appointments'] });
      queryClient.invalidateQueries({ queryKey: ['patient', 'slots'] });
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      queryClient.invalidateQueries({ queryKey: ['worklist'] });
    },
  });
}
