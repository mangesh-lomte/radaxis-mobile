import { useQuery } from '@tanstack/react-query';
import { alertsService, GetCriticalFindingsParams } from '../services/alertsService';
import { CriticalFindingItem, CriticalFindingQueueResponse } from '../types/alerts';

export function useCriticalFindings(params?: GetCriticalFindingsParams) {
  return useQuery<CriticalFindingQueueResponse, Error>({
    queryKey: ['criticalFindings', params],
    queryFn: () => alertsService.getCriticalFindings(params),
    staleTime: 30 * 1000,
  });
}

export function useCriticalFindingDetail(id?: string) {
  return useQuery<CriticalFindingItem, Error>({
    queryKey: ['criticalFindingDetail', id],
    queryFn: () => {
      if (!id) throw new Error('Alert ID required');
      return alertsService.getCriticalFindingById(id);
    },
    enabled: !!id,
    staleTime: 60 * 1000,
  });
}
