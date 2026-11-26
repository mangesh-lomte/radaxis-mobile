export type CriticalSeverity = 'CRITICAL' | 'URGENT' | 'SIGNIFICANT' | 'WARNING';
export type CriticalStatus = 'PENDING' | 'NOTIFICATION_ATTEMPTED' | 'ACKNOWLEDGED' | 'ESCALATED' | 'CLOSED';

export interface CriticalFindingOrderInfo {
  id: string;
  accessionNumber: string;
  modality: string;
  bodyPart?: string;
  examinationName: string;
  patientId: string;
  patientName: string;
  location?: string;
  demographicsShort?: string;
}

export interface ClinicianContact {
  id?: string;
  name: string;
  email?: string;
  phone?: string;
  pager?: string;
  department?: string;
}

export interface CriticalFindingItem {
  id: string;
  imagingOrderId: string;
  order?: CriticalFindingOrderInfo;
  findingText: string;
  status: CriticalStatus;
  severity: CriticalSeverity;
  sentAt: string;
  acknowledgedAt?: string | null;
  acknowledgmentNotes?: string | null;
  createdBy: ClinicianContact;
  recipient: ClinicianContact;
  acknowledgedBy?: ClinicianContact | null;
  readBackConfirmed?: boolean;
  readBackNotes?: string | null;
  escalationLevel?: number;
  escalatedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  isDemoFixture?: boolean;
}

export interface CriticalFindingQueueResponse {
  items: CriticalFindingItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export const DEMO_CRITICAL_FINDINGS: CriticalFindingItem[] = [
  {
    id: 'crit-demo-001',
    imagingOrderId: 'ord-demo-pe-01',
    order: {
      id: 'ord-demo-pe-01',
      accessionNumber: 'ACC-2026-0881',
      modality: 'CT',
      bodyPart: 'Chest',
      examinationName: 'CT Pulmonary Angiogram (PE Protocol)',
      patientId: 'RAD-P-00102',
      patientName: 'Vance, Eleanor',
      location: 'Emergency Dept - Bed 04',
      demographicsShort: '58Y • F',
    },
    findingText:
      'ACUTE MASSIVE PULMONARY EMBOLISM: Large occlusive saddle embolus spanning the pulmonary trunk bifurcation and extending into bilateral main pulmonary arteries. Marked acute right ventricular strain with RV/LV diameter ratio 1.5 and interventricular septal flattening.',
    status: 'PENDING',
    severity: 'CRITICAL',
    sentAt: new Date(Date.now() - 8 * 60 * 1000).toISOString(),
    createdBy: {
      id: 'rad-01',
      name: 'Dr. Arthur Evans',
      email: 'admin@ris.local',
    },
    recipient: {
      id: 'clin-01',
      name: 'Dr. Marcus Vance',
      email: 'm.vance@hospital.org',
      phone: '+1 (555) 234-5678',
      pager: '4122',
      department: 'Emergency Medicine',
    },
    escalationLevel: 0,
    readBackConfirmed: false,
    createdAt: new Date(Date.now() - 8 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 8 * 60 * 1000).toISOString(),
    isDemoFixture: true,
  },
  {
    id: 'crit-demo-002',
    imagingOrderId: 'ord-demo-ich-02',
    order: {
      id: 'ord-demo-ich-02',
      accessionNumber: 'ACC-2026-0914',
      modality: 'CT',
      bodyPart: 'Head',
      examinationName: 'CT Head Without Contrast (Stroke Protocol)',
      patientId: 'RAD-P-00105',
      patientName: 'Chen, Robert',
      location: 'Neuro ICU - Bed 12',
      demographicsShort: '64Y • M',
    },
    findingText:
      'ACUTE INTRACRANIAL HEMORRHAGE: Acute hyperdense right thalamic/basal ganglia hematoma measuring approximately 34 mL in volume. 6 mm leftward midline shift with compression of the third ventricle and ipsilateral lateral ventricle. Impending uncal herniation.',
    status: 'ESCALATED',
    severity: 'CRITICAL',
    sentAt: new Date(Date.now() - 26 * 60 * 1000).toISOString(),
    escalatedAt: new Date(Date.now() - 11 * 60 * 1000).toISOString(),
    escalationLevel: 1,
    createdBy: {
      id: 'rad-01',
      name: 'Dr. Arthur Evans',
      email: 'admin@ris.local',
    },
    recipient: {
      id: 'clin-02',
      name: 'Dr. Sarah Lin',
      email: 's.lin@neuro.org',
      phone: '+1 (555) 345-6789',
      pager: '4890',
      department: 'Neurology ICU',
    },
    readBackConfirmed: false,
    createdAt: new Date(Date.now() - 26 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 11 * 60 * 1000).toISOString(),
    isDemoFixture: true,
  },
  {
    id: 'crit-demo-003',
    imagingOrderId: 'ord-demo-ptx-03',
    order: {
      id: 'ord-demo-ptx-03',
      accessionNumber: 'ACC-2026-0940',
      modality: 'CR',
      bodyPart: 'Chest',
      examinationName: 'Chest AP Portable (Post-Line Placement)',
      patientId: 'RAD-P-00109',
      patientName: 'Holden, James',
      location: 'Trauma Bay 2',
      demographicsShort: '42Y • M',
    },
    findingText:
      'TENSION PNEUMOTHORAX: Extensive right tension pneumothorax with complete right lung collapse, severe downward depression of the right hemidiaphragm, and marked contralateral mediastinal shift to the left.',
    status: 'ACKNOWLEDGED',
    severity: 'CRITICAL',
    sentAt: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
    acknowledgedAt: new Date(Date.now() - 41 * 60 * 1000).toISOString(),
    createdBy: {
      id: 'rad-01',
      name: 'Dr. Arthur Evans',
      email: 'admin@ris.local',
    },
    recipient: {
      id: 'clin-03',
      name: 'Dr. Elena Rostova',
      email: 'e.rostova@trauma.org',
      phone: '+1 (555) 456-7890',
      pager: '3310',
      department: 'Trauma Surgery',
    },
    acknowledgedBy: {
      id: 'clin-03',
      name: 'Dr. Elena Rostova',
      email: 'e.rostova@trauma.org',
    },
    readBackConfirmed: true,
    readBackNotes:
      'Verbal read-back completed by phone with Dr. Rostova. Needle decompression and chest tube insertion immediately underway.',
    escalationLevel: 0,
    createdAt: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 41 * 60 * 1000).toISOString(),
    isDemoFixture: true,
  },
];
