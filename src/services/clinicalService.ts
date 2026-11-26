/**
 * RadAxis RIS Mobile — Clinical Workflows Service
 * Communicates with backend /api/v1/technologist/* and /api/v1/radiologist/* endpoints
 * STRICT SAFETY: Zero clinical mutations (scan start/stop, image QA rejection, report signing) against production.
 */

import { apiClient } from './api';
import { isMutationAllowed, MUTATION_GUARD_MESSAGE } from '../constants/environment';
import {
  FinalizedReportSummary,
  PreparationData,
  RadiologistWorklistItem,
  ReportingTemplateItem,
  SafetyScreeningData,
  TechnologistWorklistItem,
} from '../types/clinical';
import { ModalityType, Priority } from '../types';

export const technologistService = {
  /**
   * Retrieve Technologist worklist
   * Passing date='ALL' enables retrieval of all eligible checked-in patients regardless of test date
   */
  getWorklist: async (params: {
    date?: string;
    modality?: string;
    priority?: string;
    equipmentId?: string;
    search?: string;
  } = {}): Promise<TechnologistWorklistItem[]> => {
    const query = new URLSearchParams();
    query.append('date', params.date || 'ALL');
    if (params.modality && params.modality !== 'ALL') query.append('modality', params.modality);
    if (params.priority && params.priority !== 'ALL') query.append('priority', params.priority);
    if (params.equipmentId && params.equipmentId !== 'ALL') query.append('equipmentId', params.equipmentId);
    if (params.search && params.search.trim()) query.append('search', params.search.trim());

    const endpoint = `/technologist/worklist?${query.toString()}`;
    const res = await apiClient<{ items: TechnologistWorklistItem[] }>(endpoint);
    return res.data?.items || [];
  },

  /**
   * Retrieve patient safety screening details for an examination
   */
  getSafetyScreening: async (orderId: string): Promise<SafetyScreeningData> => {
    const endpoint = `/technologist/worklist/${encodeURIComponent(orderId.trim())}/safety`;
    const res = await apiClient<SafetyScreeningData>(endpoint);
    return res.data;
  },

  /**
   * Retrieve technologist preparation checklist & protocol data
   */
  getPreparation: async (orderId: string): Promise<PreparationData> => {
    const endpoint = `/technologist/worklist/${encodeURIComponent(orderId.trim())}/preparation`;
    const res = await apiClient<PreparationData>(endpoint);
    return res.data;
  },

  /**
   * Submit technologist safety screening responses
   */
  submitSafetyScreening: async (
    orderId: string,
    payload: {
      identityVerified?: boolean;
      identityVerificationMethod?: string;
      answers?: Record<string, string>;
      safetyNotes?: string;
    } | Record<string, boolean>
  ): Promise<{ success: boolean; isLocalDemonstration: boolean; message: string }> => {
    if (!isMutationAllowed()) {
      return {
        success: false,
        isLocalDemonstration: false,
        message: MUTATION_GUARD_MESSAGE,
      };
    }

    // Format payload to strictly conform to backend saveSafetyScreeningSchema
    let body: any;
    if ('identityVerified' in payload) {
      body = {
        identityVerified: payload.identityVerified ?? true,
        identityVerificationMethod: payload.identityVerificationMethod || 'WRISTBAND_AND_VERBAL',
        answers: payload.answers || {},
        safetyNotes: payload.safetyNotes,
      };
    } else {
      const formattedAnswers: Record<string, string> = {};
      for (const [k, v] of Object.entries(payload)) {
        formattedAnswers[k] = v ? 'YES' : 'NO';
      }
      body = {
        identityVerified: true,
        identityVerificationMethod: 'WRISTBAND_AND_VERBAL',
        answers: formattedAnswers,
      };
    }

    const endpoint = `/technologist/worklist/${encodeURIComponent(orderId.trim())}/safety`;
    await apiClient(endpoint, {
      method: 'POST',
      body: JSON.stringify(body),
    });
    return {
      success: true,
      isLocalDemonstration: false,
      message: 'Safety screening submitted successfully',
    };
  },

  /**
   * Start scan acquisition
   */
  startScan: async (
    orderId: string
  ): Promise<{ success: boolean; isLocalDemonstration: boolean; message: string }> => {
    if (!isMutationAllowed()) {
      return {
        success: false,
        isLocalDemonstration: false,
        message: MUTATION_GUARD_MESSAGE,
      };
    }
    const endpoint = `/technologist/worklist/${encodeURIComponent(orderId.trim())}/scan/start`;
    await apiClient(endpoint, { method: 'POST' });
    return {
      success: true,
      isLocalDemonstration: false,
      message: 'Scan acquisition started',
    };
  },

  /**
   * Complete scan acquisition
   */
  finishScan: async (
    orderId: string
  ): Promise<{ success: boolean; isLocalDemonstration: boolean; message: string }> => {
    if (!isMutationAllowed()) {
      return {
        success: false,
        isLocalDemonstration: false,
        message: MUTATION_GUARD_MESSAGE,
      };
    }
    const endpoint = `/technologist/worklist/${encodeURIComponent(orderId.trim())}/scan/finish`;
    await apiClient(endpoint, { method: 'POST' });
    return {
      success: true,
      isLocalDemonstration: false,
      message: 'Scan acquisition completed and forwarded to image QA',
    };
  },

  /**
   * Accept image quality
   */
  acceptImageQuality: async (
    orderId: string
  ): Promise<{ success: boolean; isLocalDemonstration: boolean; message: string }> => {
    if (!isMutationAllowed()) {
      return {
        success: false,
        isLocalDemonstration: false,
        message: MUTATION_GUARD_MESSAGE,
      };
    }
    // Ensure image QA review is started before accepting
    const startEndpoint = `/technologist/worklist/${encodeURIComponent(orderId.trim())}/image-quality/start`;
    try {
      await apiClient(startEndpoint, { method: 'POST' });
    } catch {
      // Ignored if QA already started
    }
    const endpoint = `/technologist/worklist/${encodeURIComponent(orderId.trim())}/image-quality/accept`;
    await apiClient(endpoint, { method: 'POST' });
    return {
      success: true,
      isLocalDemonstration: false,
      message: 'Image quality accepted and routed to radiologist',
    };
  },
};

export const radiologistService = {
  /**
   * Retrieve Radiologist diagnostic reporting worklist
   */
  getWorklist: async (params: {
    modality?: string;
    priority?: string;
    search?: string;
  } = {}): Promise<RadiologistWorklistItem[]> => {
    const query = new URLSearchParams();
    if (params.modality && params.modality !== 'ALL') query.append('modality', params.modality);
    if (params.priority && params.priority !== 'ALL') query.append('priority', params.priority);
    if (params.search && params.search.trim()) query.append('search', params.search.trim());

    const qs = query.toString();
    const endpoint = `/radiologist/worklist${qs ? `?${qs}` : ''}`;
    const res = await apiClient<RadiologistWorklistItem[] | { items: RadiologistWorklistItem[] }>(endpoint);
    return Array.isArray(res.data) ? res.data : res.data?.items || [];
  },

  /**
   * Retrieve study context for reporting
   */
  getStudyContext: async (orderId: string): Promise<any> => {
    const endpoint = `/radiologist/worklist/${encodeURIComponent(orderId.trim())}`;
    const res = await apiClient<any>(endpoint);
    return res.data;
  },

  /**
   * Retrieve OHIF viewer launch configuration
   */
  getViewerLaunch: async (orderId: string): Promise<{ viewerUrl: string }> => {
    const endpoint = `/radiologist/worklist/${encodeURIComponent(orderId.trim())}/viewer-launch`;
    const res = await apiClient<{ viewerUrl: string }>(endpoint);
    return res.data;
  },

  /**
   * Retrieve reporting templates from backend catalog (ADMIN-scoped endpoint).
   * Returns empty list when unauthorized or unconfigured — never injects synthetic templates.
   */
  getReportingTemplates: async (): Promise<ReportingTemplateItem[]> => {
    try {
      const endpoint = '/admin/reporting-templates';
      const res = await apiClient<ReportingTemplateItem[]>(endpoint);
      return Array.isArray(res.data) ? res.data : [];
    } catch (_err) {
      return [];
    }
  },

  /**
   * Retrieve finalized diagnostic reports
   */
  getFinalizedReports: async (): Promise<FinalizedReportSummary[]> => {
    const endpoint = '/reports';
    const res = await apiClient<FinalizedReportSummary[]>(endpoint);
    return res.data || [];
  },

  /**
   * Claim study for diagnostic interpretation
   */
  claimStudy: async (
    orderId: string
  ): Promise<{ success: boolean; isLocalDemonstration: boolean; message: string }> => {
    if (!isMutationAllowed()) {
      return {
        success: false,
        isLocalDemonstration: false,
        message: MUTATION_GUARD_MESSAGE,
      };
    }
    const endpoint = `/radiologist/worklist/${encodeURIComponent(orderId.trim())}/claim`;
    await apiClient(endpoint, { method: 'POST' });
    return {
      success: true,
      isLocalDemonstration: false,
      message: 'Study claimed successfully for reporting',
    };
  },

  /**
   * Release study back to reporting pool
   */
  releaseStudy: async (
    orderId: string
  ): Promise<{ success: boolean; isLocalDemonstration: boolean; message: string }> => {
    if (!isMutationAllowed()) {
      return {
        success: false,
        isLocalDemonstration: false,
        message: MUTATION_GUARD_MESSAGE,
      };
    }
    const endpoint = `/radiologist/worklist/${encodeURIComponent(orderId.trim())}/release`;
    await apiClient(endpoint, { method: 'POST' });
    return {
      success: true,
      isLocalDemonstration: false,
      message: 'Study released back to unassigned worklist',
    };
  },

  /**
   * Save diagnostic report draft
   */
  saveDraftReport: async (
    orderId: string,
    payload: { findings?: string; impression?: string; templateId?: string }
  ): Promise<{ success: boolean; isLocalDemonstration: boolean; message: string }> => {
    if (!isMutationAllowed()) {
      return {
        success: false,
        isLocalDemonstration: false,
        message: MUTATION_GUARD_MESSAGE,
      };
    }
    const endpoint = `/radiologist/worklist/${encodeURIComponent(orderId.trim())}/report/draft`;
    await apiClient(endpoint, {
      method: 'POST',
      body: JSON.stringify({
        templateId: payload.templateId,
        content: {
          findings: payload.findings || '',
          impression: payload.impression || '',
        },
      }),
    });
    return {
      success: true,
      isLocalDemonstration: false,
      message: 'Report draft saved successfully',
    };
  },

  /**
   * Finalize and digitally sign diagnostic report
   */
  finalizeAndSignReport: async (
    reportOrOrderId: string,
    payload: { findings: string; impression: string; signerPin?: string }
  ): Promise<{ success: boolean; isLocalDemonstration: boolean; message: string }> => {
    if (!isMutationAllowed()) {
      return {
        success: false,
        isLocalDemonstration: false,
        message: MUTATION_GUARD_MESSAGE,
      };
    }
    const endpoint = `/radiologist/worklist/${encodeURIComponent(reportOrOrderId.trim())}/report/finalize`;
    await apiClient(endpoint, {
      method: 'POST',
      body: JSON.stringify({
        findings: payload.findings,
        impression: payload.impression,
        approved: true,
      }),
    });
    return {
      success: true,
      isLocalDemonstration: false,
      message: 'Diagnostic report signed and finalized',
    };
  },
};
