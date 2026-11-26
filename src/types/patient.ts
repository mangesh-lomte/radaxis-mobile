/**
 * RadAxis RIS Mobile — Patient Portal Domain Types
 * Matches backend /api/v1/portal/patient/* response contracts
 */

export interface PatientProfile {
  id: string;
  patientId: string; // e.g. PAT-2026-10001
  firstName: string;
  lastName: string;
  phone: string;
  dateOfBirth: string;
  gender: string;
}

export interface OtpRequestResponse {
  success: boolean;
  message: string;
  phone: string;
  isExistingPatient: boolean;
  demoOtp: string;
}

export interface OtpVerifyResponse {
  token: string;
  patient: PatientProfile;
}

export interface PatientAppointment {
  id: string;
  appointmentNumber: string;
  examination: string;
  modality: string;
  scheduledStart: string;
  scheduledEnd: string;
  durationMinutes: number;
  status: string; // 'BOOKED' | 'CONFIRMED' | 'CHECKED_IN' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED'
  priority: string;
  equipmentName?: string;
  accessionNumber?: string;
  orderStatus?: string;
  isReportFinalized?: boolean;
  studyInstanceUid?: string;
  hasImages?: boolean;
  patientId?: string;
  notesData?: {
    raw?: string;
    clinicalNotes?: string;
    preparationInstructions?: string;
    patientId?: string;
  };
}

export interface AvailableExamination {
  id: string;
  code: string;
  name: string;
  modality: string;
  bodyPart: string;
  defaultDurationMinutes: number;
  estimatedFee: number;
  advanceDepositRequired: number;
  preparation?: {
    fastingRequired?: boolean;
    contrastSupported?: boolean;
    contrastPreparationRequired?: boolean;
    instructions?: string;
  };
}

export interface TimeSlot {
  startTime: string;
  endTime: string;
  displayTime: string;
  equipmentId: string;
  equipmentName: string;
  isAvailable: boolean;
}

export interface SlotsResponse {
  date: string;
  modality: string;
  availableSlotsCount: number;
  totalSlotsCount: number;
  slots: TimeSlot[];
}

export interface PatientReport {
  orderId: string;
  accessionNumber: string;
  patientId: string;
  modality: string;
  examinationName: string;
  priority: string;
  referringDoctor: string;
  reportId: string;
  status: string;
  version: number;
  finalizedAt?: string;
  signedBy: string;
  hasPdf: boolean;
  pdfGeneratedAt?: string;
  amendmentsCount: number;
}

export interface PatientViewerLaunch {
  accessionNumber: string;
  studyInstanceUid: string;
  viewerUrl: string;
}

export interface BookAppointmentPayload {
  examDefinitionId: string;
  scheduledStart: string;
  equipmentId?: string;
  clinicalNotes?: string;
  priority?: 'ROUTINE' | 'URGENT' | 'STAT';
}

export interface BookingResult {
  success: boolean;
  message: string;
  appointment: PatientAppointment;
  accessionNumber: string;
  patientId: string;
  isLocalDemonstration?: boolean;
}

export interface ReschedulePayload {
  newStart: string;
  reason?: string;
}

export interface CancelPayload {
  reason: string;
}

export interface MutationResult {
  success: boolean;
  message: string;
  appointment?: PatientAppointment;
  isLocalDemonstration?: boolean;
}
