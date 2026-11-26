/**
 * RadAxis RIS Mobile — Reception & Scheduling Types
 * Matches backend /api/v1/reception/*, /api/v1/appointments/*, and /api/v1/scheduling/* schemas
 */

import { ModalityType, Priority } from './index';

export type AppointmentStatus =
  | 'SCHEDULED'
  | 'CONFIRMED'
  | 'CHECKED_IN'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'NO_SHOW';

export interface PatientSummary {
  id: string;
  patientId: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender: string;
  phone: string;
}

export interface ImagingOrderSummary {
  id: string;
  accessionNumber: string;
  modality: ModalityType;
  bodyPart?: string | null;
  examinationName: string;
  clinicalIndication?: string | null;
  contrastRequired?: boolean;
  priority: Priority;
  orderStatus: string;
  authorizationStatus?: string | null;
  referringDoctor?: {
    id: string;
    name: string;
  } | null;
}

export interface EquipmentSummary {
  id: string;
  name: string;
  location: string;
}

export interface ExamDefinitionSummary {
  id: string;
  code: string;
  name: string;
  defaultDurationMinutes: number;
}

export interface StaffAppointmentItem {
  id: string;
  appointmentNumber: string;
  patientId: string;
  imagingOrderId: string;
  modality: ModalityType;
  equipmentId?: string | null;
  examDefinitionId?: string | null;
  examination: string;
  scheduledStart: string;
  scheduledEnd?: string | null;
  durationMinutes?: number;
  status: AppointmentStatus;
  priority: Priority;
  location?: string | null;
  notes?: string | null;
  cancellationReason?: string | null;
  noShowReason?: string | null;
  rescheduleReason?: string | null;
  tokenNumber?: string | null;
  checkedInAt?: string | null;
  checkedInById?: string | null;
  cancelledAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
  patient: PatientSummary;
  imagingOrder?: ImagingOrderSummary | null;
  equipment?: EquipmentSummary | null;
  examDefinition?: ExamDefinitionSummary | null;
  isSimulatedDemo?: boolean;
}

export interface ReadyReportItem {
  orderId: string;
  accessionNumber: string;
  patientId: string;
  patientName: string;
  dateOfBirth?: string;
  phone?: string;
  email?: string;
  modality: ModalityType;
  examinationName: string;
  priority: Priority;
  referringDoctorName?: string;
  reportId: string;
  reportStatus: string;
  reportVersion: number;
  finalizedAt: string;
  signedAt?: string;
  signedBy?: string;
  hasPdf: boolean;
  pdfGeneratedAt?: string;
  isReadyForReception: boolean;
  readyForReceptionAt?: string;
  readyForReceptionBy?: string;
  deliveryStatus: string;
  lastDeliveredAt?: string | null;
  deliveriesCount: number;
  notificationsCount: number;
  reprintsCount: number;
}

export interface SlotCandidate {
  start: string;
  end: string;
  equipmentId: string;
  equipmentName: string;
  available: boolean;
}

export interface SlotAvailabilityData {
  modality: ModalityType;
  date: string;
  equipmentId?: string;
  slots: SlotCandidate[];
}

export interface ReceptionQueueParams {
  date?: string;
  modality?: ModalityType;
}

export interface AppointmentListParams {
  page?: number;
  pageSize?: number;
  date?: string;
  dateFrom?: string;
  dateTo?: string;
  patientId?: string;
  modality?: ModalityType;
  equipmentId?: string;
  status?: AppointmentStatus;
  priority?: Priority;
  search?: string;
}

export interface PaginatedAppointmentsResponse {
  total: number;
  items: StaffAppointmentItem[];
  page: number;
  pageSize: number;
  totalPages: number;
}
