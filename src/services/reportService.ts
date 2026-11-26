/**
 * RadAxis RIS Mobile — Report & Viewer Service
 * Communicates with backend /api/v1/radiologist REST endpoints for diagnostic reports, PDFs, and OHIF viewer
 */

import { apiClient, ApiError } from './api';
import { secureTokenStorage } from '../auth/secureTokenStorage';
import { API_BASE_URL } from '../constants/config';
import {
  ReportWorkspaceResponse,
  ViewerLaunchData,
} from '../types';

export const reportService = {
  /**
   * Retrieve the diagnostic report workspace (draft or finalized report) for an imaging order
   * Returns null if report has not commenced or order is not yet eligible for reporting.
   */
  getReportContext: async (
    orderIdOrAccession: string
  ): Promise<ReportWorkspaceResponse | null> => {
    try {
      const endpoint = `/radiologist/worklist/${encodeURIComponent(orderIdOrAccession.trim())}/report`;
      const res = await apiClient<ReportWorkspaceResponse>(endpoint);
      return res.data;
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        // 403 = draft belongs to another radiologist or role lacks report-workspace access;
        // 404 = report not found; 409 = order not yet eligible for reporting
        if (err.statusCode === 403 || err.statusCode === 404 || err.statusCode === 409) {
          return null;
        }
      }
      throw err;
    }
  },

  /**
   * Request authorized OHIF DICOM Viewer launch destination
   * Backend verifies PACS StudyInstanceUID and returns resolved viewer route
   */
  getViewerLaunchContext: async (
    orderIdOrAccession: string
  ): Promise<ViewerLaunchData> => {
    const endpoint = `/radiologist/worklist/${encodeURIComponent(orderIdOrAccession.trim())}/viewer-launch`;
    const res = await apiClient<ViewerLaunchData>(endpoint);
    return res.data;
  },

  /**
   * Verify and fetch report PDF artifact metadata using authorized Bearer token
   */
  verifyReportPdfAccess: async (
    orderIdOrAccession: string
  ): Promise<{ filename: string; fileSizeBytes: number; contentType: string }> => {
    const token = await secureTokenStorage.getToken();
    if (!token) {
      throw new ApiError('Authentication required to access clinical PDF report', 401, 'UNAUTHORIZED');
    }

    const endpoint = `${API_BASE_URL}/radiologist/worklist/${encodeURIComponent(orderIdOrAccession.trim())}/report/pdf`;
    const res = await fetch(endpoint, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/pdf',
      },
    });

    if (!res.ok) {
      let errorMsg = `Unable to retrieve report PDF (${res.status} ${res.statusText})`;
      try {
        const json = await res.json();
        if (json?.message) errorMsg = json.message;
      } catch {
        // Not JSON
      }
      throw new ApiError(errorMsg, res.status);
    }

    const contentType = res.headers.get('content-type') || 'application/pdf';
    const contentLength = parseInt(res.headers.get('content-length') || '0', 10);
    const disposition = res.headers.get('content-disposition') || '';
    const match = disposition.match(/filename="?([^";]+)"?/);
    const filename = match ? match[1] : `report_${orderIdOrAccession}.pdf`;

    return {
      filename,
      fileSizeBytes: contentLength,
      contentType,
    };
  },
};
