/**
 * RadAxis RIS Mobile — Reception & Scheduling Hooks
 * React Query hooks for fetching reception queues, appointments, ready reports, and machine slots
 */

import { useQuery } from '@tanstack/react-query';
import { receptionService } from '../services/receptionService';
import {
  AppointmentListParams,
  PaginatedAppointmentsResponse,
  ReadyReportItem,
  ReceptionQueueParams,
  SlotAvailabilityData,
  StaffAppointmentItem,
} from '../types/reception';
import { ModalityType } from '../types';

export function useWaitingQueue(params: ReceptionQueueParams = {}) {
  return useQuery<StaffAppointmentItem[], Error>({
    queryKey: ['receptionQueue', params.date, params.modality],
    queryFn: () => receptionService.getWaitingQueue(params),
    staleTime: 15 * 1000, // 15 seconds
    refetchInterval: 20 * 1000, // Periodic queue refresh
  });
}

export function useAppointments(params: AppointmentListParams = {}) {
  return useQuery<PaginatedAppointmentsResponse, Error>({
    queryKey: [
      'appointments',
      params.date,
      params.dateFrom,
      params.dateTo,
      params.modality,
      params.status,
      params.search,
      params.equipmentId,
      params.page,
      params.pageSize,
    ],
    queryFn: () => receptionService.getAppointments(params),
    staleTime: 30 * 1000,
  });
}

export function useAppointmentDetail(id?: string) {
  return useQuery<StaffAppointmentItem, Error>({
    queryKey: ['appointmentDetail', id],
    queryFn: () => receptionService.getAppointment(id!),
    enabled: !!id,
    staleTime: 30 * 1000,
  });
}

export function useReadyReports() {
  return useQuery<ReadyReportItem[], Error>({
    queryKey: ['readyReports'],
    queryFn: () => receptionService.getReadyReports(),
    staleTime: 20 * 1000,
  });
}

export function useSlotAvailability(params: {
  modality?: ModalityType;
  date?: string;
  equipmentId?: string;
}) {
  return useQuery<SlotAvailabilityData, Error>({
    queryKey: ['slotAvailability', params.modality, params.date, params.equipmentId],
    queryFn: () =>
      receptionService.getSlotAvailability({
        modality: params.modality!,
        date: params.date!,
        equipmentId: params.equipmentId,
      }),
    enabled: !!params.modality && !!params.date,
    staleTime: 60 * 1000,
  });
}
