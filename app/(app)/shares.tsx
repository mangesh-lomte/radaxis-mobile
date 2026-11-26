import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useExternalShares } from '@/src/hooks/useOperations';
import { operationsService } from '@/src/services/operationsService';
import { ExternalShareItem } from '@/src/types/operations';
import { ModuleIcon } from '@/src/components/ui/ModuleIcon';

export default function ExternalSharesScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [selectedShare, setSelectedShare] = useState<ExternalShareItem | null>(null);

  const {
    data: shares = [],
    isLoading,
    isError,
    refetch,
    isRefetching,
  } = useExternalShares();

  const activeCount = shares.filter((s) => s.status === 'ACTIVE').length;
  const otpCount = shares.filter((s) => s.requiresOtp).length;
  const totalViews = shares.reduce((sum, s) => sum + (s.viewCount || 0), 0);

  const formatDate = (isoString?: string | null) => {
    if (!isoString) return 'N/A';
    try {
      return new Date(isoString).toLocaleDateString();
    } catch {
      return isoString;
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {/* Top Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Text style={styles.backText}>‹</Text>
        </TouchableOpacity>
        <View style={styles.headerTitleBlock}>
          <View style={styles.headerTitleRow}>
            <ModuleIcon name="shares" size={16} containerSize={28} style={{ marginRight: 6 }} />
            <Text style={styles.headerTitle}>External Study Shares</Text>
          </View>
          <Text style={styles.headerSubtitle}>
            Outside doctor referrals, secure links & consent records
          </Text>
        </View>
      </View>

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
        {/* Micro-KPI Grid */}
        <View style={styles.kpiGrid}>
          <View style={styles.kpiCard}>
            <Text style={styles.kpiLabel}>Total Shares</Text>
            <Text style={styles.kpiValue}>{shares.length}</Text>
          </View>
          <View style={styles.kpiCard}>
            <Text style={styles.kpiLabel}>Active Links</Text>
            <Text style={[styles.kpiValue, styles.kpiSuccess]}>{activeCount}</Text>
          </View>
          <View style={styles.kpiCard}>
            <Text style={styles.kpiLabel}>OTP Protected</Text>
            <Text style={[styles.kpiValue, styles.kpiInfo]}>{otpCount}</Text>
          </View>
          <View style={styles.kpiCard}>
            <Text style={styles.kpiLabel}>Total Views</Text>
            <Text style={styles.kpiValue}>{totalViews}</Text>
          </View>
        </View>

        {/* Loading State */}
        {isLoading && (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color="#0F766E" />
            <Text style={styles.loadingText}>Fetching external study shares...</Text>
          </View>
        )}

        {/* Error State */}
        {isError && !isLoading && (
          <View style={styles.errorBox}>
            <Text style={styles.errorTitle}>Error Loading External Shares</Text>
            <Text style={styles.errorText}>Could not retrieve shares from server.</Text>
            <TouchableOpacity style={styles.retryBtn} onPress={() => refetch()}>
              <Text style={styles.retryBtnText}>Retry</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Empty State */}
        {!isLoading && !isError && shares.length === 0 && (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyTitle}>No External Shares</Text>
            <Text style={styles.emptySubtitle}>
              No diagnostic studies have been shared with outside healthcare institutions.
            </Text>
          </View>
        )}

        {/* Shares List */}
        {!isLoading &&
          shares.map((share) => {
            const isActive = share.status === 'ACTIVE';
            return (
              <TouchableOpacity
                key={share.id}
                style={styles.shareCard}
                onPress={() => setSelectedShare(share)}
                activeOpacity={0.7}
              >
                <View style={styles.shareCardHeader}>
                  <View style={styles.shareNumberBadge}>
                    <Text style={styles.shareNumberText}>{share.shareNumber}</Text>
                  </View>
                  <View
                    style={[
                      styles.statusPill,
                      isActive ? styles.statusPillActive : styles.statusPillInactive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusText,
                        isActive ? styles.statusTextActive : styles.statusTextInactive,
                      ]}
                    >
                      ● {share.status}
                    </Text>
                  </View>
                </View>

                <Text style={styles.recipientName}>{share.recipientName}</Text>
                {share.institutionName && (
                  <Text style={styles.institutionText}>{share.institutionName}</Text>
                )}

                <View style={styles.studyBox}>
                  <View style={styles.modalityBadge}>
                    <Text style={styles.modalityText}>
                      {share.order?.modality || 'STUDY'}
                    </Text>
                  </View>
                  <View style={styles.studyTextContainer}>
                    <Text style={styles.examName} numberOfLines={1}>
                      {share.order?.examinationName || 'Radiology Examination'}
                    </Text>
                    <Text style={styles.patientMeta}>
                      {share.patient
                        ? `${share.patient.lastName}, ${share.patient.firstName}`
                        : 'Patient'}{' '}
                      • MRN: {share.patientMrn}
                    </Text>
                  </View>
                </View>

                {/* Badges Row */}
                <View style={styles.badgesRow}>
                  {share.includeReportPdf && (
                    <View style={styles.featureBadge}>
                      <Text style={styles.featureBadgeText}>Report PDF</Text>
                    </View>
                  )}
                  {share.includeDicom && (
                    <View style={styles.featureBadge}>
                      <Text style={styles.featureBadgeText}>DICOM</Text>
                    </View>
                  )}
                  {share.includeWebViewer && (
                    <View style={styles.featureBadge}>
                      <Text style={styles.featureBadgeText}>Web OHIF</Text>
                    </View>
                  )}
                  {share.requiresOtp && (
                    <View style={styles.otpBadge}>
                      <Text style={styles.otpBadgeText}>OTP Protected</Text>
                    </View>
                  )}
                </View>

                <View style={styles.footerRow}>
                  <Text style={styles.footerDate}>
                    Expires: {formatDate(share.expiresAt)}
                  </Text>
                  <Text style={styles.footerViews}>
                    {share.viewCount || 0} views
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
      </ScrollView>

      {/* SHARE DETAIL MODAL */}
      <Modal
        visible={!!selectedShare}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setSelectedShare(null)}
      >
        {selectedShare && (
          <View style={styles.modalOverlay}>
            <View style={styles.modalCard}>
              <View style={styles.modalHeader}>
                <View style={styles.modalHeaderTitleBlock}>
                  <Text style={styles.modalShareNum}>{selectedShare.shareNumber}</Text>
                  <Text style={styles.modalTitle}>External Share Record</Text>
                </View>
                <TouchableOpacity
                  style={styles.modalCloseBtn}
                  onPress={() => setSelectedShare(null)}
                >
                  <Text style={styles.modalCloseText}>✕</Text>
                </TouchableOpacity>
              </View>

              <ScrollView contentContainerStyle={styles.modalScroll}>
                <View style={styles.modalSection}>
                  <Text style={styles.modalSectionTitle}>RECIPIENT & INSTITUTION</Text>
                  <View style={styles.modalRow}>
                    <Text style={styles.modalLabel}>Recipient Name:</Text>
                    <Text style={styles.modalValue}>{selectedShare.recipientName}</Text>
                  </View>
                  <View style={styles.modalRow}>
                    <Text style={styles.modalLabel}>Institution:</Text>
                    <Text style={styles.modalValue}>
                      {selectedShare.institutionName || 'Outside Facility'}
                    </Text>
                  </View>
                  <View style={styles.modalRow}>
                    <Text style={styles.modalLabel}>Email / Phone:</Text>
                    <Text style={styles.modalValue}>
                      {selectedShare.recipientEmail || selectedShare.recipientPhone || 'N/A'}
                    </Text>
                  </View>
                </View>

                <View style={styles.modalSection}>
                  <Text style={styles.modalSectionTitle}>EXAMINATION & PATIENT</Text>
                  <View style={styles.modalRow}>
                    <Text style={styles.modalLabel}>Patient:</Text>
                    <Text style={styles.modalValue}>
                      {selectedShare.patient
                        ? `${selectedShare.patient.lastName}, ${selectedShare.patient.firstName}`
                        : 'Patient'}
                    </Text>
                  </View>
                  <View style={styles.modalRow}>
                    <Text style={styles.modalLabel}>Patient MRN:</Text>
                    <Text style={[styles.modalValue, styles.mono]}>
                      {selectedShare.patientMrn}
                    </Text>
                  </View>
                  <View style={styles.modalRow}>
                    <Text style={styles.modalLabel}>Accession Number:</Text>
                    <Text style={[styles.modalValue, styles.mono]}>
                      {selectedShare.accessionNumber}
                    </Text>
                  </View>
                  <View style={[styles.modalRow, styles.modalRowStacked]}>
                    <Text style={styles.modalLabel}>Exam:</Text>
                    <Text style={[styles.modalValue, styles.modalValueWrap]}>
                      {selectedShare.order?.examinationName}
                    </Text>
                  </View>
                </View>

                {selectedShare.consent && (
                  <View style={styles.modalSection}>
                    <Text style={styles.modalSectionTitle}>PATIENT CONSENT RECORD</Text>
                    <View style={styles.modalRow}>
                      <Text style={styles.modalLabel}>Consented By:</Text>
                      <Text style={styles.modalValue}>
                        {selectedShare.consent.consentedBy} ({selectedShare.consent.consentedByRelation})
                      </Text>
                    </View>
                    <View style={styles.modalRow}>
                      <Text style={styles.modalLabel}>Purpose:</Text>
                      <Text style={styles.modalValue}>{selectedShare.consent.purpose}</Text>
                    </View>
                    <View style={styles.modalRow}>
                      <Text style={styles.modalLabel}>Method:</Text>
                      <Text style={styles.modalValue}>
                        {selectedShare.consent.consentMethod}
                      </Text>
                    </View>
                    {selectedShare.consent.notes && (
                      <View style={styles.notesBox}>
                        <Text style={styles.notesText}>{selectedShare.consent.notes}</Text>
                      </View>
                    )}
                  </View>
                )}

                <View style={styles.modalSection}>
                  <Text style={styles.modalSectionTitle}>SECURITY & AUDIT</Text>
                  <View style={styles.modalRow}>
                    <Text style={styles.modalLabel}>Status:</Text>
                    <Text style={styles.modalValue}>{selectedShare.status}</Text>
                  </View>
                  <View style={styles.modalRow}>
                    <Text style={styles.modalLabel}>Requires 6-Digit OTP:</Text>
                    <Text style={styles.modalValue}>
                      {selectedShare.requiresOtp ? 'Yes (Verified)' : 'No'}
                    </Text>
                  </View>
                  <View style={styles.modalRow}>
                    <Text style={styles.modalLabel}>Expiration Date:</Text>
                    <Text style={styles.modalValue}>
                      {formatDate(selectedShare.expiresAt)}
                    </Text>
                  </View>
                  <View style={styles.modalRow}>
                    <Text style={styles.modalLabel}>Access Count:</Text>
                    <Text style={styles.modalValue}>
                      {selectedShare.viewCount || 0} external opens
                    </Text>
                  </View>
                </View>
              </ScrollView>

              <View style={[styles.modalFooter, { paddingBottom: Math.max(insets.bottom, 16) }]}>
                {selectedShare.status === 'ACTIVE' && (
                  <TouchableOpacity
                    style={[styles.modalDismissBtn, { backgroundColor: '#FEF2F2', borderColor: '#FECACA', borderWidth: 1, marginBottom: 8 }]}
                    onPress={async () => {
                      try {
                        const res = await operationsService.revokeExternalShare(selectedShare.id);
                        Alert.alert(
                          res.isLocalDemonstration ? 'Preview Only' : 'Share Revoked',
                          res.isLocalDemonstration
                            ? 'Preview only — no changes saved.'
                            : (res.message || 'External access link revoked successfully.')
                        );
                        setSelectedShare((prev) => (prev ? { ...prev, status: 'REVOKED' } : null));
                      } catch (err: any) {
                        Alert.alert('Error', err?.message || 'Could not revoke share.');
                      }
                    }}
                  >
                    <Text style={[styles.modalDismissText, { color: '#DC2626' }]}>Revoke Access Link</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  style={styles.modalDismissBtn}
                  onPress={() => setSelectedShare(null)}
                >
                  <Text style={styles.modalDismissText}>Close Share Details</Text>
                </TouchableOpacity>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  backText: {
    fontSize: 24,
    color: '#0F172A',
    lineHeight: 26,
  },
  headerTitleBlock: {
    flex: 1,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  headerSubtitle: {
    fontSize: 11,
    color: '#64748B',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  kpiGrid: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  kpiCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  kpiLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: '#64748B',
    textTransform: 'uppercase',
  },
  kpiValue: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
    fontFamily: 'SpaceMono',
    marginTop: 4,
  },
  kpiSuccess: {
    color: '#059669',
  },
  kpiInfo: {
    color: '#0284C7',
  },
  loadingBox: {
    paddingVertical: 32,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 8,
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
    marginVertical: 12,
  },
  errorTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#991B1B',
    marginBottom: 4,
  },
  errorText: {
    fontSize: 11,
    color: '#7F1D1D',
    marginBottom: 8,
  },
  retryBtn: {
    backgroundColor: '#DC2626',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  retryBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  emptyBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginVertical: 12,
  },

  emptyTitle: {
  fontSize: 14,
  fontWeight: '800',
  color: '#0F172A',
  marginBottom: 4,
},
  emptySubtitle: {
  fontSize: 11,
  color: '#64748B',
  textAlign: 'center',
},
  shareCard: {
  backgroundColor: '#FFFFFF',
  borderRadius: 12,
  padding: 14,
  marginBottom: 10,
  borderWidth: 1,
  borderColor: '#E2E8F0',
},
  shareCardHeader: {
  flexDirection: 'row',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: 6,
},
  shareNumberBadge: {
  backgroundColor: '#F1F5F9',
  paddingHorizontal: 8,
  paddingVertical: 3,
  borderRadius: 4,
},
  shareNumberText: {
  fontSize: 11,
  fontWeight: '800',
  color: '#0F766E',
  fontFamily: 'SpaceMono',
},
  statusPill: {
  paddingHorizontal: 8,
  paddingVertical: 2,
  borderRadius: 999,
},
  statusPillActive: {
  backgroundColor: '#F0FDF4',
},
  statusPillInactive: {
  backgroundColor: '#FEF2F2',
},
  statusText: {
  fontSize: 10,
  fontWeight: '700',
},
  statusTextActive: {
  color: '#166534',
},
  statusTextInactive: {
  color: '#991B1B',
},
  recipientName: {
  fontSize: 14,
  fontWeight: '800',
  color: '#0F172A',
  marginBottom: 2,
},
  institutionText: {
  fontSize: 11,
  color: '#475569',
  marginBottom: 8,
},
  studyBox: {
  flexDirection: 'row',
  alignItems: 'center',
  backgroundColor: '#F8FAFC',
  borderRadius: 8,
  padding: 8,
  marginBottom: 8,
  gap: 8,
},
  modalityBadge: {
  backgroundColor: '#0F766E',
  paddingHorizontal: 6,
  paddingVertical: 3,
  borderRadius: 4,
},
  modalityText: {
  fontSize: 9,
  fontWeight: '800',
  color: '#FFFFFF',
},
  studyTextContainer: {
  flex: 1,
},
  examName: {
  fontSize: 12,
  fontWeight: '700',
  color: '#0F172A',
},
  patientMeta: {
  fontSize: 10,
  color: '#64748B',
},
  badgesRow: {
  flexDirection: 'row',
  gap: 6,
  flexWrap: 'wrap',
  marginBottom: 8,
},
  featureBadge: {
  backgroundColor: '#EFF6FF',
  paddingHorizontal: 6,
  paddingVertical: 2,
  borderRadius: 4,
},
  featureBadgeText: {
  fontSize: 9,
  fontWeight: '600',
  color: '#1D4ED8',
},
  otpBadge: {
  backgroundColor: '#FDF4FF',
  paddingHorizontal: 6,
  paddingVertical: 2,
  borderRadius: 4,
},
  otpBadgeText: {
  fontSize: 9,
  fontWeight: '600',
  color: '#A21CAF',
},
  footerRow: {
  flexDirection: 'row',
  justifyContent: 'space-between',
  paddingTop: 4,
  borderTopWidth: 1,
  borderTopColor: '#F1F5F9',
},
  footerDate: {
  fontSize: 10,
  color: '#94A3B8',
},
  footerViews: {
  fontSize: 10,
  color: '#64748B',
  fontWeight: '600',
},
  modalOverlay: {
  flex: 1,
  backgroundColor: 'rgba(15, 23, 42, 0.6)',
  justifyContent: 'flex-end',
},
  modalCard: {
  backgroundColor: '#FFFFFF',
  borderTopLeftRadius: 18,
  borderTopRightRadius: 18,
  maxHeight: '85%',
},
  modalHeader: {
  flexDirection: 'row',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: 16,
  borderBottomWidth: 1,
  borderBottomColor: '#E2E8F0',
},
  modalHeaderTitleBlock: {
  flex: 1,
  marginRight: 10,
},
  modalShareNum: {
  fontSize: 11,
  fontWeight: '800',
  color: '#0F766E',
  fontFamily: 'SpaceMono',
},
  modalTitle: {
  fontSize: 14,
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
  fontSize: 13,
  fontWeight: '700',
  color: '#64748B',
},
  modalScroll: {
  padding: 16,
  gap: 14,
},
  modalSection: {
  backgroundColor: '#F8FAFC',
  borderRadius: 10,
  padding: 12,
  borderWidth: 1,
  borderColor: '#E2E8F0',
  gap: 8,
},
  modalSectionTitle: {
  fontSize: 9,
  fontWeight: '800',
  color: '#64748B',
  letterSpacing: 0.5,
  marginBottom: 2,
},
  modalRow: {
  flexDirection: 'row',
  justifyContent: 'space-between',
  alignItems: 'center',
  minWidth: 0,
  flexWrap: 'wrap',
  gap: 4,
},
  modalRowStacked: {
  flexDirection: 'column',
  alignItems: 'flex-start',
  gap: 4,
},
  modalLabel: {
  fontSize: 11,
  color: '#64748B',
},
  modalValue: {
  fontSize: 12,
  fontWeight: '700',
  color: '#0F172A',
  flexShrink: 1,
},
  modalValueWrap: {
  flexShrink: 1,
  textAlign: 'left',
},
  mono: {
  fontFamily: 'SpaceMono',
},
  notesBox: {
  backgroundColor: '#FFFFFF',
  borderRadius: 6,
  padding: 8,
  borderWidth: 1,
  borderColor: '#E2E8F0',
},
  notesText: {
  fontSize: 11,
  color: '#475569',
  fontStyle: 'italic',
},
  modalFooter: {
  paddingHorizontal: 16,
  paddingTop: 8,
},
  modalDismissBtn: {
  backgroundColor: '#0F766E',
  borderRadius: 8,
  paddingVertical: 10,
  alignItems: 'center',
},
  modalDismissText: {
  color: '#FFFFFF',
  fontSize: 12,
  fontWeight: '700',
},
});
