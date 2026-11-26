import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  useAppointments,
  useReadyReports,
  useWaitingQueue,
} from '@/src/hooks/useReception';
import { receptionService } from '@/src/services/receptionService';
import {
  ReadyReportItem,
  StaffAppointmentItem,
} from '@/src/types/reception';
import { ModalityType, Priority } from '@/src/types';
import { formatDate } from '@/src/utils/formatters';
import { Colors } from '@/src/theme/colors';
import { ModuleIcon } from '@/src/components/ui/ModuleIcon';

const MODALITY_FILTERS: { key: string; label: string }[] = [
  { key: 'ALL', label: 'All' },
  { key: 'CT', label: 'CT' },
  { key: 'MRI', label: 'MRI' },
  { key: 'XRAY', label: 'X-Ray' },
  { key: 'ULTRASOUND', label: 'US' },
];

export default function ReceptionScreen() {
  const router = useRouter();

  const todayDateStr = new Date().toISOString().split('T')[0];
  const [selectedDate, setSelectedDate] = useState<string>(todayDateStr);
  const [activeTab, setActiveTab] = useState<'QUEUE' | 'BOOKINGS' | 'REPORTS'>('QUEUE');
  const [selectedModality, setSelectedModality] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Check-In modal state
  const [checkInTarget, setCheckInTarget] = useState<StaffAppointmentItem | null>(null);
  const [verifiedGovtId, setVerifiedGovtId] = useState(false);
  const [verifiedWristband, setVerifiedWristband] = useState(false);
  const [confirmedPrep, setConfirmedPrep] = useState(false);
  const [recentCheckedInAppt, setRecentCheckedInAppt] = useState<StaffAppointmentItem | null>(null);

  // Ready report detail modal
  const [selectedReport, setSelectedReport] = useState<ReadyReportItem | null>(null);

  // Queries
  const {
    data: queueData,
    isLoading: loadingQueue,
    isError: queueError,
    error: queueErrObj,
    refetch: refetchQueue,
    isRefetching: refetchingQueue,
  } = useWaitingQueue({
    date: selectedDate,
    modality: selectedModality === 'ALL' ? undefined : (selectedModality as ModalityType),
  });

  const {
    data: appointmentsData,
    isLoading: loadingAppts,
    isError: apptsError,
    error: apptsErrObj,
    refetch: refetchAppts,
    isRefetching: refetchingAppts,
  } = useAppointments({
    date: selectedDate,
    modality: selectedModality === 'ALL' ? undefined : (selectedModality as ModalityType),
    pageSize: 50,
  });

  const {
    data: readyReportsData,
    isLoading: loadingReports,
    refetch: refetchReports,
    isRefetching: refetchingReports,
  } = useReadyReports();

  const isRefreshing = refetchingQueue || refetchingAppts || refetchingReports;
  const handleRefresh = () => {
    refetchQueue();
    refetchAppts();
    refetchReports();
  };

  const rawQueue = queueData || [];
  const rawAppointments = appointmentsData?.items || [];
  const rawReports = readyReportsData || [];

  // Local state overlay for simulated check-ins
  const displayQueue = recentCheckedInAppt
    ? [recentCheckedInAppt, ...rawQueue.filter((q) => q.id !== recentCheckedInAppt.id)]
    : rawQueue;

  // Filter appointments for Today's bookings
  const filteredBookings = rawAppointments.filter((appt) => {
    if (selectedModality !== 'ALL' && appt.modality !== selectedModality) return false;
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      appt.appointmentNumber.toLowerCase().includes(q) ||
      appt.patient?.firstName.toLowerCase().includes(q) ||
      appt.patient?.lastName.toLowerCase().includes(q) ||
      appt.patient?.patientId.toLowerCase().includes(q) ||
      appt.imagingOrder?.accessionNumber.toLowerCase().includes(q) ||
      appt.examination.toLowerCase().includes(q)
    );
  });

  // Filter waiting queue
  const filteredQueue = displayQueue.filter((item) => {
    if (selectedModality !== 'ALL' && item.modality !== selectedModality) return false;
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      (item.tokenNumber && item.tokenNumber.toLowerCase().includes(q)) ||
      item.appointmentNumber.toLowerCase().includes(q) ||
      item.patient?.firstName.toLowerCase().includes(q) ||
      item.patient?.lastName.toLowerCase().includes(q) ||
      item.patient?.patientId.toLowerCase().includes(q) ||
      item.imagingOrder?.accessionNumber.toLowerCase().includes(q) ||
      item.examination.toLowerCase().includes(q)
    );
  });

  // Filter ready reports
  const filteredReports = rawReports.filter((rep) => {
    if (selectedModality !== 'ALL' && rep.modality !== selectedModality) return false;
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      rep.accessionNumber.toLowerCase().includes(q) ||
      rep.patientName.toLowerCase().includes(q) ||
      rep.patientId.toLowerCase().includes(q) ||
      rep.examinationName.toLowerCase().includes(q)
    );
  });

  // Counts
  const countWaiting = displayQueue.length;
  const countScheduled = rawAppointments.filter((a) => a.status === 'SCHEDULED' || a.status === 'CONFIRMED').length;
  const countCompleted = rawAppointments.filter((a) => a.status === 'COMPLETED' || a.imagingOrder?.orderStatus === 'COMPLETED').length;
  const countReadyReports = rawReports.length;

  const handleOpenCheckIn = (appt: StaffAppointmentItem) => {
    setCheckInTarget(appt);
    setVerifiedGovtId(false);
    setVerifiedWristband(false);
    setConfirmedPrep(false);
  };

  const handleExecuteDemoCheckIn = async () => {
    if (!checkInTarget) return;
    if (!verifiedGovtId && !verifiedWristband) {
      Alert.alert(
        'Identity Verification Required',
        'Staff must verify at least one primary identification method (Photo ID or Wristband) before check-in.'
      );
      return;
    }

    try {
      const targetPatientId = checkInTarget.patient?.patientId;
      const res = await receptionService.checkInPatient(checkInTarget, {
        verifiedIdentity: true,
        notes: verifiedGovtId ? 'Photo ID verified' : 'Wristband verified',
      });

      setRecentCheckedInAppt(res.appointment);
      setCheckInTarget(null);

      Alert.alert(
        res.isLocalDemonstration ? 'Preview Only' : 'Check-In Recorded',
        res.isLocalDemonstration
          ? 'Preview only — no changes saved.'
          : `${res.message}\n\nAssigned Token: ${res.tokenNumber}\nPatient: ${checkInTarget.patient?.firstName} ${checkInTarget.patient?.lastName} (MRN: ${targetPatientId || 'N/A'})\nExam: ${checkInTarget.examination}`,
        [
          { text: 'View Queue', onPress: () => setActiveTab('QUEUE') },
          {
            text: 'Open in Worklist →',
            onPress: () => {
              if (targetPatientId) {
                router.push({
                  pathname: '/(app)/(tabs)/worklist',
                  params: { search: targetPatientId },
                });
              } else {
                setActiveTab('QUEUE');
              }
            },
          },
        ]
      );
    } catch (err: any) {
      Alert.alert('Check-In Error', err?.message || 'Could not record check-in.');
    }
  };

  const getPriorityBadgeStyle = (priority: Priority) => {
    switch (priority) {
      case 'STAT':
        return { bg: '#FEE2E2', text: '#DC2626', border: '#FCA5A5' };
      case 'URGENT':
        return { bg: '#FEF3C7', text: '#B45309', border: '#FDE68A' };
      default:
        return { bg: '#F1F5F9', text: '#475569', border: '#E2E8F0' };
    }
  };

  const getStatusBadgeStyle = (status: string) => {
    switch (status) {
      case 'CHECKED_IN':
        return { bg: '#D1FAE5', text: '#065F46', border: '#A7F3D0' };
      case 'SCHEDULED':
      case 'CONFIRMED':
        return { bg: '#EFF6FF', text: '#1D4ED8', border: '#BFDBFE' };
      case 'COMPLETED':
        return { bg: '#ECFDF5', text: '#047857', border: '#6EE7B7' };
      case 'CANCELLED':
      case 'NO_SHOW':
        return { bg: '#FEF2F2', text: '#991B1B', border: '#FECACA' };
      default:
        return { bg: '#F8FAFC', text: '#64748B', border: '#E2E8F0' };
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>← Back</Text>
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <View style={styles.headerTitleRow}>
            <ModuleIcon name="reception" size={16} containerSize={28} style={{ marginRight: 6 }} />
            <Text style={styles.headerTitle}>Reception & Queue</Text>
          </View>
          <Text style={styles.headerSubtitle}>
            Front Desk Arrival, Token Dispenser & Handover
          </Text>
        </View>
        <View style={{ width: 60 }} />
      </View>

      {/* Date Switcher: Today vs Seeded Clinical Staging Dates */}
      <View style={styles.dateBar}>
        <Text style={styles.dateLabel}>Schedule:</Text>
        <TouchableOpacity
          style={[styles.dateChip, selectedDate === todayDateStr && styles.dateChipActive]}
          onPress={() => setSelectedDate(todayDateStr)}
          activeOpacity={0.8}
        >
          <Text style={[styles.dateChipText, selectedDate === todayDateStr && styles.dateChipTextActive]}>
            Today
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.dateChip, selectedDate === '2026-11-21' && styles.dateChipActive]}
          onPress={() => setSelectedDate('2026-11-21')}
          activeOpacity={0.8}
        >
          <Text style={[styles.dateChipText, selectedDate === '2026-11-21' && styles.dateChipTextActive]}>
            Nov 21
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.dateChip, selectedDate === '2026-11-22' && selectedDate !== todayDateStr && styles.dateChipActive]}
          onPress={() => setSelectedDate('2026-11-22')}
          activeOpacity={0.8}
        >
          <Text style={[styles.dateChipText, selectedDate === '2026-11-22' && styles.dateChipTextActive]}>
            Nov 22
          </Text>
        </TouchableOpacity>
      </View>

      {/* 4-Metric Strip */}
      <View style={styles.metricStrip}>
        <View style={styles.metricBox}>
          <Text style={styles.metricValue}>{countWaiting}</Text>
          <Text style={styles.metricTitle}>In Queue</Text>
        </View>
        <View style={styles.metricBox}>
          <Text style={[styles.metricValue, { color: '#1D4ED8' }]}>{countScheduled}</Text>
          <Text style={styles.metricTitle}>Pending Arrival</Text>
        </View>
        <View style={styles.metricBox}>
          <Text style={[styles.metricValue, { color: '#047857' }]}>{countCompleted}</Text>
          <Text style={styles.metricTitle}>Completed</Text>
        </View>
        <View style={styles.metricBox}>
          <Text style={[styles.metricValue, { color: '#7C3AED' }]}>{countReadyReports}</Text>
          <Text style={styles.metricTitle}>Ready Reports</Text>
        </View>
      </View>

      {/* Primary Tab Switcher */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'QUEUE' && styles.tabItemActive]}
          onPress={() => setActiveTab('QUEUE')}
        >
          <Text style={[styles.tabText, activeTab === 'QUEUE' && styles.tabTextActive]}>
            Waiting Queue ({countWaiting})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'BOOKINGS' && styles.tabItemActive]}
          onPress={() => setActiveTab('BOOKINGS')}
        >
          <Text style={[styles.tabText, activeTab === 'BOOKINGS' && styles.tabTextActive]}>
            Bookings ({rawAppointments.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'REPORTS' && styles.tabItemActive]}
          onPress={() => setActiveTab('REPORTS')}
        >
          <Text style={[styles.tabText, activeTab === 'REPORTS' && styles.tabTextActive]}>
            Handover ({countReadyReports})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View style={styles.searchBarContainer}>
        <TextInput
          style={styles.searchInput}
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Filter patient, MRN, token, or accession..."
          placeholderTextColor="#94A3B8"
          autoCapitalize="none"
          autoCorrect={false}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearSearchBtn}>
            <Text style={styles.clearSearchText}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Modality Filter Chips */}
      <View style={styles.modalityRow}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.modalityScroll}>
          {MODALITY_FILTERS.map((mod) => (
            <TouchableOpacity
              key={mod.key}
              style={[styles.modalityChip, selectedModality === mod.key && styles.modalityChipActive]}
              onPress={() => setSelectedModality(mod.key)}
            >
              <Text style={[styles.modalityChipText, selectedModality === mod.key && styles.modalityChipTextActive]}>
                {mod.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Main Content List */}
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={Colors.brand.emerald}
          />
        }
      >
        {/* TAB 1: WAITING QUEUE */}
        {activeTab === 'QUEUE' && (
          <>
            {loadingQueue ? (
              <View style={styles.centered}>
                <ActivityIndicator size="large" color={Colors.brand.emerald} />
                <Text style={styles.loadingText}>Fetching active reception queue...</Text>
              </View>
            ) : queueError ? (
              <View style={styles.errorBox}>
                <Text style={styles.errorIcon}>⚠️</Text>
                <Text style={styles.errorTitle}>Unable to Load Queue</Text>
                <Text style={styles.errorSub}>
                  {queueErrObj instanceof Error ? queueErrObj.message : 'Please check connection.'}
                </Text>
              </View>
            ) : filteredQueue.length > 0 ? (
              filteredQueue.map((item, index) => {
                const prioStyle = getPriorityBadgeStyle(item.priority);
                const checkInTime = item.checkedInAt
                  ? new Date(item.checkedInAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                  : '--:--';

                return (
                  <View key={item.id} style={styles.card}>
                    <View style={styles.cardHeaderRow}>
                      <View style={styles.tokenPill}>
                        <Text style={styles.tokenNumber}>{item.tokenNumber || `Q-${index + 1}`}</Text>
                      </View>
                      <View style={styles.badgesRow}>
                        <View style={[styles.priorityBadge, { backgroundColor: prioStyle.bg, borderColor: prioStyle.border }]}>
                          <Text style={[styles.priorityText, { color: prioStyle.text }]}>{item.priority}</Text>
                        </View>
                      </View>
                    </View>

                    <Text style={styles.patientName}>
                      {item.patient?.firstName} {item.patient?.lastName}
                    </Text>
                    <Text style={styles.patientMeta}>
                      MRN: {item.patient?.patientId} • {item.patient?.gender} • Phone: {item.patient?.phone}
                    </Text>

                    <View style={styles.examBox}>
                      <Text style={styles.examModality}>{item.modality}</Text>
                      <Text style={styles.examName} numberOfLines={1}>
                        {item.examination || item.imagingOrder?.examinationName}
                      </Text>
                    </View>

                    <View style={styles.footerRow}>
                      <Text style={styles.timeTag}>Checked In: {checkInTime}</Text>
                      <Text style={styles.accessionTag}>ACC: {item.imagingOrder?.accessionNumber}</Text>
                    </View>
                    {item.equipment?.name && (
                      <Text style={styles.equipmentText}>
                        Assigned: {item.equipment.name} ({item.equipment.location})
                      </Text>
                    )}
                    <TouchableOpacity
                      style={styles.findInWorklistBtn}
                      onPress={() => {
                        const targetId = item.imagingOrder?.accessionNumber || item.patient?.patientId;
                        if (targetId) {
                          router.push({
                            pathname: '/(app)/(tabs)/worklist',
                            params: { search: targetId },
                          });
                        }
                      }}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.findInWorklistText}>Search in Worklist →</Text>
                    </TouchableOpacity>
                  </View>
                );
              })
            ) : (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyTitle}>No Patients in Queue</Text>
                <Text style={styles.emptySub}>
                  No checked-in patients waiting for {selectedModality === 'ALL' ? 'any modality' : selectedModality} on {selectedDate}.
                </Text>
                {selectedDate !== '2026-11-21' && (
                  <TouchableOpacity
                    style={styles.switchDateBtn}
                    onPress={() => setSelectedDate('2026-11-21')}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.switchDateBtnText}>Switch to Nov 21 →</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
          </>
        )}

        {/* TAB 2: TODAY'S BOOKINGS */}
        {activeTab === 'BOOKINGS' && (
          <>
            {loadingAppts ? (
              <View style={styles.centered}>
                <ActivityIndicator size="large" color={Colors.brand.emerald} />
                <Text style={styles.loadingText}>Fetching bookings...</Text>
              </View>
            ) : apptsError ? (
              <View style={styles.errorBox}>
                <Text style={styles.errorIcon}>⚠️</Text>
                <Text style={styles.errorTitle}>Unable to Load Bookings</Text>
                <Text style={styles.errorSub}>
                  {apptsErrObj instanceof Error ? apptsErrObj.message : 'Please check connection.'}
                </Text>
              </View>
            ) : filteredBookings.length > 0 ? (
              filteredBookings.map((appt) => {
                const statusStyle = getStatusBadgeStyle(appt.status);
                const prioStyle = getPriorityBadgeStyle(appt.priority);
                const startTime = appt.scheduledStart
                  ? new Date(appt.scheduledStart).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                  : '--:--';
                const endTime = appt.scheduledEnd
                  ? new Date(appt.scheduledEnd).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                  : '';

                const canCheckIn =
                  appt.status === 'SCHEDULED' || appt.status === 'CONFIRMED';

                return (
                  <View key={appt.id} style={styles.card}>
                    <View style={styles.cardHeaderRow}>
                      <View style={styles.timePill}>
                        <Text style={styles.timePillText}>{startTime} {endTime ? `- ${endTime}` : ''}</Text>
                      </View>
                      <View style={styles.badgesRow}>
                        <View style={[styles.priorityBadge, { backgroundColor: prioStyle.bg, borderColor: prioStyle.border }]}>
                          <Text style={[styles.priorityText, { color: prioStyle.text }]}>{appt.priority}</Text>
                        </View>
                        <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg, borderColor: statusStyle.border }]}>
                          <Text style={[styles.statusText, { color: statusStyle.text }]}>{appt.status}</Text>
                        </View>
                      </View>
                    </View>

                    <Text style={styles.patientName}>
                      {appt.patient?.firstName} {appt.patient?.lastName}
                    </Text>
                    <Text style={styles.patientMeta}>
                      MRN: {appt.patient?.patientId} • Phone: {appt.patient?.phone}
                    </Text>

                    <View style={styles.examBox}>
                      <Text style={styles.examModality}>{appt.modality}</Text>
                      <Text style={styles.examName} numberOfLines={1}>
                        {appt.examination || appt.imagingOrder?.examinationName}
                      </Text>
                    </View>

                    <View style={styles.footerRow}>
                      <Text style={styles.accessionTag}>ACC: {appt.imagingOrder?.accessionNumber}</Text>
                      <Text style={styles.locationTag}>{appt.equipment?.name || appt.location || 'Suite TBA'}</Text>
                    </View>

                    {canCheckIn ? (
                      <TouchableOpacity
                        style={styles.checkInActionBtn}
                        onPress={() => handleOpenCheckIn(appt)}
                        activeOpacity={0.8}
                      >
                        <Text style={styles.checkInActionBtnText}>Check In Patient (Issue Token) →</Text>
                      </TouchableOpacity>
                    ) : appt.status === 'CHECKED_IN' ? (
                      <View style={styles.checkedInRow}>
                        <Text style={styles.checkedInRowText}>
                          ✓ Checked In {appt.tokenNumber ? `• Token: ${appt.tokenNumber}` : ''}
                        </Text>
                        <TouchableOpacity
                          style={styles.findInWorklistBtn}
                          onPress={() => {
                            const targetId = appt.imagingOrder?.accessionNumber || appt.patient?.patientId;
                            if (targetId) {
                              router.push({
                                pathname: '/(app)/(tabs)/worklist',
                                params: { search: targetId },
                              });
                            }
                          }}
                          activeOpacity={0.8}
                        >
                          <Text style={styles.findInWorklistText}>Open in Worklist →</Text>
                        </TouchableOpacity>
                      </View>
                    ) : null}
                  </View>
                );
              })
            ) : (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyTitle}>No Bookings Found</Text>
                <Text style={styles.emptySub}>
                  No appointments scheduled on {selectedDate} for the selected filter.
                </Text>
              </View>
            )}
          </>
        )}

        {/* TAB 3: REPORT HANDOVER */}
        {activeTab === 'REPORTS' && (
          <>
            {loadingReports ? (
              <View style={styles.centered}>
                <ActivityIndicator size="large" color={Colors.brand.emerald} />
                <Text style={styles.loadingText}>Fetching ready reports...</Text>
              </View>
            ) : filteredReports.length > 0 ? (
              filteredReports.map((rep) => (
                <TouchableOpacity
                  key={rep.reportId || rep.accessionNumber}
                  style={styles.card}
                  onPress={() => setSelectedReport(rep)}
                  activeOpacity={0.7}
                >
                  <View style={styles.cardHeaderRow}>
                    <View style={styles.reportPill}>
                      <Text style={styles.reportPillText}>READY FOR HANDOVER</Text>
                    </View>
                    <View style={styles.modalityBadge}>
                      <Text style={styles.modalityBadgeText}>{rep.modality}</Text>
                    </View>
                  </View>

                  <Text style={styles.patientName}>{rep.patientName}</Text>
                  <Text style={styles.patientMeta}>
                    MRN: {rep.patientId} • Phone: {rep.phone}
                  </Text>
                  <Text style={styles.examNameReport}>{rep.examinationName}</Text>

                  <View style={styles.footerRow}>
                    <Text style={styles.accessionTag}>ACC: {rep.accessionNumber}</Text>
                    <Text style={styles.signedByText}>Signed: {rep.signedBy || 'Arthur Evans'}</Text>
                  </View>

                  <View style={styles.handoverRow}>
                    <Text style={styles.handoverStatus}>
                      Delivery: {rep.deliveryStatus} ({rep.deliveriesCount} receipt{rep.deliveriesCount === 1 ? '' : 's'})
                    </Text>
                    <Text style={styles.viewDetailsLink}>View Details →</Text>
                  </View>
                </TouchableOpacity>
              ))
            ) : (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyTitle}>No Reports Ready for Handover</Text>
                <Text style={styles.emptySub}>
                  Finalized reports will appear here when marked ready by radiologists for patient front-desk collection.
                </Text>
              </View>
            )}
          </>
        )}
      </ScrollView>

      {/* Patient Check-In Modal (Local Simulation Protected) */}
      <Modal
        visible={!!checkInTarget}
        transparent
        animationType="slide"
        onRequestClose={() => setCheckInTarget(null)}
      >
        {checkInTarget ? (
          <View style={styles.modalOverlay}>
            <View style={styles.modalContainer}>
              <View style={styles.modalHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.modalSubhead}>Front Desk Check-In</Text>
                  <Text style={styles.modalTitle}>
                    {checkInTarget.patient?.firstName} {checkInTarget.patient?.lastName}
                  </Text>
                </View>
                <TouchableOpacity onPress={() => setCheckInTarget(null)} style={styles.modalCloseBtn}>
                  <Text style={styles.modalCloseText}>✕</Text>
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.modalBody}>
                {/* Patient and Appointment Info */}
                <View style={styles.infoBox}>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Patient MRN:</Text>
                    <Text style={styles.infoValue}>{checkInTarget?.patient?.patientId}</Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Scheduled Exam:</Text>
                    <Text style={styles.infoValueBold}>{checkInTarget?.examination}</Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Accession Reference:</Text>
                    <Text style={styles.infoValue}>{checkInTarget?.imagingOrder?.accessionNumber}</Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Room / Equipment:</Text>
                    <Text style={styles.infoValue}>{checkInTarget?.equipment?.name || 'Assigned on Call'}</Text>
                  </View>
                </View>

                {/* Safety Disclaimers */}
                <View style={styles.simNoticeBox}>
                  <Text style={styles.simNoticeTitle}>FRONT DESK CHECK-IN GUARD</Text>
                  <Text style={styles.simNoticeText}>
                    To protect the production RIS database during mobile development, this action issues a local demonstration queue token. No mutation requests are transmitted to the live server.
                  </Text>
                </View>

                {/* Staff Verification Checkboxes */}
                <Text style={styles.sectionHeaderTitle}>IDENTITY & CLINICAL VERIFICATION</Text>

                <TouchableOpacity
                  style={styles.checkboxRow}
                  onPress={() => setVerifiedGovtId(!verifiedGovtId)}
                  activeOpacity={0.8}
                >
                  <View style={[styles.checkbox, verifiedGovtId && styles.checkboxChecked]}>
                    {verifiedGovtId && <Text style={styles.checkboxCheck}>✓</Text>}
                  </View>
                  <Text style={styles.checkboxLabel}>
                    Government Photo ID Verified (Passport, Driver License, National ID)
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.checkboxRow}
                  onPress={() => setVerifiedWristband(!verifiedWristband)}
                  activeOpacity={0.8}
                >
                  <View style={[styles.checkbox, verifiedWristband && styles.checkboxChecked]}>
                    {verifiedWristband && <Text style={styles.checkboxCheck}>✓</Text>}
                  </View>
                  <Text style={styles.checkboxLabel}>
                    Hospital Inpatient Wristband Verified (MRN & DOB match)
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.checkboxRow}
                  onPress={() => setConfirmedPrep(!confirmedPrep)}
                  activeOpacity={0.8}
                >
                  <View style={[styles.checkbox, confirmedPrep && styles.checkboxChecked]}>
                    {confirmedPrep && <Text style={styles.checkboxCheck}>✓</Text>}
                  </View>
                  <Text style={styles.checkboxLabel}>
                    Patient Preparation Confirmed (Fasting / Hydration / Contrast Safety)
                  </Text>
                </TouchableOpacity>

                {/* Action Button */}
                <TouchableOpacity
                  style={[
                    styles.confirmCheckInBtn,
                    (!verifiedGovtId && !verifiedWristband) && styles.confirmCheckInBtnDisabled,
                  ]}
                  onPress={handleExecuteDemoCheckIn}
                  activeOpacity={0.8}
                >
                  <Text style={styles.confirmCheckInBtnText}>Issue Waiting Token & Complete Check-In</Text>
                </TouchableOpacity>
              </ScrollView>
            </View>
          </View>
        ) : null}
      </Modal>

      {/* Report Handover Detail Modal */}
      <Modal
        visible={!!selectedReport}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedReport(null)}
      >
        {selectedReport ? (
          <View style={styles.modalOverlay}>
            <View style={styles.modalContainer}>
              <View style={styles.modalHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.modalSubhead}>Report Delivery Record</Text>
                  <Text style={styles.modalTitle}>{selectedReport.accessionNumber}</Text>
                </View>
                <TouchableOpacity onPress={() => setSelectedReport(null)} style={styles.modalCloseBtn}>
                  <Text style={styles.modalCloseText}>✕</Text>
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.modalBody}>
                <View style={styles.infoBox}>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Patient Name:</Text>
                    <Text style={styles.infoValueBold}>{selectedReport.patientName}</Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Patient MRN:</Text>
                    <Text style={styles.infoValue}>{selectedReport.patientId}</Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Examination:</Text>
                    <Text style={styles.infoValue}>{selectedReport.examinationName}</Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Reporting Radiologist:</Text>
                    <Text style={styles.infoValueBold}>{selectedReport.signedBy || 'Arthur Evans'}</Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Finalized Timestamp:</Text>
                    <Text style={styles.infoValue}>
                      {selectedReport.finalizedAt ? formatDate(selectedReport.finalizedAt, { format: 'datetime' }) : 'Recent'}
                    </Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Delivery Channel:</Text>
                    <Text style={styles.infoValue}>{selectedReport.deliveryStatus}</Text>
                  </View>
                </View>

                <TouchableOpacity
                  style={styles.openPdfBtn}
                  onPress={() => {
                    const acc = selectedReport.accessionNumber;
                    setSelectedReport(null);
                    router.push({
                      pathname: '/(app)/study/[id]' as any,
                      params: { id: acc || '' },
                    });
                  }}
                  activeOpacity={0.8}
                >
                  <Text style={styles.openPdfBtnText}>View Full Diagnostic Report & PDF →</Text>
                </TouchableOpacity>
              </ScrollView>
            </View>
          </View>
        ) : null}
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  backBtn: {
    paddingVertical: 6,
    paddingRight: 12,
  },
  backBtnText: {
    fontSize: 14,
    color: Colors.brand.emerald,
    fontWeight: '700',
  },
  headerTitleContainer: {
    alignItems: 'center',
    flex: 1,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  headerSubtitle: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
  },
  dateBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#F1F5F9',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  dateLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
    marginRight: 8,
  },
  dateChip: {
    backgroundColor: '#FFFFFF',
    borderColor: '#CBD5E1',
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginRight: 8,
  },
  dateChipActive: {
    backgroundColor: Colors.brand.navy,
    borderColor: Colors.brand.navy,
  },
  dateChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#475569',
  },
  dateChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  metricStrip: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  metricBox: {
    flex: 1,
    alignItems: 'center',
  },
  metricValue: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.brand.emeraldDark,
  },
  metricTitle: {
    fontSize: 10,
    fontWeight: '600',
    color: '#64748B',
    marginTop: 2,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  tabItem: {
    flex: 1,
    paddingVertical: 11,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabItemActive: {
    borderBottomColor: Colors.brand.emerald,
  },
  tabText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  tabTextActive: {
    color: Colors.brand.emeraldDark,
    fontWeight: '700',
  },
  searchBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 14,
    marginTop: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: '#0F172A',
    paddingVertical: 2,
  },
  clearSearchBtn: {
    padding: 4,
  },
  clearSearchText: {
    color: '#94A3B8',
    fontSize: 13,
  },
  modalityRow: {
    marginTop: 8,
    marginBottom: 4,
  },
  modalityScroll: {
    paddingHorizontal: 14,
    gap: 6,
  },
  modalityChip: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  modalityChipActive: {
    backgroundColor: Colors.brand.navy,
    borderColor: Colors.brand.navy,
  },
  modalityChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#475569',
  },
  modalityChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  scrollContent: {
    paddingHorizontal: 14,
    paddingTop: 8,
    paddingBottom: 40,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 14,
    marginBottom: 10,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  tokenPill: {
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  tokenNumber: {
    fontSize: 13,
    fontWeight: '800',
    color: '#047857',
    fontFamily: 'monospace',
  },
  timePill: {
    backgroundColor: '#F1F5F9',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  timePillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#334155',
  },
  reportPill: {
    backgroundColor: '#F5F3FF',
    borderColor: '#DDD6FE',
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  reportPillText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#6D28D9',
  },
  badgesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  demoPill: {
    backgroundColor: '#FEF3C7',
    borderColor: '#FDE68A',
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  demoPillText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#92400E',
  },
  priorityBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
  },
  priorityText: {
    fontSize: 10,
    fontWeight: '800',
  },
  statusBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '700',
  },
  modalityBadge: {
    backgroundColor: '#F1F5F9',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  modalityBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#475569',
  },
  patientName: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  patientMeta: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
    marginBottom: 8,
  },
  examBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 6,
    marginBottom: 8,
  },
  examModality: {
    fontSize: 10,
    fontWeight: '800',
    color: Colors.brand.emeraldDark,
    marginRight: 6,
  },
  examName: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
  },
  examNameReport: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 6,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 4,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  timeTag: {
    fontSize: 11,
    fontWeight: '600',
    color: '#047857',
  },
  accessionTag: {
    fontSize: 11,
    fontFamily: 'monospace',
    color: '#475569',
    fontWeight: '600',
  },
  locationTag: {
    fontSize: 11,
    color: '#64748B',
  },
  signedByText: {
    fontSize: 11,
    color: '#64748B',
  },
  equipmentText: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 4,
  },
  checkInActionBtn: {
    marginTop: 10,
    backgroundColor: '#0F766E',
    borderRadius: 8,
    paddingVertical: 9,
    alignItems: 'center',
  },
  checkInActionBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  checkedInRow: {
    marginTop: 8,
    paddingVertical: 4,
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    borderRadius: 6,
  },
  checkedInRowText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#047857',
  },
  findInWorklistBtn: {
    marginTop: 6,
    backgroundColor: '#0F766E',
    borderRadius: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
    alignItems: 'center',
  },
  findInWorklistText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  handoverRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  handoverStatus: {
    fontSize: 11,
    color: '#6D28D9',
    fontWeight: '600',
  },
  viewDetailsLink: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.brand.emerald,
  },
  centered: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 12,
    color: '#64748B',
  },
  errorBox: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
    borderWidth: 1,
    borderRadius: 10,
    padding: 16,
    alignItems: 'center',
    marginVertical: 10,
  },
  errorIcon: {
    fontSize: 24,
    marginBottom: 6,
  },
  errorTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#B91C1C',
  },
  errorSub: {
    fontSize: 11,
    color: '#7F1D1D',
    textAlign: 'center',
    marginTop: 4,
  },
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 24,
    alignItems: 'center',
    marginVertical: 10,
  },

  emptyTitle: {
  fontSize: 15,
  fontWeight: '700',
  color: '#0F172A',
},
  emptySub: {
  fontSize: 12,
  color: '#64748B',
  textAlign: 'center',
  marginTop: 4,
  lineHeight: 16,
},
  switchDateBtn: {
  marginTop: 14,
  backgroundColor: '#F0FDF4',
  borderColor: '#BBF7D0',
  borderWidth: 1,
  borderRadius: 8,
  paddingVertical: 9,
  paddingHorizontal: 14,
},
  switchDateBtnText: {
  fontSize: 12,
  fontWeight: '700',
  color: '#047857',
},
  modalOverlay: {
  flex: 1,
  backgroundColor: 'rgba(15, 23, 42, 0.6)',
  justifyContent: 'flex-end',
},
  modalContainer: {
  backgroundColor: '#FFFFFF',
  borderTopLeftRadius: 20,
  borderTopRightRadius: 20,
  maxHeight: '85%',
},
  modalHeader: {
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: 16,
  borderBottomWidth: 1,
  borderBottomColor: '#E2E8F0',
},
  modalSubhead: {
  fontSize: 11,
  fontWeight: '700',
  color: '#64748B',
  textTransform: 'uppercase',
},
  modalTitle: {
  fontSize: 16,
  fontWeight: '800',
  color: '#0F172A',
  marginTop: 2,
},
  modalCloseBtn: {
  width: 32,
  height: 32,
  borderRadius: 16,
  backgroundColor: '#F1F5F9',
  alignItems: 'center',
  justifyContent: 'center',
},
  modalCloseText: {
  fontSize: 14,
  color: '#64748B',
  fontWeight: '700',
},
  modalBody: {
  padding: 16,
},
  infoBox: {
  backgroundColor: '#F8FAFC',
  borderRadius: 10,
  borderWidth: 1,
  borderColor: '#E2E8F0',
  padding: 12,
  marginBottom: 14,
},
  infoRow: {
  flexDirection: 'row',
  justifyContent: 'space-between',
  paddingVertical: 4,
},
  infoLabel: {
  fontSize: 12,
  color: '#64748B',
},
  infoValue: {
  fontSize: 12,
  color: '#0F172A',
  fontWeight: '600',
},
  infoValueBold: {
  fontSize: 12,
  color: '#0F172A',
  fontWeight: '800',
},
  simNoticeBox: {
  backgroundColor: '#FFFBEB',
  borderColor: '#FDE68A',
  borderWidth: 1,
  borderRadius: 8,
  padding: 10,
  marginBottom: 14,
},
  simNoticeTitle: {
  fontSize: 11,
  fontWeight: '800',
  color: '#92400E',
  marginBottom: 3,
},
  simNoticeText: {
  fontSize: 11,
  color: '#B45309',
  lineHeight: 15,
},
  sectionHeaderTitle: {
  fontSize: 11,
  fontWeight: '800',
  color: '#475569',
  letterSpacing: 0.5,
  marginBottom: 10,
},
  checkboxRow: {
  flexDirection: 'row',
  alignItems: 'center',
  marginBottom: 12,
  paddingVertical: 4,
},
  checkbox: {
  width: 20,
  height: 20,
  borderRadius: 4,
  borderWidth: 2,
  borderColor: '#94A3B8',
  alignItems: 'center',
  justifyContent: 'center',
  marginRight: 10,
},
  checkboxChecked: {
  backgroundColor: Colors.brand.emerald,
  borderColor: Colors.brand.emerald,
},
  checkboxCheck: {
  color: '#FFFFFF',
  fontSize: 12,
  fontWeight: '800',
},
  checkboxLabel: {
  flex: 1,
  fontSize: 12,
  color: '#334155',
  lineHeight: 16,
},
  confirmCheckInBtn: {
  backgroundColor: '#0F766E',
  borderRadius: 10,
  paddingVertical: 13,
  alignItems: 'center',
  marginTop: 10,
  marginBottom: 20,
},
  confirmCheckInBtnDisabled: {
  backgroundColor: '#94A3B8',
},
  confirmCheckInBtnText: {
  color: '#FFFFFF',
  fontSize: 13,
  fontWeight: '700',
},
  openPdfBtn: {
  backgroundColor: Colors.brand.navy,
  borderRadius: 10,
  paddingVertical: 12,
  alignItems: 'center',
  marginTop: 10,
  marginBottom: 20,
},
  openPdfBtnText: {
  color: '#FFFFFF',
  fontSize: 13,
  fontWeight: '700',
},
});
