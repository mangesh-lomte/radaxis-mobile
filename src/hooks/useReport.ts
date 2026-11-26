import { useQuery } from '@tanstack/react-query';
import { reportService } from '../services/reportService';
import { APP_CONFIG } from '../constants/config';
import { ReportWorkspaceResponse } from '../types';

export function useReport(orderIdOrAccession?: string | null) {
  return useQuery<ReportWorkspaceResponse | null, Error>({
    queryKey: ['report', orderIdOrAccession],
    queryFn: () => {
      if (!orderIdOrAccession) return null;
      return reportService.getReportContext(orderIdOrAccession);
    },
    enabled: !!orderIdOrAccession,
    staleTime: APP_CONFIG.staleTimeMs,
    retry: 1,
    refetchOnWindowFocus: false,
  });
}
