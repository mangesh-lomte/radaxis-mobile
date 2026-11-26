/**
 * RadAxis RIS Mobile — Worklist Service
 * Communicates with /api/v1/orders REST endpoints for imaging worklist and study detail
 */

import { apiClient } from './api';
import { ImagingOrderListResponse, ImagingOrderItem, Priority } from '../types';

export interface WorklistParams {
  search?: string;
  modality?: string;
  priority?: Priority | 'ALL';
  status?: string;
  orderStatus?: string;
  page?: number;
  pageSize?: number;
  dateFrom?: string;
  dateTo?: string;
}

export const worklistService = {
  /**
   * List real clinical imaging orders across all modalities with search and filters
   */
  getOrders: async (params: WorklistParams = {}): Promise<ImagingOrderListResponse> => {
    const query = new URLSearchParams();

    if (params.search && params.search.trim().length > 0) {
      query.append('search', params.search.trim());
    }
    if (params.modality && params.modality !== 'ALL') {
      query.append('modality', params.modality);
    }
    if (params.priority && params.priority !== 'ALL') {
      query.append('priority', params.priority);
    }
    if (params.status && params.status !== 'ALL') {
      query.append('status', params.status);
    }
    if (params.orderStatus && params.orderStatus !== 'ALL') {
      query.append('orderStatus', params.orderStatus);
    }
    if (params.page) {
      query.append('page', params.page.toString());
    }
    if (params.pageSize) {
      query.append('pageSize', params.pageSize.toString());
    }

    const queryString = query.toString();
    const endpoint = queryString ? `/orders?${queryString}` : '/orders';

    const response = await apiClient<ImagingOrderListResponse>(endpoint);
    return response.data;
  },

  /**
   * Retrieve full imaging order & study details by Accession Number or UUID
   */
  getOrderByAccessionOrId: async (idOrAccession: string): Promise<ImagingOrderItem> => {
    const response = await apiClient<ImagingOrderItem>(`/orders/${encodeURIComponent(idOrAccession)}`);
    return response.data;
  },
};
