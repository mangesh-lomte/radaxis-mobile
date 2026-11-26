import { useQuery } from '@tanstack/react-query';
import { GetInventoryParams, operationsService } from '../services/operationsService';
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

// ─── Inventory Hooks ─────────────────────────────────────────────────────────

export function useInventoryItems(params?: GetInventoryParams) {
  return useQuery<InventoryItem[], Error>({
    queryKey: ['inventoryItems', params],
    queryFn: () => operationsService.getInventoryItems(params),
    staleTime: 60 * 1000,
  });
}

export function useInventoryItemDetail(idOrCode?: string) {
  return useQuery<InventoryItem, Error>({
    queryKey: ['inventoryItemDetail', idOrCode],
    queryFn: () => {
      if (!idOrCode) throw new Error('Item ID or Code is required');
      return operationsService.getInventoryItemById(idOrCode);
    },
    enabled: !!idOrCode,
    staleTime: 60 * 1000,
  });
}

export function useReorderAlerts() {
  return useQuery<ReorderAlertsResponse, Error>({
    queryKey: ['reorderAlerts'],
    queryFn: () => operationsService.getReorderAlerts(),
    staleTime: 60 * 1000,
  });
}

export function useExpiryAlerts() {
  return useQuery<ExpiryAlertsResponse, Error>({
    queryKey: ['expiryAlerts'],
    queryFn: () => operationsService.getExpiryAlerts(),
    staleTime: 60 * 1000,
  });
}

// ─── Equipment Hooks ─────────────────────────────────────────────────────────

export function useEquipmentList() {
  return useQuery<EquipmentAsset[], Error>({
    queryKey: ['equipmentList'],
    queryFn: () => operationsService.getEquipmentList(),
    staleTime: 60 * 1000,
  });
}

export function useEquipmentAvailability() {
  return useQuery<EquipmentAvailabilitySummary, Error>({
    queryKey: ['equipmentAvailability'],
    queryFn: () => operationsService.getEquipmentAvailabilitySummary(),
    staleTime: 30 * 1000,
  });
}

export function usePmSchedules() {
  return useQuery<PmScheduleItem[], Error>({
    queryKey: ['pmSchedules'],
    queryFn: () => operationsService.getPmSchedules(),
    staleTime: 60 * 1000,
  });
}

// ─── Administration & Audit Hooks ───────────────────────────────────────────

export function useAuditLogs() {
  return useQuery<AuditLogItem[], Error>({
    queryKey: ['auditLogs'],
    queryFn: () => operationsService.getAuditLogs(),
    staleTime: 30 * 1000,
  });
}

export function useStaffUsers() {
  return useQuery<StaffUserItem[], Error>({
    queryKey: ['staffUsers'],
    queryFn: () => operationsService.getStaffUsers(),
    staleTime: 60 * 1000,
  });
}

export function useSecurityOverview() {
  return useQuery<SecurityOverview, Error>({
    queryKey: ['securityOverview'],
    queryFn: () => operationsService.getSecurityOverview(),
    staleTime: 5 * 60 * 1000,
  });
}

// ─── External Shares Hooks ──────────────────────────────────────────────────

export function useExternalShares() {
  return useQuery<ExternalShareItem[], Error>({
    queryKey: ['externalShares'],
    queryFn: () => operationsService.getExternalShares(),
    staleTime: 60 * 1000,
  });
}
