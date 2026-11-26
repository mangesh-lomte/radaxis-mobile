/**
 * RadAxis RIS Mobile — Shared Canonical Preview Fixture
 * Phase 1.6.1 Design-Lock Correction
 *
 * All mock/preview patient and examination records across Home, Worklist,
 * Patients, Study Detail, and Alerts are centralized here.
 *
 * Age and demographics are dynamically computed from dateOfBirth and cannot drift.
 * Fictional test data only. No real patient data.
 */

import { Priority } from '@/src/types';
import { formatDemographics } from '@/src/utils/demographics';

// Standard reference date for deterministic preview: November 21, 2026
export const PREVIEW_REFERENCE_DATE = new Date(2026, 10, 21);

export interface WorkflowTimelineStep {
  label: string;
  timestamp: string;
  completed: boolean;
  active: boolean;
}

export interface CanonicalStudy {
  id: string;
  patientId: string;           // MRN (e.g. PAT-2026-00101)
  accessionNumber: string;     // ACC (e.g. ACC-2026-00201)
  patientName: string;
  dateOfBirth: string;         // YYYY-MM-DD
  age: number;                 // Dynamically calculated from dateOfBirth
  sex: 'Female' | 'Male';
  demographicsShort: string;   // Dynamically formatted (e.g. '65F')
  procedure: string;
  modality: 'CT' | 'MRI' | 'XRAY' | 'US';
  priority: Priority;
  status: 'SCHEDULED' | 'ARRIVED' | 'WAITING' | 'SCANNING' | 'PACS READY' | 'READY FOR REPORTING' | 'REPORTING' | 'FINAL VERIFIED' | 'CANCELLED';
  allergy: string;
  hasAllergyAlert: boolean;
  location: string;
  category: 'INPATIENT' | 'OUTPATIENT';
  orderingClinician: string;
  orderingDepartment: string;
  pager: string;
  indication: string;
  scheduledTime: string;
  waitingTime: string;
  dicomSlices: number;
  doseKvp: string;
  reconKernel: string;
  scannerBay: string;
  timeline: WorkflowTimelineStep[];
  criticalAlert?: {
    id: string;
    severity: 'CRITICAL' | 'WARNING' | 'INFO';
    title: string;
    findingDetail: string;
    timestamp: string;
    escalationTime: string;
  };
}

interface RawStudyInput extends Omit<CanonicalStudy, 'age' | 'demographicsShort'> {}

function buildCanonicalStudy(input: RawStudyInput): CanonicalStudy {
  const { age, demographicsShort } = formatDemographics(
    input.dateOfBirth,
    input.sex,
    PREVIEW_REFERENCE_DATE
  );
  return {
    ...input,
    age,
    demographicsShort,
  };
}

export const CANONICAL_STUDIES: CanonicalStudy[] = [
  // 1. Eleanor Vance (DOB: 1961-08-14 -> Age 65 as of 2026-11-21)
  // Clinically coherent scenario: Acute Type A Aortic Dissection on CT Chest Abdomen Pelvis
  buildCanonicalStudy({
    id: 'study-vance-001',
    patientId: 'PAT-2026-00101',
    accessionNumber: 'ACC-2026-00201',
    patientName: 'Eleanor Vance',
    dateOfBirth: '1961-08-14',
    sex: 'Female',
    procedure: 'CT Chest Abdomen Pelvis with Contrast',
    modality: 'CT',
    priority: 'STAT',
    status: 'PACS READY',
    allergy: 'IV Iodinated Contrast (Mild rash history — Pre-medicated protocol confirmed)',
    hasAllergyAlert: true,
    location: 'Cardiothoracic ICU (Bed 04)',
    category: 'INPATIENT',
    orderingClinician: 'Dr. R. House, MD',
    orderingDepartment: 'Emergency Resus Bay 2',
    pager: '#4409',
    indication: 'Sudden onset severe 10/10 tearing retrosternal and mid-scapular chest pain radiating to epigastrium. Rule out acute aortic dissection vs. massive pulmonary embolism.',
    scheduledTime: 'Today, 10:45 AM',
    waitingTime: '12m',
    dicomSlices: 342,
    doseKvp: '100 kV • 420 mGy·cm',
    reconKernel: 'Bv40 vascular sharp • 4/4 Series Uploaded',
    scannerBay: 'Siemens Somatom Force 128 (Bay 2)',
    timeline: [
      { label: 'Ordered', timestamp: '09:15 AM', completed: true, active: false },
      { label: 'Scheduled', timestamp: '09:30 AM', completed: true, active: false },
      { label: 'Arrived', timestamp: '10:15 AM', completed: true, active: false },
      { label: 'Scanning', timestamp: '10:30 AM', completed: true, active: false },
      { label: 'PACS Ready', timestamp: '10:45 AM', completed: true, active: true },
      { label: 'Reporting', timestamp: 'Pending', completed: false, active: false },
      { label: 'Final Verified', timestamp: 'Pending', completed: false, active: false },
    ],
    criticalAlert: {
      id: 'alt-vance-001',
      severity: 'CRITICAL',
      title: 'Critical Finding: Acute Type A Aortic Dissection',
      findingDetail: 'Dissection flap visualized originating in ascending thoracic aorta extending into proximal aortic arch. Immediate cardiothoracic surgical consultation required.',
      timestamp: '4m ago',
      escalationTime: '11m',
    },
  }),

  // 2. David Kowalski (DOB: 1974-11-02 -> Age 52 as of 2026-11-21)
  // Clinically coherent scenario: Acute Stroke Code on CTA Head & Neck
  buildCanonicalStudy({
    id: 'study-kowalski-002',
    patientId: 'PAT-2026-00102',
    accessionNumber: 'ACC-2026-00202',
    patientName: 'David Kowalski',
    dateOfBirth: '1974-11-02',
    sex: 'Male',
    procedure: 'CTA Head and Neck Stroke Code',
    modality: 'CT',
    priority: 'STAT',
    status: 'SCANNING',
    allergy: 'No Known Drug Allergies (NKDA)',
    hasAllergyAlert: false,
    location: 'Emergency Bay 1',
    category: 'INPATIENT',
    orderingClinician: 'Dr. A. Cuddy, MD',
    orderingDepartment: 'Stroke Code Team',
    pager: '#2218',
    indication: 'Acute right-sided hemiparesis and sudden expressive aphasia, onset <90 mins. Code Stroke activated.',
    scheduledTime: 'Today, 11:15 AM',
    waitingTime: '5m',
    dicomSlices: 180,
    doseKvp: '120 kV • 380 mGy·cm',
    reconKernel: 'H20s smooth vascular',
    scannerBay: 'GE Revolution Apex (Bay 1)',
    timeline: [
      { label: 'Ordered', timestamp: '10:40 AM', completed: true, active: false },
      { label: 'Scheduled', timestamp: '10:50 AM', completed: true, active: false },
      { label: 'Arrived', timestamp: '11:05 AM', completed: true, active: false },
      { label: 'Scanning', timestamp: '11:15 AM', completed: false, active: true },
      { label: 'PACS Ready', timestamp: 'Pending', completed: false, active: false },
      { label: 'Reporting', timestamp: 'Pending', completed: false, active: false },
      { label: 'Final Verified', timestamp: 'Pending', completed: false, active: false },
    ],
    criticalAlert: {
      id: 'alt-kowalski-002',
      severity: 'CRITICAL',
      title: 'STAT Code Stroke: Suspected Left M1 Large Vessel Occlusion',
      findingDetail: 'Emergency non-contrast CT negative for acute hemorrhage. CTA head/neck underway to assess proximal left middle cerebral artery occlusion for thrombectomy candidacy.',
      timestamp: '10m ago',
      escalationTime: '5m',
    },
  }),

  // 3. Marcus J. Brody (DOB: 1983-05-19 -> Age 43 as of 2026-11-21)
  // Clinically coherent scenario: L4-L5 Disc Extrusion with canal compromise on MRI Lumbar Spine
  buildCanonicalStudy({
    id: 'study-brody-003',
    patientId: 'PAT-2026-00103',
    accessionNumber: 'ACC-2026-00203',
    patientName: 'Marcus J. Brody',
    dateOfBirth: '1983-05-19',
    sex: 'Male',
    procedure: 'MRI Lumbar Spine without Contrast',
    modality: 'MRI',
    priority: 'URGENT',
    status: 'READY FOR REPORTING',
    allergy: 'Penicillin (Latex safe)',
    hasAllergyAlert: false,
    location: 'Outpatient Radiology Suite B',
    category: 'OUTPATIENT',
    orderingClinician: 'Dr. J. Wilson, MD',
    orderingDepartment: 'Department of Orthopedics',
    pager: '#3104',
    indication: 'Severe progressive right lower extremity radiculopathy with acute L5 motor weakness and bilateral perineal numbness. Rule out cauda equina syndrome.',
    scheduledTime: 'Today, 11:30 AM',
    waitingTime: '25m',
    dicomSlices: 128,
    doseKvp: '1.5T Magnetic Field',
    reconKernel: 'Sagittal T1, T2, Axial T2 FSE',
    scannerBay: 'Siemens Magnetom Vida 3T (Suite B)',
    timeline: [
      { label: 'Ordered', timestamp: '09:00 AM', completed: true, active: false },
      { label: 'Scheduled', timestamp: '09:45 AM', completed: true, active: false },
      { label: 'Arrived', timestamp: '10:50 AM', completed: true, active: false },
      { label: 'Scanning', timestamp: '11:05 AM', completed: true, active: false },
      { label: 'PACS Ready', timestamp: '11:30 AM', completed: true, active: false },
      { label: 'Reporting', timestamp: '11:45 AM', completed: false, active: true },
      { label: 'Final Verified', timestamp: 'Pending', completed: false, active: false },
    ],
    criticalAlert: {
      id: 'alt-brody-003',
      severity: 'WARNING',
      title: 'Urgent Finding: L4-L5 Disc Extrusion with Severe Thecal Sac Compression',
      findingDetail: 'Large right paracentral extruded disc fragment at L4-L5 measuring 9mm with high-grade central canal stenosis. Urgent orthopedic spine consult recommended.',
      timestamp: '25m ago',
      escalationTime: '35m',
    },
  }),

  // 4. Marcus Aurelius Sterling (DOB: 1962-07-19 -> Age 64 as of 2026-11-21)
  // Clinically coherent scenario: Routine pre-operative chest X-ray
  buildCanonicalStudy({
    id: 'study-sterling-004',
    patientId: 'PAT-2026-00104',
    accessionNumber: 'ACC-2026-00204',
    patientName: 'Marcus Aurelius Sterling',
    dateOfBirth: '1962-07-19',
    sex: 'Male',
    procedure: 'X-Ray Chest PA and Lateral',
    modality: 'XRAY',
    priority: 'ROUTINE',
    status: 'ARRIVED',
    allergy: 'No Known Drug Allergies (NKDA)',
    hasAllergyAlert: false,
    location: 'Pre-Op Holding Area',
    category: 'INPATIENT',
    orderingClinician: 'Dr. E. Foreman, MD',
    orderingDepartment: 'Cardiothoracic Surgery',
    pager: '#1190',
    indication: 'Routine pre-operative cardiothoracic clearance prior to elective coronary artery bypass graft. Assess cardiomegaly and pulmonary vasculature.',
    scheduledTime: 'Today, 12:00 PM',
    waitingTime: '10m',
    dicomSlices: 2,
    doseKvp: '120 kV • 2.5 mAs',
    reconKernel: 'PA Standing + Left Lateral Digital',
    scannerBay: 'Carestream DRX-Evolution (Room 1)',
    timeline: [
      { label: 'Ordered', timestamp: '08:30 AM', completed: true, active: false },
      { label: 'Scheduled', timestamp: '09:00 AM', completed: true, active: false },
      { label: 'Arrived', timestamp: '11:50 AM', completed: true, active: true },
      { label: 'Scanning', timestamp: 'Pending', completed: false, active: false },
      { label: 'PACS Ready', timestamp: 'Pending', completed: false, active: false },
      { label: 'Reporting', timestamp: 'Pending', completed: false, active: false },
      { label: 'Final Verified', timestamp: 'Pending', completed: false, active: false },
    ],
  }),

  // 5. Priya Sharma (DOB: 1991-03-15 -> Age 35 as of 2026-11-21)
  // Clinically coherent scenario: Outpatient RUQ ultrasound for cholelithiasis
  buildCanonicalStudy({
    id: 'study-sharma-005',
    patientId: 'PAT-2026-00105',
    accessionNumber: 'ACC-2026-00205',
    patientName: 'Priya Sharma',
    dateOfBirth: '1991-03-15',
    sex: 'Female',
    procedure: 'Ultrasound Abdomen Complete',
    modality: 'US',
    priority: 'ROUTINE',
    status: 'SCHEDULED',
    allergy: 'Sulfa drugs',
    hasAllergyAlert: false,
    location: 'Sonography Suite 3',
    category: 'OUTPATIENT',
    orderingClinician: 'Dr. R. Chase, MD',
    orderingDepartment: 'General Surgery Clinic',
    pager: '#5512',
    indication: 'Intermittent post-prandial right upper quadrant pain radiating to right shoulder. Rule out cholelithiasis and acute cholecystitis.',
    scheduledTime: 'Today, 01:15 PM',
    waitingTime: '0m',
    dicomSlices: 45,
    doseKvp: 'Curved Array 3.5 MHz',
    reconKernel: 'Multi-plane abdominal doppler',
    scannerBay: 'Philips EPIQ Elite (Suite 3)',
    timeline: [
      { label: 'Ordered', timestamp: '10:00 AM', completed: true, active: false },
      { label: 'Scheduled', timestamp: '10:15 AM', completed: true, active: true },
      { label: 'Arrived', timestamp: 'Pending', completed: false, active: false },
      { label: 'Scanning', timestamp: 'Pending', completed: false, active: false },
      { label: 'PACS Ready', timestamp: 'Pending', completed: false, active: false },
      { label: 'Reporting', timestamp: 'Pending', completed: false, active: false },
      { label: 'Final Verified', timestamp: 'Pending', completed: false, active: false },
    ],
  }),
];

export const CANONICAL_OVERVIEW_METRICS = {
  totalStudies: 42,
  pendingReports: 9,
  statCriticalCount: 3,
  completedScans: 28,
  finalVerified: 14,
  pacsSyncRate: '100%',
  avgTurnaroundMinutes: 34,
  pipelineFlow: {
    booked: 6,
    arrived: 4,
    scanning: 5,
    pacsReady: 9,
    reporting: 4,
    verified: 14,
  },
};

export function getStudyByAccession(accession: string): CanonicalStudy | undefined {
  return CANONICAL_STUDIES.find(
    (s) => s.accessionNumber.toLowerCase() === accession.toLowerCase() || s.id === accession
  );
}
