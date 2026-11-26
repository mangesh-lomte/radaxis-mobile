/**
 * RadAxis RIS Mobile — Domain Types & Interfaces
 * Compatible with backend /api/v1 response schemas
 */

export type UserRole = 'ADMIN' | 'RECEPTION' | 'TECHNOLOGIST' | 'RADIOLOGIST' | 'ENGINEER';

export type ModalityType = 'CT' | 'MRI' | 'XRAY' | 'ULTRASOUND' | 'MAMMOGRAPHY';

export type Priority = 'ROUTINE' | 'URGENT' | 'STAT';

export interface StaffUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  isActive: boolean;
}

export interface AuthResponseData {
  token: string;
  user: StaffUser;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  error?: {
    code?: string;
    details?: unknown;
  };
  timestamp: string;
}

// ─── Dashboard Overview ────────────────────────────────────────────────────────

export interface TodayOverviewData {
  totalBookings: number;
  completedScans: number;
  pendingReports: number;
  totalRevenue: number;
  acquisitionBacklog: number;
  finalizedReportsToday: number;
}

export interface ActivePatientItem {
  id: string;
  databasePatientId: string;
  patientId: string;
  patientName: string;
  accessionNumber: string;
  modality: ModalityType;
  examinationName: string;
  priority: Priority;
  status: string;
  stage: 'BOOKED' | 'ARRIVED' | 'WAITING' | 'SCANNING' | 'REPORTING' | 'DELIVERED';
  timeAgoMinutes: number;
}

export interface LivePatientStatusData {
  breakdown: {
    booked: number;
    arrived: number;
    waiting: number;
    scanning: number;
    reporting: number;
    delivered: number;
  };
  activePatients: ActivePatientItem[];
}

export interface ModalityStatusTile {
  modality: ModalityType;
  name: string;
  totalScanners: number;
  operationalScanners: number;
  status: 'OPERATIONAL' | 'BUSY' | 'MAINTENANCE' | 'OFFLINE';
  todayScheduledCount: number;
  currentlyScanningCount: number;
  utilizationPercent: number;
}

export interface PendingTaskAlert {
  id: string;
  type: 'URGENT_SCAN' | 'UNSIGNED_REPORT' | 'DELAYED_APPOINTMENT' | 'CRITICAL_FINDING';
  severity: 'CRITICAL' | 'WARNING' | 'INFO';
  title: string;
  description: string;
  accessionNumber?: string;
  patientId?: string;
  orderId?: string;
  targetUrl: string;
  timestamp: string;
}

export interface DailyAnalyticsData {
  scanVolumeToday: number;
  averageReportingTatMinutes: number;
  averageDeliveryTatMinutes: number;
  noShowCountToday: number;
  cancelledCountToday: number;
  completionRatePercent: number;
}

export interface DashboardNotificationItem {
  id: string;
  channel: string;
  type: 'CRITICAL_FINDING' | 'APPOINTMENT_CHANGE' | 'SYSTEM_STATUS';
  severity: 'CRITICAL' | 'WARNING' | 'INFO';
  title: string;
  message: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

export interface DashboardOverviewResponse {
  todayOverview: TodayOverviewData;
  livePatientStatus: LivePatientStatusData;
  modalityTiles: ModalityStatusTile[];
  pendingTaskAlerts: PendingTaskAlert[];
  dailyAnalytics: DailyAnalyticsData;
  notifications: DashboardNotificationItem[];
  roleCapabilities: {
    role: UserRole;
    allowedActions: string[];
  };
}

export function getUserFullName(user: StaffUser | null | undefined): string {
  if (!user) return 'Healthcare User';
  const full = `${user.firstName || ''} ${user.lastName || ''}`.trim();
  return full || user.email;
}

// ─── Patient Master Index ──────────────────────────────────────────────────────

export interface PatientListItem {
  id: string;
  patientId: string; // Persistent MRN e.g. PAT-2026-10018
  firstName: string;
  middleName?: string | null;
  lastName: string;
  dateOfBirth: string;
  gender: string;
  phone: string;
  alternatePhone?: string | null;
  email?: string | null;
  addressLine1?: string | null;
  addressLine2?: string | null;
  city?: string | null;
  state?: string | null;
  postalCode?: string | null;
  emergencyContactName?: string | null;
  emergencyContactPhone?: string | null;
  emergencyContactRelation?: string | null;
  address?: string | null;
  emergencyContact?: string | null;
  isActive: boolean;
  isMerged?: boolean;
  createdAt: string;
  updatedAt: string;
  _count?: {
    appointments?: number;
    imagingOrders?: number;
  };
}

export interface PatientListResponse {
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  items: PatientListItem[];
}

export interface PatientAppointmentSummary {
  id: string;
  scheduledStart: string;
  status: string;
  tokenNumber?: string | null;
  equipment?: {
    id: string;
    name: string;
    location: string;
  } | null;
  imagingOrder?: {
    id: string;
    accessionNumber: string;
    orderStatus: string;
    examinationName: string;
  } | null;
}

export interface PatientImagingOrderSummary {
  id: string;
  accessionNumber: string;
  modality: string;
  examinationName: string;
  orderStatus: string;
  priority: Priority;
  createdAt: string;
  referringDoctor?: {
    id: string;
    name: string;
    organization?: string | null;
  } | null;
  appointment?: {
    id: string;
    scheduledStart: string;
    status: string;
    tokenNumber?: string | null;
  } | null;
}

export interface PatientDetail extends PatientListItem {
  appointments?: PatientAppointmentSummary[];
  imagingOrders?: PatientImagingOrderSummary[];
}

// ─── Imaging Orders & Clinical Worklist ────────────────────────────────────────

export interface ImagingOrderReferringDoctor {
  id: string;
  name: string;
  organization?: string | null;
  phone?: string | null;
  email?: string | null;
  registrationNumber?: string | null;
}

export interface ImagingOrderPatient {
  id: string;
  patientId: string;
  firstName: string;
  middleName?: string | null;
  lastName: string;
  dateOfBirth: string;
  gender: string;
  phone: string;
  email?: string | null;
  addressLine1?: string | null;
  city?: string | null;
  state?: string | null;
  postalCode?: string | null;
  emergencyContactName?: string | null;
  emergencyContactPhone?: string | null;
  emergencyContactRelation?: string | null;
  isActive?: boolean;
}

export interface ImagingOrderStudy {
  id: string;
  studyInstanceUid?: string;
  accessionNumber?: string;
  studyStatus?: string;
  pacsStatus?: string;
  seriesCount?: number;
  instanceCount?: number;
  startedAt?: string | null;
  completedAt?: string | null;
}

export interface ImagingOrderReport {
  id: string;
  reportStatus?: string;
  status?: string;
  version?: number;
  findings?: string | null;
  impression?: string | null;
  isPreliminary?: boolean;
  finalizedAt?: string | null;
  signedAt?: string | null;
  isSigned?: boolean;
  isLocked?: boolean;
  signatureHash?: string | null;
  pdfFileSizeBytes?: number | null;
  pdfGeneratedAt?: string | null;
  digitalSignature?: {
    signedBy?: string;
    statement?: string;
    algorithm?: string;
    signatureHash?: string;
  } | null;
  radiologist?: {
    id?: string;
    name?: string;
    firstName?: string;
    lastName?: string;
    email?: string;
  } | null;
}

export interface ImagingOrderItem {
  id: string;
  accessionNumber: string;
  patientId: string;
  modality: string;
  bodyPart: string;
  examinationName: string;
  clinicalIndication: string;
  priority: Priority;
  orderStatus: string;
  contrastRequired?: boolean;
  authorizationStatus?: string;
  payerType?: string;
  createdById?: string;
  createdAt: string;
  updatedAt: string;
  patient: ImagingOrderPatient;
  referringDoctor?: ImagingOrderReferringDoctor | null;
  appointment?: {
    id: string;
    scheduledStart: string;
    status: string;
    tokenNumber?: string | null;
  } | null;
  study?: ImagingOrderStudy | null;
  report?: ImagingOrderReport | null;
  createdBy?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  } | null;
}

export interface ImagingOrderListResponse {
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  items: ImagingOrderItem[];
}

// ─── Radiology Report & Viewer Launch ──────────────────────────────────────────

export interface FinalizedReportData {
  id: string;
  status: string; // 'FINAL', 'ADDENDUM', 'PRELIMINARY'
  version: number;
  findings: string;
  impression: string;
  finalizedAt?: string | null;
  signedAt?: string | null;
  radiologist?: {
    id: string;
    name: string;
    email: string;
  } | null;
  signedBy?: {
    id: string;
    name: string;
    email: string;
    role: string;
  } | null;
  isSigned?: boolean;
  isLocked?: boolean;
  signatureHash?: string | null;
  pdfFileSizeBytes?: number | null;
  pdfGeneratedAt?: string | null;
  amendmentCount?: number;
}

export interface ReportDraftData {
  id: string;
  authorId?: string;
  authorName?: string;
  content?: Record<string, unknown> | null;
  findings?: string | null;
  impression?: string | null;
  version?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface ReportWorkspaceResponse {
  order: {
    id: string;
    accessionNumber: string;
    patientId: string;
    patientName: string;
    patientDob?: string;
    patientGender?: string;
    modality: string;
    bodyPart?: string;
    examinationName: string;
    clinicalIndication?: string;
    priority: Priority;
    orderStatus: string;
    studyInstanceUid?: string;
  };
  draft?: ReportDraftData | null;
  finalizedReport?: FinalizedReportData | null;
  assignment?: unknown;
}

export interface ViewerLaunchData {
  imagingOrderId: string;
  accessionNumber: string;
  patientId: string;
  studyInstanceUid: string;
  viewerUrl: string;
  isMultiStudy?: boolean;
}


