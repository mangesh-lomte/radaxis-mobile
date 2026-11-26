import { useQuery } from '@tanstack/react-query';
import { dashboardService } from '../services/dashboardService';
import { APP_CONFIG } from '../constants/config';
import { DashboardOverviewResponse } from '../types';

export function useDashboardOverview() {
  return useQuery<DashboardOverviewResponse, Error>({
    queryKey: ['dashboard', 'overview'],
    queryFn: () => dashboardService.getOverview(),
    staleTime: APP_CONFIG.staleTimeMs,
    retry: 1,
    refetchOnWindowFocus: false,
  });
}
