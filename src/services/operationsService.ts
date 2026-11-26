import { apiClient } from './api';
import { isMutationAllowed, MUTATION_GUARD_MESSAGE } from '../constants/environment';
import {
  AuditLogItem,
  EquipmentAsset,
  EquipmentAvailabilitySummary,
  ExpiryAlertsResponse,
  ExternalShareItem,
  InventoryItem,
  PmScheduleItem,
  ReorderAlertsResponse,
  SecurityOverview,
  StaffUserItem,
} from '../types/operations';

export interface GetInventoryParams {
  category?: string;
  search?: string;
  activeOnly?: boolean;
}

export const operationsService = {
  // ─── 1. Inventory ─────────────────────────────────────────────────────────

  getInventoryItems: async (params?: GetInventoryParams): Promise<InventoryItem[]> => {
    const q = new URLSearchParams();
    if (params?.category) q.append('category', params.category);
    if (params?.search) q.append('search', params.search);
    if (params?.activeOnly !== undefined) q.append('activeOnly', String(params.activeOnly));

    const qs = q.toString();
    const endpoint = `/inventory/items${qs ? `?${qs}` : ''}`;
    const res = await apiClient<InventoryItem[]>(endpoint);
    return res.data || [];
  },

  getInventoryItemById: async (idOrCode: string): Promise<InventoryItem> => {
    const endpoint = `/inventory/items/${encodeURIComponent(idOrCode)}`;
    const res = await apiClient<InventoryItem>(endpoint);
    return res.data;
  },

  getReorderAlerts: async (): Promise<ReorderAlertsResponse> => {
    const endpoint = '/inventory/alerts/reorder';
    const res = await apiClient<ReorderAlertsResponse>(endpoint);
    return res.data || { asOf: new Date().toISOString(), alertCount: 0, alerts: [] };
  },

  getExpiryAlerts: async (): Promise<ExpiryAlertsResponse> => {
    const endpoint = '/inventory/alerts/expiry';
    const res = await apiClient<ExpiryAlertsResponse>(endpoint);
    return (
      res.data || {
        asOf: new Date().toISOString(),
        nearExpiryDaysThreshold: 60,
        expiredCount: 0,
        nearExpiryCount: 0,
        expired: [],
        nearExpiry: [],
      }
    );
  },

  // ─── 2. Equipment & Maintenance ──────────────────────────────────────────

  getEquipmentList: async (): Promise<EquipmentAsset[]> => {
    const endpoint = '/maintenance/equipment';
    const res = await apiClient<EquipmentAsset[]>(endpoint);
    return res.data || [];
  },

  getEquipmentById: async (id: string): Promise<EquipmentAsset> => {
    const endpoint = `/maintenance/equipment/${encodeURIComponent(id)}`;
    const res = await apiClient<EquipmentAsset>(endpoint);
    return res.data;
  },

  getEquipmentAvailabilitySummary: async (): Promise<EquipmentAvailabilitySummary> => {
    const endpoint = '/maintenance/availability/summary';
    const res = await apiClient<EquipmentAvailabilitySummary>(endpoint);
    return (
      res.data || {
        totalEquipment: 0,
        totalUnits: 0,
        availableUnits: 0,
        underPmUnits: 0,
        outOfServiceUnits: 0,
      }
    );
  },

  getPmSchedules: async (): Promise<PmScheduleItem[]> => {
    const endpoint = '/maintenance/pm-schedules';
    const res = await apiClient<PmScheduleItem[]>(endpoint);
    return res.data || [];
  },

  // ─── 3. Administration & Audit ───────────────────────────────────────────

  getAuditLogs: async (): Promise<AuditLogItem[]> => {
    const endpoint = '/audit-logs';
    const res = await apiClient<AuditLogItem[]>(endpoint);
    return res.data || [];
  },

  getStaffUsers: async (): Promise<StaffUserItem[]> => {
    const endpoint = '/admin/users';
    const res = await apiClient<{ items: StaffUserItem[] }>(endpoint);
    return res.data?.items || [];
  },

  getSecurityOverview: async (): Promise<SecurityOverview> => {
    const endpoint = '/admin/security/overview';
    const res = await apiClient<SecurityOverview>(endpoint);
    return (
      res.data || {
        status: 'UNKNOWN',
        controls: {},
      }
    );
  },

  // ─── 4. External Sharing ──────────────────────────────────────────────────

  getExternalShares: async (): Promise<ExternalShareItem[]> => {
    const endpoint = '/external-shares';
    const res = await apiClient<ExternalShareItem[]>(endpoint);
    return res.data || [];
  },

  createExternalShare: async (
    studyId: string,
    recipientEmail?: string,
    recipientName?: string
  ): Promise<{ share: Partial<ExternalShareItem> | null; success: boolean; isLocalDemonstration: boolean; message: string }> => {
    if (!isMutationAllowed()) {
      return {
        share: null,
        success: false,
        isLocalDemonstration: false,
        message: MUTATION_GUARD_MESSAGE,
      };
    }

    const endpoint = '/external-shares';
    const res = await apiClient<ExternalShareItem>(endpoint, {
      method: 'POST',
      body: JSON.stringify({
        orderId: studyId,
        recipientName: recipientName || recipientEmail || 'Outside Consulting Physician',
        recipientEmail: recipientEmail || 'referring.physician@hospital.org',
        consentPurpose: 'Clinical evaluation and external second opinion',
        consentedBy: 'Patient',
      }),
    });

    return {
      share: res.data,
      success: true,
      isLocalDemonstration: false,
      message: 'External PACS access link generated',
    };
  },

  revokeExternalShare: async (
    shareId: string
  ): Promise<{ success: boolean; isLocalDemonstration: boolean; message: string }> => {
    if (!isMutationAllowed()) {
      return {
        success: false,
        isLocalDemonstration: false,
        message: MUTATION_GUARD_MESSAGE,
      };
    }

    const endpoint = `/external-shares/${encodeURIComponent(shareId)}/revoke`;
    await apiClient(endpoint, { method: 'POST' });
    return {
      success: true,
      isLocalDemonstration: false,
      message: 'External share revoked',
    };
  },
};
