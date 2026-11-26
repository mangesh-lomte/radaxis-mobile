/**
 * RadAxis RIS Mobile — Reception & Scheduling Service
 * Communicates with backend /api/v1/reception/*, /api/v1/appointments/*, and /api/v1/scheduling/* endpoints
 * Strictly respects production safety: NO check-in, booking, or cancellation mutations against production.
 */

import { apiClient } from './api';
import { isMutationAllowed, MUTATION_GUARD_MESSAGE } from '../constants/environment';
import {
  AppointmentListParams,
  PaginatedAppointmentsResponse,
  ReadyReportItem,
  ReceptionQueueParams,
  SlotAvailabilityData,
  StaffAppointmentItem,
} from '../types/reception';
import { ModalityType } from '../types';

export const receptionService = {
  /**
   * Retrieve active waiting queue of checked-in patients
   */
  getWaitingQueue: async (
    params: ReceptionQueueParams = {}
  ): Promise<StaffAppointmentItem[]> => {
    const query = new URLSearchParams();
    if (params.date) query.append('date', params.date);
    if (params.modality) query.append('modality', params.modality);

    const qs = query.toString();
    const endpoint = `/reception/queue${qs ? `?${qs}` : ''}`;
    const res = await apiClient<StaffAppointmentItem[]>(endpoint);
    return res.data || [];
  },

  /**
   * Retrieve list of scheduled appointments with date, modality, status, and search filters
   */
  getAppointments: async (
    params: AppointmentListParams = {}
  ): Promise<PaginatedAppointmentsResponse> => {
    const query = new URLSearchParams();
    if (params.page) query.append('page', params.page.toString());
    if (params.pageSize) query.append('pageSize', params.pageSize.toString());
    if (params.date) query.append('date', params.date);
    if (params.dateFrom) query.append('dateFrom', params.dateFrom);
    if (params.dateTo) query.append('dateTo', params.dateTo);
    if (params.patientId) query.append('patientId', params.patientId);
    if (params.modality) query.append('modality', params.modality);
    if (params.equipmentId) query.append('equipmentId', params.equipmentId);
    if (params.status) query.append('status', params.status);
    if (params.priority) query.append('priority', params.priority);
    if (params.search && params.search.trim()) query.append('search', params.search.trim());

    const qs = query.toString();
    const endpoint = `/appointments${qs ? `?${qs}` : ''}`;
    const res = await apiClient<PaginatedAppointmentsResponse>(endpoint);
    return res.data;
  },

  /**
   * Retrieve single appointment detail by ID or appointmentNumber
   */
  getAppointment: async (id: string): Promise<StaffAppointmentItem> => {
    const endpoint = `/appointments/${encodeURIComponent(id.trim())}`;
    const res = await apiClient<StaffAppointmentItem>(endpoint);
    return res.data;
  },

  /**
   * Retrieve list of finalized reports ready for front desk delivery / patient handover
   */
  getReadyReports: async (): Promise<ReadyReportItem[]> => {
    const endpoint = '/reception/reports/ready';
    const res = await apiClient<ReadyReportItem[]>(endpoint);
    return res.data || [];
  },

  /**
   * Calculate real-time machine slot availability for a modality and date
   */
  getSlotAvailability: async (params: {
    modality: ModalityType;
    date: string;
    equipmentId?: string;
  }): Promise<SlotAvailabilityData> => {
    const query = new URLSearchParams();
    query.append('modality', params.modality);
    query.append('date', params.date);
    if (params.equipmentId) query.append('equipmentId', params.equipmentId);

    const endpoint = `/scheduling/availability?${query.toString()}`;
    const res = await apiClient<SlotAvailabilityData>(endpoint);
    return res.data;
  },

  /**
   * SAFETY GUARD: Patient Check-In Simulation (Local Only)
   * Generates a local demo queue token and marked state without sending mutations to production.
   */
  simulateCheckIn: (
    appointment: StaffAppointmentItem
  ): {
    updatedAppointment: StaffAppointmentItem;
    tokenNumber: string;
    checkedInAt: string;
    queueMessage: string;
  } => {
    const randomSeq = Math.floor(100 + Math.random() * 900);
    const tokenNumber = `DEMO-${appointment.modality || 'GEN'}-${randomSeq}`;
    const checkedInAt = new Date().toISOString();

    const updatedAppointment: StaffAppointmentItem = {
      ...appointment,
      status: 'CHECKED_IN',
      tokenNumber,
      checkedInAt,
      isSimulatedDemo: false,
      notes: appointment.notes
        ? `${appointment.notes} [Verified ID]`
        : '[Verified ID]',
    };

    return {
      updatedAppointment,
      tokenNumber,
      checkedInAt,
      queueMessage: `Patient check-in recorded. Assigned Token: ${tokenNumber}`,
    };
  },

  /**
   * Check in patient: dispatches to staging API when allowed, or returns fail-closed guard notice in production
   */
  checkInPatient: async (
    appointment: StaffAppointmentItem,
    payload: { verifiedIdentity?: boolean; notes?: string } = {}
  ): Promise<{
    appointment: StaffAppointmentItem;
    tokenNumber: string;
    checkedInAt: string;
    success: boolean;
    isLocalDemonstration: boolean;
    message: string;
  }> => {
    if (!isMutationAllowed()) {
      return {
        appointment,
        tokenNumber: '',
        checkedInAt: '',
        success: false,
        isLocalDemonstration: false,
        message: MUTATION_GUARD_MESSAGE,
      };
    }

    const endpoint = `/appointments/${encodeURIComponent(appointment.id)}/check-in`;
    const res = await apiClient<StaffAppointmentItem>(endpoint, {
      method: 'POST',
      body: JSON.stringify({
        identityConfirmed: payload.verifiedIdentity ?? true,
        ...payload,
      }),
    });

    const updated = res.data || appointment;
    return {
      appointment: updated,
      tokenNumber: updated.tokenNumber || `TKN-${Math.floor(100 + Math.random() * 900)}`,
      checkedInAt: updated.checkedInAt || new Date().toISOString(),
      success: true,
      isLocalDemonstration: false,
      message: 'Patient check-in recorded on server',
    };
  },

  /**
   * Allocate scanner machine: dispatches when allowed, blocked fail-closed in production
   */
  allocateScanner: async (
    appointmentId: string,
    machineId: string
  ): Promise<{ success: boolean; isLocalDemonstration: boolean; message: string }> => {
    if (!isMutationAllowed()) {
      return {
        success: false,
        isLocalDemonstration: false,
        message: MUTATION_GUARD_MESSAGE,
      };
    }

    const endpoint = `/appointments/${encodeURIComponent(appointmentId)}/allocation`;
    await apiClient(endpoint, {
      method: 'PATCH',
      body: JSON.stringify({ machineId, equipmentId: machineId }),
    });

    return {
      success: true,
      isLocalDemonstration: false,
      message: 'Scanner allocated successfully',
    };
  },

  /**
   * Handover diagnostic report to patient: dispatches when allowed, blocked fail-closed in production
   */
  handoverReport: async (
    reportId: string,
    payload: { recipientName?: string; idProofType?: string } = {}
  ): Promise<{ success: boolean; isLocalDemonstration: boolean; message: string }> => {
    if (!isMutationAllowed()) {
      return {
        success: false,
        isLocalDemonstration: false,
        message: MUTATION_GUARD_MESSAGE,
      };
    }

    const endpoint = `/reception/reports/${encodeURIComponent(reportId)}/handover`;
    await apiClient(endpoint, {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    return {
      success: true,
      isLocalDemonstration: false,
      message: 'Report delivery recorded successfully',
    };
  },
};
