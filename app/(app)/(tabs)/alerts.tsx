import React, { useMemo, useState } from 'react';
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
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ScreenHeader } from '@/src/components/ui/ScreenHeader';
import { FilterChip } from '@/src/components/ui/FilterChip';
import { AlertCard } from '@/src/components/ui/AlertCard';
import { useCriticalFindings } from '@/src/hooks/useAlerts';
import { alertsService } from '@/src/services/alertsService';
import { CriticalFindingItem } from '@/src/types/alerts';
import { Colors } from '@/src/theme/colors';

type AlertFilter = 'ALL' | 'PENDING' | 'ESCALATED' | 'ACKNOWLEDGED';

export default function AlertsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [selectedFilter, setSelectedFilter] = useState<AlertFilter>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Live Query from backend: GET /radiologist/critical-findings
  const {
    data: liveData,
    isLoading: loadingLive,
    isError: errorLive,
    refetch,
    isRefetching,
  } = useCriticalFindings();

  // Selected finding for detailed modal review
  const [selectedFinding, setSelectedFinding] = useState<CriticalFindingItem | null>(null);

  // Live list from server
  const liveItems = liveData?.items || [];
  const currentItems = liveItems;

  // Filtered items based on filter chips and search query
  const filteredFindings = useMemo(() => {
    return currentItems.filter((item) => {
      // 1. Status Filter
      if (selectedFilter === 'PENDING') {
        if (item.status !== 'PENDING' && item.status !== 'NOTIFICATION_ATTEMPTED') {
          return false;
        }
      } else if (selectedFilter === 'ESCALATED') {
        if (item.status !== 'ESCALATED') {
          return false;
        }
      } else if (selectedFilter === 'ACKNOWLEDGED') {
        if (item.status !== 'ACKNOWLEDGED' && item.status !== 'CLOSED') {
          return false;
        }
      }

      // 2. Search Query Filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const patientName = item.order?.patientName?.toLowerCase() || '';
        const patientId = item.order?.patientId?.toLowerCase() || '';
        const accession = item.order?.accessionNumber?.toLowerCase() || '';
        const exam = item.order?.examinationName?.toLowerCase() || '';
        const finding = item.findingText?.toLowerCase() || '';
        const doc = item.recipient?.name?.toLowerCase() || '';

        const matches =
          patientName.includes(q) ||
          patientId.includes(q) ||
          accession.includes(q) ||
          exam.includes(q) ||
          finding.includes(q) ||
          doc.includes(q);

        if (!matches) return false;
      }

      return true;
    });
  }, [currentItems, selectedFilter, searchQuery]);

  // Micro-KPI counts for active source
  const pendingCount = currentItems.filter(
    (i) => i.status === 'PENDING' || i.status === 'NOTIFICATION_ATTEMPTED'
  ).length;
  const escalatedCount = currentItems.filter((i) => i.status === 'ESCALATED').length;
  const acknowledgedCount = currentItems.filter(
    (i) => i.status === 'ACKNOWLEDGED' || i.status === 'CLOSED'
  ).length;

  // Format timestamp helper
  const formatTime = (isoString?: string) => {
    if (!isoString) return 'Just now';
    try {
      const d = new Date(isoString);
      const now = new Date();
      const diffMs = now.getTime() - d.getTime();
      const diffMins = Math.round(diffMs / (60 * 1000));
      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `${diffMins}m ago`;
      const diffHours = Math.round(diffMins / 60);
      if (diffHours < 24) return `${diffHours}h ago`;
      return d.toLocaleDateString();
    } catch {
      return isoString;
    }
  };

  // Action: Acknowledge Finding
  const handleAcknowledgePress = (finding: CriticalFindingItem) => {
    Alert.alert(
      'Acknowledge Critical Finding',
      `Confirm receipt and clinical responsibility for:\n\n${
        finding.order?.examinationName || 'Critical Finding'
      }\nPatient: ${finding.order?.patientName || 'Patient'}`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm Acknowledgment',
          onPress: async () => {
            try {
              const res = await alertsService.acknowledgeFinding(
                finding,
                'Dr. Arthur Evans',
                'Verbal read-back confirmed via mobile triage acknowledgment.'
              );
              refetch();
              if (selectedFinding?.id === finding.id) {
                setSelectedFinding(res.finding);
              }
              Alert.alert(
                res.isLocalDemonstration ? 'Preview Only' : 'Finding Acknowledged',
                res.isLocalDemonstration ? 'Preview only — no changes saved.' : res.message
              );
            } catch (err: any) {
              Alert.alert('Acknowledgment Error', err?.message || 'Could not acknowledge finding.');
            }
          },
        },
      ]
    );
  };

  // Action: Record Verbal Read-Back
  const handleReadBackPress = (finding: CriticalFindingItem) => {
    Alert.alert(
      'Record Verbal Read-Back',
      `Verify verbal communication and read-back confirmation with ${
        finding.recipient?.name || 'Responsible Clinician'
      }:\n\n"Finding confirmed received and read back accurately."`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Save Read-Back Note',
          onPress: async () => {
            try {
              const res = await alertsService.acknowledgeFinding(
                finding,
                finding.recipient?.name || 'Ordering Clinician',
                'Verbal read-back completed and verified accurately.'
              );
              refetch();
              if (selectedFinding?.id === finding.id) {
                setSelectedFinding(res.finding);
              }
              Alert.alert(
                res.isLocalDemonstration ? 'Preview Only' : 'Read-Back Logged',
                res.isLocalDemonstration ? 'Preview only — no changes saved.' : res.message
              );
            } catch (err: any) {
              Alert.alert('Read-Back Error', err?.message || 'Could not record read-back.');
            }
          },
        },
      ]
    );
  };

  // Action: Escalate Finding
  const handleEscalatePress = (finding: CriticalFindingItem) => {
    Alert.alert(
      'Escalate Critical Finding',
      `Escalate unacknowledged finding for ${
        finding.order?.patientName || 'Patient'
      } to next clinical escalation tier (Level ${
        (finding.escalationLevel || 0) + 1
      })?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Escalate Alert',
          style: 'destructive',
          onPress: () => {
            const updated = alertsService.simulateEscalateFinding(finding);
            refetch();
            if (selectedFinding?.id === finding.id) {
              setSelectedFinding(updated);
            }
            Alert.alert(
              'Preview Only',
              'Preview only — no changes saved.'
            );
          },
        },
      ]
    );
  };

  // Navigation to Study Details
  const handleOpenStudy = (orderId?: string) => {
    if (!orderId) {
      Alert.alert('Study Unavailable', 'No study record linked to this alert.');
      return;
    }
    setSelectedFinding(null);
    router.push({
      pathname: '/(app)/study/[id]',
      params: { id: orderId },
    } as any);
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={() => {
              refetch();
            }}
            tintColor="#0F766E"
          />
        }
      >
        <ScreenHeader
          title="Clinical Alerts & Findings"
          subtitle={
            pendingCount > 0
              ? `${pendingCount} STAT finding${
                  pendingCount > 1 ? 's' : ''
                } requiring clinician acknowledgment`
              : 'All urgent clinical findings acknowledged'
          }
          module="alerts"
        />

        {/* Micro-KPI Triage Summary Bar */}
        <View style={styles.microKpiGrid}>
          <View style={styles.kpiBox}>
            <Text style={styles.kpiLabel}>Total Alerts</Text>
            <View style={styles.kpiValueRow}>
              <Text style={styles.kpiValue}>{currentItems.length}</Text>
              <Text style={styles.kpiUnitSmall}>queue</Text>
            </View>
          </View>

          <View style={styles.kpiBox}>
            <Text style={styles.kpiLabel}>Pending STAT</Text>
            <View style={styles.kpiValueRow}>
              <Text
                style={[
                  styles.kpiValue,
                  pendingCount > 0 ? styles.kpiValueDanger : styles.kpiValueSuccess,
                ]}
              >
                {pendingCount}
              </Text>
              <Text style={styles.kpiUnitSmall}>active</Text>
            </View>
          </View>

          <View style={styles.kpiBox}>
            <Text style={styles.kpiLabel}>Escalated</Text>
            <View style={styles.kpiValueRow}>
              <Text
                style={[
                  styles.kpiValue,
                  escalatedCount > 0 ? styles.kpiValueWarning : undefined,
                ]}
              >
                {escalatedCount}
              </Text>
              <Text style={styles.kpiUnitSmall}>tier 1-2</Text>
            </View>
          </View>

          <View style={styles.kpiBox}>
            <Text style={styles.kpiLabel}>Acknowledged</Text>
            <View style={styles.kpiValueRow}>
              <Text style={[styles.kpiValue, styles.kpiValueSuccess]}>
                {acknowledgedCount}
              </Text>
              <Text style={styles.kpiUnitSmall}>closed</Text>
            </View>
          </View>
        </View>

        {/* Search Input Field */}
        <View style={styles.searchContainer}>
          <TextInput
            style={styles.searchInput}
            placeholder="Search alerts by patient, MRN, accession, or finding..."
            placeholderTextColor="#94A3B8"
            value={searchQuery}
            onChangeText={setSearchQuery}
            clearButtonMode="while-editing"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Text style={styles.clearSearchText}>Clear</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Filter Chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}
        >
          <FilterChip
            label="All Alerts"
            selected={selectedFilter === 'ALL'}
            count={currentItems.length}
            onPress={() => setSelectedFilter('ALL')}
          />
          <FilterChip
            label="Pending / STAT"
            selected={selectedFilter === 'PENDING'}
            count={pendingCount}
            onPress={() => setSelectedFilter('PENDING')}
          />
          <FilterChip
            label="Escalated"
            selected={selectedFilter === 'ESCALATED'}
            count={escalatedCount}
            onPress={() => setSelectedFilter('ESCALATED')}
          />
          <FilterChip
            label="Acknowledged"
            selected={selectedFilter === 'ACKNOWLEDGED'}
            count={acknowledgedCount}
            onPress={() => setSelectedFilter('ACKNOWLEDGED')}
          />
        </ScrollView>

        {/* Loading State */}
        {loadingLive && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#0F766E" />
            <Text style={styles.loadingText}>
              Fetching Critical Findings Queue from RIS Server...
            </Text>
          </View>
        )}

        {/* Error State */}
        {errorLive && !loadingLive && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorTitle}>Unable to Load Critical Findings</Text>
            <Text style={styles.errorDescription}>
              The RIS server endpoint could not be reached or your session has expired.
            </Text>
            <TouchableOpacity style={styles.retryButton} onPress={() => refetch()}>
              <Text style={styles.retryButtonText}>Retry Connection</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Empty State */}
        {!loadingLive && !errorLive && filteredFindings.length === 0 && (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyTitle}>All Critical Findings Acknowledged</Text>
            <Text style={styles.emptySubtitle}>
              {searchQuery
                ? 'No critical findings match your search criteria.'
                : 'All urgent clinical findings have been acknowledged and communicated.'}
            </Text>
            <TouchableOpacity
              style={styles.emptyRefreshButton}
              onPress={() => {
                if (searchQuery) setSearchQuery('');
                refetch();
              }}
            >
              <Text style={styles.emptyRefreshButtonText}>Refresh Alerts Queue</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Alerts List */}
        {filteredFindings.length > 0 && (
          <View style={styles.alertsList}>
            {filteredFindings.map((finding) => {
              const isAck =
                finding.status === 'ACKNOWLEDGED' || finding.status === 'CLOSED';
              const isReadBack = !!finding.readBackConfirmed;
              const isCritical = finding.severity === 'CRITICAL';

              return (
                <AlertCard
                  key={finding.id}
                  id={finding.id}
                  severity={isCritical ? 'CRITICAL' : 'WARNING'}
                  title={finding.order?.examinationName || 'Critical Clinical Alert'}
                  description={finding.findingText}
                  timestamp={formatTime(finding.sentAt)}
                  patientName={finding.order?.patientName || 'Unknown Patient'}
                  demographicsShort={
                    finding.order?.demographicsShort ||
                    `${finding.order?.modality || 'IMG'} Protocol`
                  }
                  patientId={finding.order?.patientId || 'MRN-PENDING'}
                  accessionNumber={
                    finding.order?.accessionNumber || 'ACC-PENDING'
                  }
                  location={
                    finding.order?.location ||
                    finding.recipient?.department ||
                    'Inpatient Ward'
                  }
                  procedureName={finding.order?.examinationName}
                  orderingClinician={finding.recipient?.name}
                  pager={finding.recipient?.pager || finding.recipient?.phone}
                  escalationTime={
                    finding.escalationLevel && finding.escalationLevel > 0
                      ? `Level ${finding.escalationLevel} Escalated`
                      : undefined
                  }
                  acknowledged={isAck}
                  readBackRecorded={isReadBack}
                  onPress={() => setSelectedFinding(finding)}
                  onAcknowledge={() => handleAcknowledgePress(finding)}
                  onRecordReadBack={() => handleReadBackPress(finding)}
                />
              );
            })}
          </View>
        )}

        {/* Security & Audit Notice */}
        <View style={styles.auditNotice}>
          <Text style={styles.auditNoticeText}>
            RadAxis Emergency Notification System · Closed-Loop Acknowledgment
          </Text>
        </View>
      </ScrollView>

      {/* DETAILED CRITICAL FINDING MODAL */}
      <Modal
        visible={!!selectedFinding}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setSelectedFinding(null)}
      >
        {selectedFinding && (
          <View style={styles.modalOverlay}>
            <View style={styles.modalCard}>
              {/* Modal Header */}
              <View style={styles.modalHeader}>
                <View style={styles.modalHeaderTitleBlock}>
                  <View
                    style={[
                      styles.modalSeverityPill,
                      selectedFinding.severity === 'CRITICAL'
                        ? styles.modalSeverityPillCritical
                        : styles.modalSeverityPillWarning,
                    ]}
                  >
                    <Text
                      style={[
                        styles.modalSeverityText,
                        selectedFinding.severity === 'CRITICAL'
                          ? styles.modalSeverityTextCritical
                          : styles.modalSeverityTextWarning,
                      ]}
                    >
                      {selectedFinding.severity === 'CRITICAL'
                        ? 'CRITICAL STAT ALERT'
                        : 'URGENT FINDING'}
                    </Text>
                  </View>
                  <Text style={styles.modalTitle} numberOfLines={1}>
                    {selectedFinding.order?.examinationName || 'Emergency Finding'}
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.modalCloseButton}
                  onPress={() => setSelectedFinding(null)}
                >
                  <Text style={styles.modalCloseText}>✕</Text>
                </TouchableOpacity>
              </View>

              <ScrollView
                style={styles.modalScroll}
                contentContainerStyle={styles.modalScrollContent}
              >
                {/* Patient Information Box */}
                <View style={styles.modalSectionBox}>
                  <Text style={styles.modalSectionTitle}>PATIENT DEMOGRAPHICS</Text>
                  <View style={styles.modalPatientRow}>
                    <Text style={styles.modalPatientName}>
                      {selectedFinding.order?.patientName}
                    </Text>
                    <Text style={styles.modalDemographicPill}>
                      {selectedFinding.order?.demographicsShort}
                    </Text>
                  </View>
                  <View style={styles.modalMetaGrid}>
                    <Text style={styles.modalMetaItem}>
                      MRN: <Text style={styles.modalMetaBold}>{selectedFinding.order?.patientId}</Text>
                    </Text>
                    <Text style={styles.modalMetaItem}>
                      ACC: <Text style={styles.modalMetaBold}>{selectedFinding.order?.accessionNumber}</Text>
                    </Text>
                    <Text style={styles.modalMetaItem}>
                      Location: <Text style={styles.modalMetaBold}>{selectedFinding.order?.location || 'Emergency'}</Text>
                    </Text>
                  </View>
                </View>

                {/* Critical Finding Highlight Box */}
                <View style={styles.modalFindingBox}>
                  <Text style={styles.modalFindingTitle}>LIFE-THREATENING FINDING</Text>
                  <Text style={styles.modalFindingText}>{selectedFinding.findingText}</Text>
                </View>

                {/* Communication Audit Trail */}
                <View style={styles.modalSectionBox}>
                  <Text style={styles.modalSectionTitle}>CLOSED-LOOP COMMUNICATION TRAIL</Text>

                  <View style={styles.auditRow}>
                    <Text style={styles.auditLabel}>Reported By:</Text>
                    <Text style={styles.auditValue}>
                      {selectedFinding.createdBy.name} ({formatTime(selectedFinding.sentAt)})
                    </Text>
                  </View>

                  <View style={styles.auditRow}>
                    <Text style={styles.auditLabel}>Responsible Clinician:</Text>
                    <Text style={styles.auditValue}>
                      {selectedFinding.recipient.name} ({selectedFinding.recipient.department || 'Staff'})
                    </Text>
                  </View>

                  <View style={styles.auditRow}>
                    <Text style={styles.auditLabel}>Status:</Text>
                    <View style={styles.statusRowBadge}>
                      <Text
                        style={[
                          styles.statusBadgeText,
                          selectedFinding.status === 'ACKNOWLEDGED'
                            ? styles.statusSuccess
                            : selectedFinding.status === 'ESCALATED'
                            ? styles.statusDanger
                            : styles.statusWarning,
                        ]}
                      >
                        ● {selectedFinding.status}
                        {selectedFinding.escalationLevel
                          ? ` (Level ${selectedFinding.escalationLevel})`
                          : ''}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.auditRow}>
                    <Text style={styles.auditLabel}>Verbal Read-Back:</Text>
                    <Text
                      style={[
                        styles.auditValue,
                        selectedFinding.readBackConfirmed
                          ? styles.statusSuccess
                          : styles.statusWarning,
                      ]}
                    >
                      {selectedFinding.readBackConfirmed
                        ? '✓ Confirmed & Logged'
                        : 'Pending Read-Back'}
                    </Text>
                  </View>

                  {selectedFinding.readBackNotes && (
                    <View style={styles.readBackNoteBox}>
                      <Text style={styles.readBackNoteLabel}>Read-Back Notes:</Text>
                      <Text style={styles.readBackNoteContent}>
                        {selectedFinding.readBackNotes}
                      </Text>
                    </View>
                  )}
                </View>
              </ScrollView>

              {/* Modal Actions Footer */}
              <View style={[styles.modalFooter, { paddingBottom: Math.max(insets.bottom, 16) }]}>
                <View style={styles.modalActionButtonsGrid}>
                  <TouchableOpacity
                    style={styles.modalStudyButton}
                    onPress={() => handleOpenStudy(selectedFinding.imagingOrderId)}
                  >
                    <Text style={styles.modalStudyButtonText}>
                      View Diagnostic Study & PACS
                    </Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.modalDemoActionRow}>
                  <TouchableOpacity
                    style={[
                      styles.modalAckButton,
                      selectedFinding.status === 'ACKNOWLEDGED' &&
                        styles.modalAckButtonDisabled,
                    ]}
                    disabled={selectedFinding.status === 'ACKNOWLEDGED'}
                    onPress={() => handleAcknowledgePress(selectedFinding)}
                  >
                    <Text style={styles.modalAckButtonText}>
                      {selectedFinding.status === 'ACKNOWLEDGED'
                        ? 'Finding Acknowledged'
                        : 'Confirm Verbal Read-Back & Acknowledge'}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.modalEscalateButton}
                    onPress={() => handleEscalatePress(selectedFinding)}
                  >
                    <Text style={styles.modalEscalateButtonText}>
                      Escalate Tier
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </View>
        )}
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 40,
  },
  sourceSelectorRow: {
    flexDirection: 'row',
    backgroundColor: '#E2E8F0',
    borderRadius: 12,
    padding: 3,
    marginBottom: 10,
    gap: 4,
  },
  sourceButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 9,
    borderRadius: 9,
    gap: 6,
  },
  sourceButtonActive: {
    backgroundColor: '#0F766E',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  sourceButtonActiveDemo: {
    backgroundColor: '#D97706',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  sourceButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
  },
  sourceButtonTextActive: {
    color: '#FFFFFF',
  },
  sourceButtonTextActiveDemo: {
    color: '#FFFFFF',
  },
  liveStatusDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  demoIcon: {
    fontSize: 12,
  },
  demoNoticeBanner: {
    backgroundColor: '#FFFBEB',
    borderColor: '#FDE68A',
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    marginBottom: 12,
  },
  demoNoticeTag: {
    fontSize: 10,
    fontWeight: '800',
    color: '#B45309',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  demoNoticeText: {
    fontSize: 11,
    color: '#92400E',
    lineHeight: 15,
  },
  microKpiGrid: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 12,
    width: '100%',
  },
  kpiBox: {
    flex: 1,
    minWidth: 0,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  kpiLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: '#64748B',
    textTransform: 'uppercase',
  },
  kpiValueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginTop: 4,
    gap: 2,
    flexWrap: 'wrap',
  },
  kpiValue: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
    fontFamily: 'SpaceMono',
  },
  kpiValueDanger: {
    color: '#DC2626',
  },
  kpiValueWarning: {
    color: '#D97706',
  },
  kpiValueSuccess: {
    color: '#059669',
  },
  kpiUnitSmall: {
    fontSize: 9,
    color: '#64748B',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 8,
  },
  searchIcon: {
    fontSize: 14,
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: '#0F172A',
    paddingVertical: 0,
  },
  clearSearchText: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
    marginLeft: 6,
  },
  filterRow: {
    flexDirection: 'row',
    paddingVertical: 6,
    marginBottom: 8,
  },
  loadingContainer: {
    paddingVertical: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 13,
    color: '#64748B',
    fontWeight: '600',
  },
  errorContainer: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginVertical: 12,
  },
  errorIcon: {
    fontSize: 28,
    marginBottom: 6,
  },
  errorTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#991B1B',
    marginBottom: 4,
  },
  errorDescription: {
    fontSize: 12,
    color: '#7F1D1D',
    textAlign: 'center',
    marginBottom: 12,
  },
  retryButton: {
    backgroundColor: '#DC2626',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  emptyContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginVertical: 16,
  },
  emptyShieldBox: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#F0FDF4',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  emptyShieldText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F766E',
    letterSpacing: 0.5,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
    maxWidth: 280,
    marginBottom: 16,
  },
  emptyActionsRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  emptyRefreshButton: {
    backgroundColor: '#0F766E',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  emptyRefreshButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  emptySwitchDemoButton: {
    backgroundColor: '#FEF3C7',
    borderColor: '#FDE68A',
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  emptySwitchDemoButtonText: {
    color: '#92400E',
    fontSize: 12,
    fontWeight: '700',
  },
  alertsList: {
    marginTop: 4,
  },
  auditNotice: {
    backgroundColor: '#F1F5F9',
    borderRadius: 10,
    padding: 12,
    alignItems: 'center',
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  auditNoticeText: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
    textAlign: 'center',
  },
  // MODAL STYLES
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
    paddingBottom: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  modalHeaderTitleBlock: {
    flex: 1,
    marginRight: 10,
  },
  modalSeverityPill: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    marginBottom: 4,
  },
  modalSeverityPillCritical: {
    backgroundColor: '#FEE2E2',
  },
  modalSeverityPillWarning: {
    backgroundColor: '#FEF3C7',
  },
  modalSeverityText: {
    fontSize: 10,
    fontWeight: '800',
  },
  modalSeverityTextCritical: {
    color: '#991B1B',
  },
  modalSeverityTextWarning: {
    color: '#92400E',
  },
  modalTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  modalCloseButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCloseText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#64748B',
  },
  modalScroll: {
    paddingHorizontal: 18,
  },
  modalScrollContent: {
    paddingVertical: 14,
    gap: 12,
  },
  modalDemoWarning: {
    backgroundColor: '#FFFBEB',
    borderColor: '#FDE68A',
    borderWidth: 1,
    borderRadius: 8,
    padding: 8,
  },
  modalDemoWarningTag: {
    fontSize: 9,
    fontWeight: '800',
    color: '#B45309',
    marginBottom: 2,
  },
  modalDemoWarningText: {
    fontSize: 11,
    color: '#92400E',
    lineHeight: 14,
  },
  modalSectionBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  modalSectionTitle: {
    fontSize: 10,
    fontWeight: '800',
    color: '#64748B',
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  modalPatientRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  modalPatientName: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
  modalDemographicPill: {
    fontSize: 11,
    color: '#475569',
    backgroundColor: '#E2E8F0',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    fontWeight: '600',
  },
  modalMetaGrid: {
    flexDirection: 'row',
    gap: 12,
    flexWrap: 'wrap',
  },
  modalMetaItem: {
    fontSize: 11,
    color: '#64748B',
  },
  modalMetaBold: {
    color: '#0F172A',
    fontWeight: '700',
    fontFamily: 'SpaceMono',
  },
  modalFindingBox: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
  },
  modalFindingTitle: {
    fontSize: 10,
    fontWeight: '800',
    color: '#991B1B',
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  modalFindingText: {
    fontSize: 13,
    color: '#7F1D1D',
    lineHeight: 18,
    fontWeight: '500',
  },
  auditRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  auditLabel: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
  },
  auditValue: {
    fontSize: 11,
    color: '#0F172A',
    fontWeight: '700',
  },
  statusRowBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '800',
  },
  statusSuccess: {
    color: '#059669',
  },
  statusWarning: {
    color: '#D97706',
  },
  statusDanger: {
    color: '#DC2626',
  },
  readBackNoteBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 8,
    marginTop: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  readBackNoteLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: '#64748B',
    marginBottom: 2,
  },
  readBackNoteContent: {
    fontSize: 11,
    color: '#334155',
    fontStyle: 'italic',
  },
  modalFooter: {
    paddingHorizontal: 18,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    gap: 8,
  },
  modalActionButtonsGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  modalStudyButton: {
    flex: 1,
    backgroundColor: '#0F766E',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  modalStudyButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  modalCallButton: {
    flex: 1,
    backgroundColor: '#0284C7',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  modalCallButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  modalDemoActionRow: {
    flexDirection: 'row',
    gap: 8,
  },
  modalAckButton: {
    flex: 2,
    backgroundColor: '#10B981',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  modalAckButtonDisabled: {
    backgroundColor: '#94A3B8',
  },
  modalAckButtonText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  modalEscalateButton: {
    flex: 1,
    backgroundColor: '#DC2626',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  modalEscalateButtonText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
});
