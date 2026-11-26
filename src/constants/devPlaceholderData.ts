// DEV-ONLY: Phase 1A placeholder dashboard data. Remove/replace with real API calls in Phase 1B.

export const DEV_DASHBOARD = {
  todayOverview: {
    totalScans: 42,
    pendingReports: 8,
    criticalAlerts: 2,
    scheduledAppointments: 15,
  },
  systemStatus: {
    apiStatus: 'OPERATIONAL' as const,
    pacsStatus: 'OPERATIONAL' as const,
    lastSync: '21:00',
  },
  recentAlerts: [
    { id: 'a1', type: 'STAT', message: 'STAT CT Head — PAT-2024-00142', time: '20 min ago' },
    { id: 'a2', type: 'URGENT', message: 'Pending report — PAT-2024-00138', time: '1 hr ago' },
    { id: 'a3', type: 'INFO', message: 'MRI Suite 2 maintenance window 23:00', time: '2 hr ago' },
  ],
  modalityStatus: [
    { id: 'm1', name: 'CT-1', status: 'ACTIVE', scansToday: 12 },
    { id: 'm2', name: 'CT-2', status: 'ACTIVE', scansToday: 9 },
    { id: 'm3', name: 'MRI-1', status: 'ACTIVE', scansToday: 7 },
    { id: 'm4', name: 'MRI-2', status: 'MAINTENANCE', scansToday: 0 },
    { id: 'm5', name: 'XR-1', status: 'ACTIVE', scansToday: 14 },
  ],
  quickActions: [
    { id: 'q1', label: 'Worklist', icon: '☰', href: '/(app)/(tabs)/worklist' as const },
    { id: 'q2', label: 'Patients', icon: '⊞', href: '/(app)/(tabs)/patients' as const },
    { id: 'q3', label: 'Alerts', icon: '◈', href: '/(app)/(tabs)/alerts' as const },
  ],
} as const;
