/**
 * RadAxis RIS Mobile — Clinical Staff Domain Types
 * Covers Technologist and Radiologist workflows matching /api/v1/technologist/* and /api/v1/radiologist/*
 */

import { ModalityType, Priority } from './index';

// ─── Technologist Worklist Types ─────────────────────────────────────────────

export type TechnologistOrderStatus =
  | 'READY_FOR_TECH'
  | 'SAFETY_REVIEW'
  | 'SAFETY_CLEARED'
  | 'PREPARATION_IN_PROGRESS'
  | 'PREPARED'
  | 'READY_FOR_SCAN'
  | 'SCAN_IN_PROGRESS'
  | 'SCAN_INTERRUPTED'
  | 'SCAN_COMPLETED'
  | 'IMAGE_QA_PENDING'
  | 'IMAGE_ACCEPTED'
  | 'REPEAT_REQUIRED'
  | 'IMAGE_REJECTED'
  | 'PACS_READY'
  | 'PACS_HANDOFF_PENDING'
  | 'PACS_HANDOFF_COMPLETE'
  | 'PACS_HANDOFF_FAILED';

export interface TechnologistWorklistItem {
  appointmentId: string;
  orderId: string;
  patientId: string;
  patient: {
    patientId: string;
    firstName: string;
    lastName: string;
    dateOfBirth: string;
    gender: string;
  };
  order: {
    accessionNumber: string;
    modality: ModalityType;
    examinationName: string;
    bodyPart?: string | null;
    clinicalIndication?: string | null;
    priority: Priority;
    orderStatus: TechnologistOrderStatus;
    contrastRequired: boolean;
    safetyStatus?: 'PENDING' | 'CLEARED' | 'FLAGGED' | 'CONTRAINDICATED';
  };
  appointment: {
    appointmentNumber: string;
    scheduledStart: string;
    scheduledEnd: string;
    checkedInAt: string | null;
    tokenNumber: string | null;
    notes: string | null;
  };
  equipment?: {
    id: string;
    name: string;
    modality: ModalityType;
    location: string;
    status: string;
  } | null;
  waitingMinutes: number;
  isSimulatedState?: boolean;
}

export interface SafetyScreeningData {
  appointmentId: string;
  orderId: string;
  accessionNumber: string;
  modality: ModalityType;
  examinationName: string;
  priority: Priority;
  orderStatus: string;
  contrastRequired: boolean;
  patient: {
    id: string;
    patientId: string;
    firstName: string;
    lastName: string;
    dateOfBirth: string;
    gender: string;
  };
  screening?: {
    id: string;
    safetyStatus: string;
    safetyNotes?: string | null;
    answers?: Record<string, string>;
    riskFactors?: string[];
    reviewedAt?: string | null;
    completedByUser?: {
      id: string;
      firstName: string;
      lastName: string;
      role: string;
    } | null;
  } | null;
}

export interface PreparationData {
  orderId: string;
  accessionNumber: string;
  appointmentNumber: string;
  modality: ModalityType;
  examinationName: string;
  orderStatus: string;
  contrastRequired: boolean;
  isSafetyCleared: boolean;
  requirements?: {
    fastingRequired: boolean;
    ivRequired: boolean;
    contrastPreparationRequired: boolean;
    consentRequired: boolean;
    additionalPreparationInstructions?: string | null;
  };
  eligibleProtocols?: Array<{
    id: string;
    code: string;
    name: string;
    modality: ModalityType;
    bodyPart?: string | null;
    description?: string | null;
  }>;
  confirmedProtocol?: {
    id: string;
    code: string;
    name: string;
  } | null;
}

// ─── Radiologist Worklist Types ──────────────────────────────────────────────

export interface RadiologistWorklistItem {
  imagingOrderId: string;
  patientId: string;
  patientName: string;
  patientGender: string;
  patientDob: string;
  accessionNumber: string;
  modality: ModalityType;
  procedureName: string;
  bodyPart?: string | null;
  priority: Priority;
  priorityWeight?: number;
  clinicalIndication?: string | null;
  referringDoctor?: string | null;
  eligibleAt: string;
  waitingMinutes: number;
  orderStatus: string;
  assignmentStatus: 'UNASSIGNED' | 'ASSIGNED' | 'CLAIMED';
  assignedRadiologist?: {
    id: string;
    name: string;
  } | null;
  pacsIntegrationState?: {
    adapter: string;
    status: string;
    label: string;
    message?: string;
    studyInstanceUid?: string;
    orthancStudyId?: string;
    reconciled?: boolean;
  } | null;
  priorStudyCount: number;
  priorAvailable: boolean;
  claimedByCurrentUser?: boolean;
}

export interface ReportingTemplateItem {
  id: string;
  name: string;
  modality: ModalityType;
  bodyPart: string;
  description: string;
  language: string;
  sections: string[];
  isActive: boolean;
}

export interface FinalizedReportSummary {
  id: string;
  studyId: string;
  orderId: string;
  status: string;
  findings: string;
  impression: string;
  finalizedAt: string;
  version: number;
  signedAt?: string;
  isSigned: boolean;
  digitalSignature?: {
    signedBy: string;
    statement: string;
    algorithm: string;
    signatureHash: string;
  };
  radiologist?: {
    firstName: string;
    lastName: string;
    email: string;
  };
  order?: {
    accessionNumber: string;
    modality: ModalityType;
    bodyPart?: string;
    patient?: {
      patientId: string;
      firstName: string;
      lastName: string;
    };
  };
}
