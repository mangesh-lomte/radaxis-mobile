/**
 * RadAxis RIS Mobile — Clinical Workflows React Query Hooks
 */

import { useQuery } from '@tanstack/react-query';
import { radiologistService, technologistService } from '../services/clinicalService';
import {
  FinalizedReportSummary,
  PreparationData,
  RadiologistWorklistItem,
  ReportingTemplateItem,
  SafetyScreeningData,
  TechnologistWorklistItem,
} from '../types/clinical';

export function useTechnologistWorklist(params: {
  date?: string;
  modality?: string;
  priority?: string;
  equipmentId?: string;
  search?: string;
} = {}) {
  return useQuery<TechnologistWorklistItem[], Error>({
    queryKey: ['technologistWorklist', params.date, params.modality, params.priority, params.equipmentId, params.search],
    queryFn: () => technologistService.getWorklist(params),
    staleTime: 15 * 1000,
    refetchInterval: 25 * 1000,
  });
}

export function useSafetyScreening(orderId?: string) {
  return useQuery<SafetyScreeningData, Error>({
    queryKey: ['safetyScreening', orderId],
    queryFn: () => technologistService.getSafetyScreening(orderId!),
    enabled: !!orderId,
    staleTime: 60 * 1000,
  });
}

export function usePreparation(orderId?: string) {
  return useQuery<PreparationData, Error>({
    queryKey: ['preparation', orderId],
    queryFn: () => technologistService.getPreparation(orderId!),
    enabled: !!orderId,
    staleTime: 60 * 1000,
  });
}

export function useRadiologistWorklist(params: {
  modality?: string;
  priority?: string;
  search?: string;
} = {}) {
  return useQuery<RadiologistWorklistItem[], Error>({
    queryKey: ['radiologistWorklist', params.modality, params.priority, params.search],
    queryFn: () => radiologistService.getWorklist(params),
    staleTime: 15 * 1000,
    refetchInterval: 25 * 1000,
  });
}

export function useStudyContext(orderId?: string) {
  return useQuery<any, Error>({
    queryKey: ['studyContext', orderId],
    queryFn: () => radiologistService.getStudyContext(orderId!),
    enabled: !!orderId,
    staleTime: 30 * 1000,
  });
}

export function useViewerLaunch(orderId?: string) {
  return useQuery<{ viewerUrl: string }, Error>({
    queryKey: ['viewerLaunch', orderId],
    queryFn: () => radiologistService.getViewerLaunch(orderId!),
    enabled: !!orderId,
    staleTime: 60 * 1000,
  });
}

export function useReportingTemplates() {
  return useQuery<ReportingTemplateItem[], Error>({
    queryKey: ['reportingTemplates'],
    queryFn: () => radiologistService.getReportingTemplates(),
    staleTime: 5 * 60 * 1000,
  });
}

export function useFinalizedReports() {
  return useQuery<FinalizedReportSummary[], Error>({
    queryKey: ['finalizedReports'],
    queryFn: () => radiologistService.getFinalizedReports(),
    staleTime: 30 * 1000,
  });
}
