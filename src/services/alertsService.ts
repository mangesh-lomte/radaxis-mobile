import { apiClient } from './api';
import { isMutationAllowed } from '../constants/environment';
import {
  CriticalFindingItem,
  CriticalFindingQueueResponse,
  DEMO_CRITICAL_FINDINGS,
} from '../types/alerts';

export interface GetCriticalFindingsParams {
  status?: string;
  page?: number;
  limit?: number;
}

export const alertsService = {
  /**
   * Fetch live critical findings from RIS backend
   * Endpoint: GET /radiologist/critical-findings
   */
  getCriticalFindings: async (
    params?: GetCriticalFindingsParams
  ): Promise<CriticalFindingQueueResponse> => {
    const query = new URLSearchParams();
    if (params?.status) query.append('status', params.status);
    if (params?.page) query.append('page', String(params.page));
    if (params?.limit) query.append('limit', String(params.limit));

    const qs = query.toString();
    const endpoint = `/radiologist/critical-findings${qs ? `?${qs}` : ''}`;
    const res = await apiClient<CriticalFindingQueueResponse>(endpoint);

    return (
      res.data || {
        items: [],
        pagination: { page: 1, limit: 20, total: 0, totalPages: 1 },
      }
    );
  },

  /**
   * Fetch single critical finding details
   * Endpoint: GET /radiologist/critical-findings/:id
   */
  getCriticalFindingById: async (id: string): Promise<CriticalFindingItem> => {
    // If it's a demo fixture, return from local fixtures
    const demo = DEMO_CRITICAL_FINDINGS.find((f) => f.id === id);
    if (demo) {
      return demo;
    }

    const endpoint = `/radiologist/critical-findings/${encodeURIComponent(id)}`;
    const res = await apiClient<CriticalFindingItem>(endpoint);
    return res.data;
  },

  /**
   * Acknowledge critical finding with readback confirmation.
   * If in staging mode: dispatches POST to /radiologist/critical-findings/:id/acknowledge.
   * If in production mode: safe local demo acknowledgment with zero database modification.
   */
  acknowledgeFinding: async (
    finding: CriticalFindingItem,
    acknowledgedByName: string,
    readBackNotes?: string
  ): Promise<{ finding: CriticalFindingItem; isLocalDemonstration: boolean; message: string }> => {
    if (!isMutationAllowed()) {
      const updated = alertsService.simulateAcknowledgeFinding(finding, acknowledgedByName, readBackNotes);
      return {
        finding: updated,
        isLocalDemonstration: true,
        message: 'Preview only — no changes saved.',
      };
    }

    const endpoint = `/radiologist/critical-findings/${encodeURIComponent(finding.id)}/acknowledge`;
    const res = await apiClient<CriticalFindingItem>(endpoint, {
      method: 'POST',
      body: JSON.stringify({
        notes: readBackNotes || 'Verbal read-back confirmed via mobile triage acknowledgment.',
      }),
    });

    return {
      finding: res.data || alertsService.simulateAcknowledgeFinding(finding, acknowledgedByName, readBackNotes),
      isLocalDemonstration: false,
      message: 'Critical finding acknowledgment recorded on server',
    };
  },

  /**
   * Local demonstration acknowledgment
   * Production safety guard: does not mutate backend database
   */
  simulateAcknowledgeFinding: (
    finding: CriticalFindingItem,
    acknowledgedByName: string,
    readBackNotes?: string
  ): CriticalFindingItem => {
    const now = new Date().toISOString();
    return {
      ...finding,
      status: 'ACKNOWLEDGED',
      acknowledgedAt: now,
      acknowledgedBy: {
        name: acknowledgedByName || 'Attending Clinician',
      },
      readBackConfirmed: true,
      readBackNotes:
        readBackNotes || 'Verbal read-back confirmed via mobile triage acknowledgment.',
      updatedAt: now,
    };
  },

  /**
   * Local demonstration escalation
   * Production safety guard: does not mutate backend database
   */
  simulateEscalateFinding: (finding: CriticalFindingItem): CriticalFindingItem => {
    const now = new Date().toISOString();
    const nextLevel = (finding.escalationLevel || 0) + 1;
    return {
      ...finding,
      status: 'ESCALATED',
      escalationLevel: nextLevel,
      escalatedAt: now,
      updatedAt: now,
    };
  },
};
