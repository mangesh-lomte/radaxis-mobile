/**
 * Reference Demonstration DICOM Study Configuration
 *
 * Provides a dedicated, clearly labeled external read-only demonstration
 * DICOM study for video recording and technical evaluation, completely
 * separate from patient-specific clinical image review.
 *
 * Preserves staging isolation: does NOT fabricate local staging PACS links
 * or alter clinical order states.
 */

export const DEMO_DICOM_STUDY = {
  patientName: 'Jonathan Edward Miller',
  mrn: 'PAT-2026-10001',
  accession: 'ACC-20261105-CT01',
  modality: 'CT',
  sliceCount: 12,
  description: 'Chest / Abdomen CT Examination (Axial 12 Slices)',
  studyInstanceUid: '1.2.276.0.7230010.3.1.2.1647587938.1.1794936198.801794',
  viewerUrl:
    'https://meril-ris.mangesh.my.id/viewer?StudyInstanceUIDs=1.2.276.0.7230010.3.1.2.1647587938.1.1794936198.801794',
  disclaimer:
    'External read-only demonstration study. Hosted on RadAxis Reference Viewer for technical verification. Does not represent live imaging for local staging patients.',
} as const;
