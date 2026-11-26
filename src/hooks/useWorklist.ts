import { useQuery } from '@tanstack/react-query';
import { worklistService, WorklistParams } from '../services/worklistService';
import { APP_CONFIG } from '../constants/config';
import { ImagingOrderListResponse, ImagingOrderItem } from '../types';

export function useWorklist(params: WorklistParams = {}) {
  return useQuery<ImagingOrderListResponse, Error>({
    queryKey: ['worklist', params],
    queryFn: () => worklistService.getOrders(params),
    staleTime: APP_CONFIG.staleTimeMs,
    retry: 1,
    refetchOnWindowFocus: false,
  });
}

export function useOrderDetail(idOrAccession?: string | null) {
  return useQuery<ImagingOrderItem, Error>({
    queryKey: ['order', idOrAccession],
    queryFn: () => {
      if (!idOrAccession) throw new Error('Order or Accession ID is required');
      return worklistService.getOrderByAccessionOrId(idOrAccession);
    },
    enabled: !!idOrAccession,
    staleTime: APP_CONFIG.staleTimeMs,
    retry: 1,
    refetchOnWindowFocus: false,
  });
}
