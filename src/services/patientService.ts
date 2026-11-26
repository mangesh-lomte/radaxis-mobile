/**
 * RadAxis RIS Mobile — Patient Service
 * Communicates with /api/v1/patients REST endpoints
 */

import { apiClient } from './api';
import { PatientListResponse, PatientDetail } from '../types';

export interface PatientListParams {
  search?: string;
  page?: number;
  pageSize?: number;
  sortBy?: 'createdAt' | 'lastName' | 'firstName';
  sortOrder?: 'asc' | 'desc';
}

export const patientService = {
  /**
   * List real patients from the master patient index with search and pagination
   */
  getPatients: async (params: PatientListParams = {}): Promise<PatientListResponse> => {
    const query = new URLSearchParams();

    if (params.search && params.search.trim().length > 0) {
      query.append('search', params.search.trim());
    }
    if (params.page) {
      query.append('page', params.page.toString());
    }
    if (params.pageSize) {
      query.append('pageSize', params.pageSize.toString());
    }
    if (params.sortBy) {
      query.append('sortBy', params.sortBy);
    }
    if (params.sortOrder) {
      query.append('sortOrder', params.sortOrder);
    }

    const queryString = query.toString();
    const endpoint = queryString ? `/patients?${queryString}` : '/patients';

    const response = await apiClient<PatientListResponse>(endpoint);
    return response.data;
  },

  /**
   * Retrieve full patient details and clinical history by MRN (patientId) or UUID
   */
  getPatientById: async (id: string): Promise<PatientDetail> => {
    const response = await apiClient<PatientDetail>(`/patients/${encodeURIComponent(id)}`);
    return response.data;
  },
};
