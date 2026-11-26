/**
 * RadAxis RIS Mobile — Patient Portal Service
 * Interacts with backend /api/v1/portal/patient REST endpoints
 * Includes strict fail-closed production mutation guards for booking, rescheduling, and cancellation
 */

import { API_BASE_URL, APP_CONFIG } from '../constants/config';
import { isMutationAllowed, isAuthEndpoint, isAuthorizedWriteEndpoint, isProductionHost, MUTATION_GUARD_MESSAGE, DEMO_IDENTIFIER_PREFIX } from '../constants/environment';
import { securePatientTokenStorage } from '../auth/securePatientTokenStorage';
import { ApiError } from './api';
import {
  AvailableExamination,
  BookAppointmentPayload,
  BookingResult,
  MutationResult,
  OtpRequestResponse,
  OtpVerifyResponse,
  PatientAppointment,
  PatientReport,
  PatientViewerLaunch,
  SlotsResponse,
} from '../types/patient';

/**
 * Production Host Check
 */
export const isProductionTarget = (url: string = API_BASE_URL): boolean => {
  return isProductionHost(url);
};

async function fetchPortal<T>(
  endpoint: string,
  options: {
    method?: string;
    body?: any;
    token?: string | null;
    customHeaders?: Record<string, string>;
  } = {}
): Promise<T> {
  if (!API_BASE_URL) {
    throw new ApiError('RadAxis API Base URL is not configured', 0, 'CONFIG_ERROR');
  }

  const { method = 'GET', body, token: explicitToken, customHeaders = {} } = options;
  const token = explicitToken !== undefined ? explicitToken : await securePatientTokenStorage.getToken();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    ...customHeaders,
  };

  if (token && !headers['Authorization']) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const normalizedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const fullUrl = `${API_BASE_URL}${normalizedEndpoint}`;

  // Fail-closed production mutation guard with authorized write endpoint exceptions
  const requestMethod = method.toUpperCase();
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(requestMethod)) {
    if (!isAuthorizedWriteEndpoint(normalizedEndpoint) && !isAuthEndpoint(normalizedEndpoint) && !isMutationAllowed(fullUrl, normalizedEndpoint)) {
      throw new ApiError(MUTATION_GUARD_MESSAGE, 403, 'MUTATION_GUARD_ACTIVE');
    }
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), APP_CONFIG.requestTimeoutMs);

  let response: Response;
  try {
    response = await fetch(fullUrl, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });
  } catch (err: any) {
    clearTimeout(timeoutId);
    if (err?.name === 'AbortError') {
      throw new ApiError('Request timed out. RIS server did not respond.', 408, 'TIMEOUT', undefined, false, true);
    }
    throw new ApiError('Unable to connect to the RIS server.', 0, 'NETWORK_ERROR', undefined, true, false);
  } finally {
    clearTimeout(timeoutId);
  }

  let json: any = null;
  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    try {
      json = await response.json();
    } catch {
      json = null;
    }
  }

  if (response.status === 401) {
    const code = json?.error?.code || 'UNAUTHORIZED';
    const message = json?.message || 'Your patient session has expired. Please verify your mobile phone again.';
    throw new ApiError(message, 401, code);
  }

  if (response.status === 403) {
    throw new ApiError('Access restricted to verified patient accounts.', 403, 'FORBIDDEN');
  }

  if (!response.ok || (json && json.success === false)) {
    const message = json?.message || `Request failed with status ${response.status}`;
    const code = json?.error?.code || 'API_ERROR';
    throw new ApiError(message, response.status, code, json?.error?.details);
  }

  return (json?.data !== undefined ? json.data : json) as T;
}

export const portalService = {
  /**
   * Reset in-memory session state (no-op stub for backward compatibility)
   */
  resetSessionOverlay: () => {
    // No-op: all patient state is derived directly from authorized backend data
  },

  /**
   * Request a 6-digit OTP for patient phone login
   */
  requestOtp: async (phone: string): Promise<OtpRequestResponse> => {
    return fetchPortal<OtpRequestResponse>('/portal/patient/request-otp', {
      method: 'POST',
      body: { phone: phone.trim() },
    });
  },

  /**
   * Verify 6-digit OTP and obtain patient JWT and profile
   * Supports authorized patient self-registration and authentication
   */
  verifyOtp: async (params: {
    phone: string;
    otp: string;
    firstName?: string;
    lastName?: string;
    dateOfBirth?: string;
    gender?: string;
  }): Promise<OtpVerifyResponse> => {
    return fetchPortal<OtpVerifyResponse>('/portal/patient/verify-otp', {
      method: 'POST',
      body: {
        phone: params.phone.trim(),
        otp: params.otp.trim(),
        firstName: params.firstName?.trim(),
        lastName: params.lastName?.trim(),
        dateOfBirth: params.dateOfBirth?.trim(),
        gender: params.gender,
      },
    });
  },

  /**
   * Retrieve list of real appointments for the authenticated patient directly from backend
   */
  getAppointments: async (token?: string): Promise<PatientAppointment[]> => {
    return fetchPortal<PatientAppointment[]>('/portal/patient/appointments', { token });
  },

  /**
   * Retrieve available examination catalog
   */
  getExaminations: async (modality?: string): Promise<AvailableExamination[]> => {
    const query = modality && modality !== 'ALL' ? `?modality=${encodeURIComponent(modality)}` : '';
    return fetchPortal<AvailableExamination[]>(`/portal/patient/examinations${query}`);
  },

  /**
   * Retrieve available time slots for a given modality and date
   */
  getSlots: async (modality: string, date: string): Promise<SlotsResponse> => {
    const query = `?modality=${encodeURIComponent(modality)}&date=${encodeURIComponent(date)}`;
    return fetchPortal<SlotsResponse>(`/portal/patient/slots${query}`);
  },

  /**
   * Book an examination appointment
   * Dispatches to authorized backend POST /portal/patient/book with genuine PostgreSQL persistence
   */
  bookAppointment: async (
    payload: BookAppointmentPayload,
    _examDetails?: AvailableExamination,
    _equipmentName?: string,
    token?: string
  ): Promise<BookingResult> => {
    const rawResult = await fetchPortal<{
      appointment: PatientAppointment;
      accessionNumber: string;
      patientId: string;
      notificationsSent?: unknown[];
    }>('/portal/patient/book', {
      method: 'POST',
      body: payload,
      token,
    });

    return {
      success: true,
      message: 'Appointment booked successfully',
      appointment: rawResult.appointment,
      accessionNumber: rawResult.accessionNumber,
      patientId: rawResult.patientId,
      isLocalDemonstration: false,
    };
  },

  /**
   * Reschedule an existing appointment via backend
   */
  rescheduleAppointment: async (
    appointmentId: string,
    newStart: string,
    reason?: string,
    _durationMinutes: number = 30,
    token?: string
  ): Promise<MutationResult> => {
    return fetchPortal<MutationResult>(`/portal/patient/appointments/${appointmentId}/reschedule`, {
      method: 'POST',
      body: { newStart, reason },
      token,
    });
  },

  /**
   * Cancel an appointment via backend
   */
  cancelAppointment: async (
    appointmentId: string,
    reason: string,
    token?: string
  ): Promise<MutationResult> => {
    return fetchPortal<MutationResult>(`/portal/patient/appointments/${appointmentId}/cancel`, {
      method: 'POST',
      body: { reason },
      token,
    });
  },

  /**
   * Retrieve finalized diagnostic reports for the authenticated patient
   */
  getReports: async (token?: string): Promise<PatientReport[]> => {
    return fetchPortal<PatientReport[]>('/portal/patient/reports', { token });
  },

  /**
   * Retrieve authorized OHIF DICOM Viewer URL for an accession number
   */
  getReportViewerUrl: async (accessionNumber: string, token?: string): Promise<PatientViewerLaunch> => {
    return fetchPortal<PatientViewerLaunch>(
      `/portal/patient/reports/${encodeURIComponent(accessionNumber.trim())}/viewer`,
      { token }
    );
  },

  /**
   * Verify authorized PDF stream metadata for a patient report
   */
  verifyReportPdfAccess: async (
    accessionNumber: string,
    explicitToken?: string
  ): Promise<{ filename: string; fileSizeBytes: number; contentType: string }> => {
    const token = explicitToken !== undefined ? explicitToken : await securePatientTokenStorage.getToken();
    if (!token) {
      throw new ApiError('Patient authentication required to access report PDF', 401, 'UNAUTHORIZED');
    }

    const endpoint = `${API_BASE_URL}/portal/patient/reports/${encodeURIComponent(accessionNumber.trim())}/pdf`;
    const res = await fetch(endpoint, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/pdf',
      },
    });

    if (!res.ok) {
      let errorMsg = `Unable to retrieve report PDF (${res.status} ${res.statusText})`;
      try {
        const json = await res.json();
        if (json?.message) errorMsg = json.message;
      } catch {
        // Not JSON
      }
      throw new ApiError(errorMsg, res.status);
    }

    const contentType = res.headers.get('content-type') || 'application/pdf';
    const contentLength = parseInt(res.headers.get('content-length') || '0', 10);
    const disposition = res.headers.get('content-disposition') || '';
    const match = disposition.match(/filename="?([^";]+)"?/);
    const filename = match ? match[1] : `patient_report_${accessionNumber}.pdf`;

    return {
      filename,
      fileSizeBytes: contentLength,
      contentType,
    };
  },
};
