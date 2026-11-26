/**
 * Phase 8: Hospital Operations & Administration Types
 * Covers Inventory, Equipment & Maintenance, System Administration & Audit, and External Shares
 */

// ─── 1. Inventory Types ───────────────────────────────────────────────────────

export type InventoryCategory =
  | 'CONTRAST'
  | 'CONSUMABLE'
  | 'FILM'
  | 'EMERGENCY_KIT'
  | 'GENERAL';

export interface LocationStockItem {
  id: string;
  locationId: string;
  locationName?: string;
  quantity: number;
}

export interface InventoryBatchItem {
  id: string;
  batchNumber: string;
  quantity: number;
  expiryDate?: string | null;
  status: string;
}

export interface InventoryItem {
  id: string;
  itemCode: string;
  name: string;
  category: InventoryCategory;
  subCategory?: string | null;
  unit: string;
  barcode?: string | null;
  sku?: string | null;
  quantity: number;
  reorderLevel: number;
  unitPrice?: string | number | null;
  contrastType?: string | null;
  concentration?: string | null;
  packSize?: string | null;
  filmSize?: string | null;
  isEmergencyKit?: boolean;
  active: boolean;
  batchNumber?: string | null;
  lotNumber?: string | null;
  expiryDate?: string | null;
  totalPhysicalStock?: number;
  reorderAlert?: boolean;
  locationStocks?: LocationStockItem[];
  batches?: InventoryBatchItem[];
  createdAt: string;
  updatedAt: string;
}

export interface ReorderAlertItem {
  itemId: string;
  itemCode: string;
  name: string;
  category: string;
  unit: string;
  currentStock: number;
  reorderLevel: number;
  deficit: number;
  suggestedOrderQty: number;
  estimatedOrderCost: number;
  preferredSupplier: string;
}

export interface ReorderAlertsResponse {
  asOf: string;
  alertCount: number;
  alerts: ReorderAlertItem[];
}

export interface ExpiryAlertItem {
  id: string;
  batchNumber: string;
  itemId: string;
  itemName: string;
  itemCode: string;
  quantity: number;
  unit: string;
  expiryDate: string;
  daysToExpiry: number;
}

export interface ExpiryAlertsResponse {
  asOf: string;
  nearExpiryDaysThreshold: number;
  expiredCount: number;
  nearExpiryCount: number;
  expired: ExpiryAlertItem[];
  nearExpiry: ExpiryAlertItem[];
}

// ─── 2. Equipment & Maintenance Types ────────────────────────────────────────

export type EquipmentStatus =
  | 'AVAILABLE'
  | 'IN_USE'
  | 'MAINTENANCE'
  | 'OUT_OF_SERVICE'
  | 'DECOMMISSIONED';

export interface EquipmentAsset {
  id: string;
  assetTag: string;
  name: string;
  modality: string;
  assetCategory: string;
  manufacturer: string;
  model: string;
  serialNumber: string;
  status: EquipmentStatus;
  location: string;
  roomNumber?: string | null;
  department: string;
  installationDate?: string | null;
  warrantyExpiryDate?: string | null;
  lastMaintenanceDate?: string | null;
  nextMaintenanceDate?: string | null;
  notes?: string | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface EquipmentAvailabilitySummary {
  totalEquipment: number;
  totalUnits: number;
  availableUnits: number;
  underPmUnits: number;
  outOfServiceUnits: number;
}

export interface PmScheduleItem {
  id: string;
  equipmentId: string;
  equipmentName?: string;
  scheduledDate: string;
  frequency: string;
  status: 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'OVERDUE';
  assignedEngineer?: string | null;
  notes?: string | null;
}

export interface ServiceHistoryRecord {
  id: string;
  equipmentId: string;
  serviceDate: string;
  serviceType: string;
  description: string;
  servicedBy: string;
  cost?: number | null;
}

// ─── 3. Administration & Audit Types ─────────────────────────────────────────

export interface AuditLogItem {
  id: string;
  userId: string;
  action: string;
  entityType: string;
  entityId: string;
  details?: Record<string, any> | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  timestamp: string;
  user?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    role: string;
  };
}

export interface StaffUserItem {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SecurityOverview {
  status: string;
  controls: {
    authentication?: {
      enabled: boolean;
      type: string;
    };
    rbac?: {
      enabled: boolean;
      roles: string[];
    };
    auditLogging?: {
      enabled: boolean;
      retentionDays?: number;
    };
    encryption?: {
      inTransit: boolean;
      atRest: boolean;
    };
  };
}

// ─── 4. External Sharing Types ────────────────────────────────────────────────

export interface ExternalShareItem {
  id: string;
  shareNumber: string;
  shareToken: string;
  orderId: string;
  patientId: string;
  reportId?: string | null;
  studyInstanceUid?: string | null;
  accessionNumber: string;
  patientMrn: string;
  shareType: string;
  recipientName: string;
  recipientEmail?: string | null;
  recipientPhone?: string | null;
  recipientRole?: string | null;
  institutionName?: string | null;
  includeDicom: boolean;
  includeReportPdf: boolean;
  includeWebViewer: boolean;
  requiresOtp: boolean;
  otpVerified: boolean;
  expiresAt: string;
  status: 'ACTIVE' | 'EXPIRED' | 'REVOKED';
  viewCount: number;
  lastAccessedAt?: string | null;
  createdAt: string;
  order?: {
    modality: string;
    examinationName: string;
    orderStatus: string;
  };
  patient?: {
    patientId: string;
    firstName: string;
    lastName: string;
  };
  consent?: {
    id: string;
    purpose: string;
    consentedBy: string;
    consentedByRelation: string;
    consentMethod: string;
    consentDate: string;
    notes?: string | null;
    status: string;
  };
  _count?: {
    accessLogs: number;
    transfers: number;
  };
  isExpired?: boolean;
  effectiveStatus?: string;
}
