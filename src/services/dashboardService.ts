import { apiClient } from './api';
import { DashboardOverviewResponse } from '../types';

export const dashboardService = {
  /**
   * Fetch live operational metrics from GET /api/v1/dashboard/overview
   */
  getOverview: async (): Promise<DashboardOverviewResponse> => {
    const res = await apiClient<DashboardOverviewResponse>('/dashboard/overview');
    return res.data;
  },
};
