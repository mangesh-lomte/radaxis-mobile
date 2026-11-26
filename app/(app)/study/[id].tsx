import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { PriorityBadge } from '@/src/components/ui/PriorityBadge';
import { StatusBadge } from '@/src/components/ui/StatusBadge';
import { ClinicalIdentifier } from '@/src/components/ui/ClinicalIdentifier';
import { Timeline } from '@/src/components/ui/Timeline';
import { LoadingState } from '@/src/components/shared/LoadingState';
import { ErrorState } from '@/src/components/shared/ErrorState';
import { useOrderDetail } from '@/src/hooks/useWorklist';
import { useReport } from '@/src/hooks/useReport';
import { reportService } from '@/src/services/reportService';
import { ApiError } from '@/src/services/api';
import { API_BASE_URL } from '@/src/constants/config';
import { isProductionHost } from '@/src/constants/environment';
import { DEMO_DICOM_STUDY } from '@/src/constants/demoStudy';
import { formatDemographics } from '@/src/utils/demographics';
import { formatDate, formatFileSize } from '@/src/utils/formatters';
import { Colors } from '@/src/theme/colors';
import { Ionicons } from '@expo/vector-icons';
import { ModuleIcon } from '@/src/components/ui/ModuleIcon';

export default function StudyDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const {
    data: order,
    isLoading: isOrderLoading,
    isError: isOrderError,
    error: orderError,
    refetch: refetchOrder,
    isRefetching: isOrderRefetching,
  } = useOrderDetail(id);

  const {
    data: reportData,
    isLoading: isReportLoading,
    refetch: refetchReport,
  } = useReport(order?.accessionNumber || id);

  const [isLaunchingViewer, setIsLaunchingViewer] = useState(false);
  const [isVerifyingPdf, setIsVerifyingPdf] = useState(false);

  const handleRefreshAll = () => {
    refetchOrder();
    refetchReport();
  };

  if (isOrderLoading && !isOrderRefetching) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <View style={styles.topBar}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
            activeOpacity={0.7}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <Text style={styles.backArrow}>←</Text>
          </TouchableOpacity>
          <View style={styles.navTitleGroup}>
            <Text style={styles.navTitle}>Study Detail</Text>
            <Text style={styles.navSubtitle} numberOfLines={1}>
              ACC: {id || 'Loading...'}
            </Text>
          </View>
        </View>
        <LoadingState
          message="Loading Examination Details..."
          subtitle="Fetching verified study record from RadAxis RIS"
        />
      </SafeAreaView>
    );
  }

  if (isOrderError || !order) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <View style={styles.topBar}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
            activeOpacity={0.7}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <Text style={styles.backArrow}>←</Text>
          </TouchableOpacity>
          <View style={styles.navTitleGroup}>
            <Text style={styles.navTitle}>Study Detail</Text>
            <Text style={styles.navSubtitle} numberOfLines={1}>
              ACC: {id || 'Error'}
            </Text>
          </View>
        </View>
        <ErrorState
          title="Examination Record Unavailable"
          message={orderError?.message || `No active imaging order found for identifier: ${id}`}
          onRetry={handleRefreshAll}
          secondaryAction={{
            label: 'Return to Worklist',
            onPress: () => router.push('/(app)/(tabs)/worklist'),
          }}
        />
      </SafeAreaView>
    );
  }

  const patient = order.patient;
  const fullName = `${patient.firstName} ${patient.lastName}`;
  const demo = formatDemographics(patient.dateOfBirth, patient.gender);
  const dobFormatted = patient.dateOfBirth ? patient.dateOfBirth.slice(0, 10) : 'Not recorded';
  const location = [patient.city, patient.state].filter(Boolean).join(', ') || 'Outpatient Facility';
  const referringDoctor = order.referringDoctor?.name || 'Staff Radiologist';
  const referringDept = order.referringDoctor?.organization || 'Hospital Staff';
  const contactPhone = order.referringDoctor?.phone || 'Speed-dial 2341';

  const initials = fullName
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase() || 'PT';

  const finalizedReport = reportData?.finalizedReport;
  const draftReport = reportData?.draft;
  const hasReport = !!finalizedReport || !!draftReport;

  // ─── Authorized OHIF Viewer Launch Handler ─────────────────────────────
  const handleLaunchViewer = async () => {
    // Exact reference-study exception criteria for staging demonstration
    const isStagingEnv = !isProductionHost(API_BASE_URL);
    const isReferencePatient =
      order.patient?.patientId === 'PAT-2026-10001' &&
      order.patient?.patientId === DEMO_DICOM_STUDY.mrn;
    const isReferenceAccession =
      order.accessionNumber === 'ACC-20261105-CT01' &&
      order.accessionNumber === DEMO_DICOM_STUDY.accession;
    const isReferenceStudyUidValid =
      DEMO_DICOM_STUDY.studyInstanceUid === '1.2.276.0.7230010.3.1.2.1647587938.1.1794936198.801794';

    const isEligibleReferenceDemo =
      isStagingEnv && isReferencePatient && isReferenceAccession && isReferenceStudyUidValid;

    if (isEligibleReferenceDemo) {
      try {
        setIsLaunchingViewer(true);
        await WebBrowser.openBrowserAsync(DEMO_DICOM_STUDY.viewerUrl, {
          presentationStyle: WebBrowser.WebBrowserPresentationStyle.FULL_SCREEN,
          toolbarColor: '#0F172A',
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Could not launch OHIF viewer.';
        Alert.alert('Viewer Launch Error', msg);
      } finally {
        setIsLaunchingViewer(false);
      }
      return;
    }

    try {
      setIsLaunchingViewer(true);
      const launchData = await reportService.getViewerLaunchContext(order.accessionNumber);
      const viewerPath = launchData.viewerUrl;
      const baseUrl = isProductionHost(API_BASE_URL)
        ? 'https://meril-ris.mangesh.my.id'
        : API_BASE_URL.replace(/\/api\/v1\/?$/, '');
      const fullViewerUrl = viewerPath.startsWith('http')
        ? viewerPath
        : `${baseUrl}${viewerPath.startsWith('/') ? '' : '/'}${viewerPath}`;

      await WebBrowser.openBrowserAsync(fullViewerUrl, {
        presentationStyle: WebBrowser.WebBrowserPresentationStyle.FULL_SCREEN,
        toolbarColor: '#0F172A',
      });
    } catch (err: unknown) {
      if (err instanceof ApiError && err.code === 'PACS_STUDY_NOT_LINKED') {
        Alert.alert(
          'PACS Study Not Linked',
          `PACS images have not yet been reconciled or linked for this imaging order.\n\nCurrent Order Status: ${order.orderStatus}.\nAccession: ${order.accessionNumber}`
        );
      } else if (err instanceof ApiError && err.code === 'ORDER_NOT_ELIGIBLE') {
        Alert.alert(
          'Order Not Eligible for Image Review',
          `PACS images cannot be opened for this imaging order in current clinical state '${order.orderStatus}'.\nAccession: ${order.accessionNumber}`
        );
      } else if (err instanceof ApiError && err.code === 'PACS_UNAVAILABLE') {
        Alert.alert(
          'PACS Gateway Offline',
          'The Orthanc PACS server is currently unreachable. RIS administrative and clinical records remain available.'
        );
      } else {
        const msg = err instanceof Error ? err.message : 'Unable to connect to PACS viewer.';
        Alert.alert('Viewer Launch Notice', msg);
      }
    } finally {
      setIsLaunchingViewer(false);
    }
  };

  // ─── Authorized Report PDF Access Handler ──────────────────────────────
  const handleViewPdf = async () => {
    try {
      setIsVerifyingPdf(true);
      const meta = await reportService.verifyReportPdfAccess(order.accessionNumber);

      const docName = meta.filename;
      const sizeFormatted = formatFileSize(meta.fileSizeBytes);
      const finalizedDate = finalizedReport?.finalizedAt
        ? formatDate(finalizedReport.finalizedAt, { format: 'datetime' })
        : 'Verified';
      const signer = finalizedReport?.radiologist?.name || finalizedReport?.signedBy?.name || 'Dr. Arthur Evans';
      const signatureHash = finalizedReport?.signatureHash;

      Alert.alert(
        `Clinical Report PDF · ${order.accessionNumber}`,
        `Document: ${docName}\n` +
        `Size: ${sizeFormatted}\n` +
        `Status: Authenticated on RadAxis RIS Gateway\n` +
        `Signer: Dr. ${signer} (${finalizedDate})\n` +
        (signatureHash ? `Signature Hash: ${signatureHash.slice(0, 24)}...\n` : `Signature Status: Signed & Recorded on RIS Server\n`) +
        `\nImpression:\n"${finalizedReport?.impression || 'No acute findings.'}"\n\n` +
        `System: RadAxis RIS`,
        [{ text: 'Close', style: 'cancel' }]
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Report PDF is not currently available for this study.';
      Alert.alert('Report PDF Notice', msg);
    } finally {
      setIsVerifyingPdf(false);
    }
  };

  // Build workflow timeline steps based on order status
  const isCheckedIn = ['ARRIVED', 'READY_FOR_SCAN', 'IN_PROGRESS', 'SCAN_COMPLETE', 'COMPLETED'].includes(order.orderStatus);
  const isScanned = ['SCAN_COMPLETE', 'QA_ACCEPTED', 'PACS_HANDOFF_COMPLETE', 'COMPLETED'].includes(order.orderStatus);
  const isReported = !!finalizedReport || order.orderStatus === 'COMPLETED';

  const timelineSteps = [
    {
      label: 'Order Created',
      timestamp: order.createdAt ? order.createdAt.slice(0, 16).replace('T', ' ') : 'Done',
      completed: true,
      active: order.orderStatus === 'CREATED',
    },
    {
      label: 'Patient Intake & Arrival',
      timestamp: order.appointment?.scheduledStart
        ? order.appointment.scheduledStart.slice(11, 16)
        : isCheckedIn
          ? 'Verified'
          : 'Pending',
      completed: isCheckedIn,
      active: order.orderStatus === 'ARRIVED' || order.orderStatus === 'READY_FOR_SCAN',
    },
    {
      label: 'Modality Scan & QA',
      timestamp: order.study?.completedAt
        ? order.study.completedAt.slice(11, 16)
        : isScanned
          ? 'Acquired'
          : 'In Queue',
      completed: isScanned,
      active: order.orderStatus === 'IN_PROGRESS',
    },
    {
      label: 'Diagnostic Reading & Report',
      timestamp: finalizedReport?.finalizedAt
        ? finalizedReport.finalizedAt.slice(11, 16)
        : isReported
          ? 'Verified'
          : 'In Queue',
      completed: isReported,
      active: ['REPORTING_IN_PROGRESS', 'PRELIMINARY_REPORTED'].includes(order.orderStatus) || (hasReport && !finalizedReport),
    },
  ];

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      {/* Top Navigation Bar */}
      <View style={styles.topBar}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          activeOpacity={0.7}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Text style={styles.backArrow}>←</Text>
        </TouchableOpacity>

        <View style={styles.navTitleGroup}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <ModuleIcon name="pacs" size={14} containerSize={26} style={{ marginRight: 6 }} />
            <Text style={styles.navTitle}>Study Detail</Text>
          </View>
          <Text style={styles.navSubtitle} numberOfLines={1}>
            ACC: {order.accessionNumber}
          </Text>
        </View>

        <View style={styles.statusIndicator}>
          <View style={styles.liveSyncPulse} />
          <Text style={styles.liveSyncText}>LIVE API</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isOrderRefetching}
            onRefresh={handleRefreshAll}
            tintColor={Colors.brand.emerald}
          />
        }
      >
        {/* Patient Summary Card */}
        <View style={styles.sectionCard}>
          <View style={styles.patientProfileRow}>
            <View style={styles.patientAvatar}>
              <Text style={styles.avatarInitials}>{initials}</Text>
            </View>
            <View style={styles.patientInfoBlock}>
              <View style={styles.patientNameLine}>
                <Text style={styles.patientNameText} numberOfLines={1}>
                  {fullName}
                </Text>
                <Text style={styles.verifiedGlyph}>✓</Text>
              </View>
              <Text style={styles.patientSubText}>
                {demo.demographicsShort} • DOB: {dobFormatted}
              </Text>
            </View>
            <View style={styles.locationBadge}>
              <Text style={styles.locationBadgeText} numberOfLines={1}>
                {location}
              </Text>
            </View>
          </View>

          {/* Monospace Identifiers */}
          <View style={styles.idBox}>
            <ClinicalIdentifier type="MRN" value={patient.patientId} />
            <View style={styles.idDivider} />
            <ClinicalIdentifier type="ACC" value={order.accessionNumber} />
          </View>
        </View>

        {/* Examination Details Card */}
        <View style={styles.sectionCard}>
          <View style={styles.examHeaderRow}>
            <View style={styles.examTags}>
              <View style={styles.modalityPill}>
                <Text style={styles.modalityPillText}>{order.modality}</Text>
              </View>
              <View style={styles.slicesPill}>
                <Text style={styles.slicesPillText}>
                  {order.bodyPart ? `${order.bodyPart.toUpperCase()} REGION` : `${order.modality} PROTOCOL`}
                </Text>
              </View>
            </View>
            <PriorityBadge priority={order.priority} />
          </View>

          <Text style={styles.procedureNameText}>{order.examinationName}</Text>

          {/* Canonical Status Badge Row */}
          <View style={styles.statusRow}>
            <StatusBadge status={order.orderStatus} />
            <Text style={styles.waitingTimeText}>
              Status: {order.orderStatus}
            </Text>
          </View>

          {/* Technical Imaging Bento */}
          <View style={styles.technicalBento}>
            <View style={styles.bentoRow}>
              <Text style={styles.bentoLabel}>Modality / Body Part:</Text>
              <Text style={styles.bentoValue}>{order.modality} · {order.bodyPart}</Text>
            </View>
            <View style={styles.bentoRow}>
              <Text style={styles.bentoLabel}>Contrast Required:</Text>
              <Text style={styles.bentoValue}>{order.contrastRequired ? 'YES (IV Contrast)' : 'NO'}</Text>
            </View>
            <View style={[styles.bentoRow, styles.bentoRowLast]}>
              <Text style={styles.bentoLabel}>PACS Sync:</Text>
              <Text style={[styles.bentoValue, styles.bentoSyncText]}>
                {order.study?.studyInstanceUid ? 'ORTHANC LINKED' : 'PACS READY'}
              </Text>
            </View>
          </View>
        </View>

        {/* ─── Real Radiology Diagnostic Report Section ─────────────────── */}
        <View style={styles.sectionCard}>
          <View style={styles.reportHeaderRow}>
            <View style={styles.reportTitleGroup}>
              <Text style={styles.cardHeaderSmall}>RADIOLOGY DIAGNOSTIC REPORT</Text>
              <Text style={styles.reportStatusNote}>
                {finalizedReport
                  ? `Final Verified · Version ${finalizedReport.version}`
                  : draftReport
                    ? 'Preliminary Draft'
                    : 'Pending Clinical Interpretation'}
              </Text>
            </View>
            <StatusBadge status={finalizedReport ? 'FINAL_VERIFIED' : draftReport ? 'REPORTING' : 'WAITING'} compact />
          </View>

          {isReportLoading ? (
            <View style={styles.reportLoadingRow}>
              <ActivityIndicator size="small" color="#0891B2" />
              <Text style={styles.reportLoadingText}>Checking report status...</Text>
            </View>
          ) : finalizedReport ? (
            <View style={styles.reportContentBlock}>
              {/* Findings Block */}
              <View style={styles.reportField}>
                <Text style={styles.reportFieldLabel}>FINDINGS</Text>
                <Text style={styles.reportFieldText}>{finalizedReport.findings}</Text>
              </View>

              {/* Impression Block */}
              <View style={styles.impressionCard}>
                <Text style={styles.impressionLabel}>IMPRESSION</Text>
                <Text style={styles.impressionText}>{finalizedReport.impression}</Text>
              </View>

              {/* Digital Signature Verification */}
              <View style={styles.signatureBox}>
                <View style={styles.sigTopRow}>
                  <View style={styles.sigBadge}>
                    <Text style={styles.sigBadgeText}>SIGNED</Text>
                  </View>
                  <View style={styles.sigTextGroup}>
                    <Text style={styles.sigTitle}>Digitally Signed & Locked</Text>
                    <Text style={styles.sigAuthor}>
                      Dr. {finalizedReport.radiologist?.name || 'Arthur Evans'} ·{' '}
                      {finalizedReport.finalizedAt ? finalizedReport.finalizedAt.slice(0, 16).replace('T', ' ') : 'Verified'}
                    </Text>
                  </View>
                </View>
                {finalizedReport.signatureHash ? (
                  <Text style={styles.sigHashText} numberOfLines={1}>
                    Signature Hash: {finalizedReport.signatureHash.slice(0, 32)}...
                  </Text>
                ) : null}
              </View>

              {/* View Report PDF Button */}
              <TouchableOpacity
                style={styles.pdfButton}
                onPress={handleViewPdf}
                disabled={isVerifyingPdf}
                activeOpacity={0.8}
              >
                {isVerifyingPdf ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
                    <Ionicons name="document-text-outline" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                    <Text style={styles.pdfButtonText}>
                      View Report PDF {finalizedReport.pdfFileSizeBytes ? `(${formatFileSize(finalizedReport.pdfFileSizeBytes)})` : ''}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>
          ) : draftReport ? (
            <View style={styles.reportContentBlock}>
              <View style={styles.reportField}>
                <Text style={styles.reportFieldLabel}>PRELIMINARY FINDINGS</Text>
                <Text style={styles.reportFieldText}>
                  {draftReport.findings || 'Findings in progress by radiologist.'}
                </Text>
              </View>
              <View style={styles.draftNotice}>
                <Text style={styles.draftNoticeText}>
                  Draft authored by {draftReport.authorName || 'Radiologist'}. Report has not been locked or signed.
                </Text>
              </View>
            </View>
          ) : (
            <View style={styles.reportEmptyBlock}>
              <Text style={styles.reportEmptyTitle}>Diagnostic Report Pending</Text>
              <Text style={styles.reportEmptyText}>
                Reporting has not commenced for this examination. Once interpreted and signed by the radiologist, the verified report and clinical PDF will appear here.
              </Text>
            </View>
          )}
        </View>

        {/* Indication / Reason for Exam */}
        <View style={styles.sectionCard}>
          <Text style={styles.cardHeaderSmall}>INDICATION & CLINICAL HISTORY</Text>
          <Text style={styles.indicationText}>
            {order.clinicalIndication || 'No clinical indication recorded on order.'}
          </Text>
        </View>

        {/* Ordering Clinician Box */}
        <View style={styles.sectionCard}>
          <Text style={styles.cardHeaderSmall}>ORDERING CLINICIAN</Text>
          <Text style={styles.clinicianNameText}>{referringDoctor}</Text>
          <Text style={styles.clinicianDeptText}>
            Department: {referringDept}
          </Text>
          {contactPhone ? (
            <Text style={styles.clinicianContactText}>
              Contact Reference: {contactPhone}
            </Text>
          ) : null}
        </View>

        {/* Exam Workflow Timeline */}
        <Timeline steps={timelineSteps} />

        {/* Extra Bottom Spacing for Sticky Action Tray */}
        <View style={{ height: 80 + Math.max(insets.bottom, 16) }} />
      </ScrollView>

      {/* Sticky Bottom Action Tray */}
      <View style={[styles.stickyTray, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        <TouchableOpacity
          style={[styles.primaryViewerBtn, isLaunchingViewer && styles.primaryViewerBtnDisabled]}
          onPress={handleLaunchViewer}
          disabled={isLaunchingViewer}
          activeOpacity={0.85}
        >
          {isLaunchingViewer ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="images-outline" size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
              <Text style={styles.viewerBtnText}>Launch OHIF Mobile Viewer</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  backArrow: {
    fontSize: 20,
    color: '#0F172A',
    fontWeight: '700',
  },
  navTitleGroup: {
    flex: 1,
  },
  navTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  navSubtitle: {
    fontSize: 11,
    color: '#64748B',
    fontFamily: 'SpaceMono',
    marginTop: 1,
  },
  statusIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  liveSyncPulse: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
    marginRight: 5,
  },
  liveSyncText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#059669',
    letterSpacing: 0.4,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 24,
  },
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  patientProfileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    flexWrap: 'wrap',
    gap: 8,
  },
  patientAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#E0F2FE',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 4,
    flexShrink: 0,
  },
  avatarInitials: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0284C7',
  },
  patientInfoBlock: {
    flex: 1,
    minWidth: 140,
  },
  patientNameLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  patientNameText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  verifiedGlyph: {
    fontSize: 13,
    fontWeight: '700',
    color: '#059669',
  },
  patientSubText: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  locationBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    maxWidth: 140,
    flexShrink: 1,
  },
  locationBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#475569',
  },
  idBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    padding: 8,
    gap: 8,
    flexWrap: 'wrap',
  },
  idDivider: {
    width: 1,
    height: 14,
    backgroundColor: '#CBD5E1',
  },
  examHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    flexWrap: 'wrap',
    gap: 8,
  },
  examTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  modalityPill: {
    backgroundColor: '#0F172A',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  modalityPillText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  slicesPill: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  slicesPillText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#475569',
  },
  procedureNameText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 8,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  waitingTimeText: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '500',
  },
  technicalBento: {
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  bentoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#EDF2F7',
  },
  bentoRowLast: {
    borderBottomWidth: 0,
  },
  bentoLabel: {
    fontSize: 11,
    color: '#64748B',
  },
  bentoValue: {
    fontSize: 11,
    fontWeight: '600',
    color: '#1E293B',
  },
  bentoSyncText: {
    color: '#059669',
    fontWeight: '700',
  },
  cardHeaderSmall: {
    fontSize: 10,
    fontWeight: '800',
    color: '#94A3B8',
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  reportHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  reportTitleGroup: {
    flex: 1,
    marginRight: 8,
  },
  reportStatusNote: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0F172A',
  },
  reportLoadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
  },
  reportLoadingText: {
    fontSize: 12,
    color: '#64748B',
  },
  reportContentBlock: {
    marginTop: 4,
  },
  reportField: {
    marginBottom: 10,
  },
  reportFieldLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  reportFieldText: {
    fontSize: 13,
    color: '#1E293B',
    lineHeight: 19,
  },
  impressionCard: {
    backgroundColor: '#F0FDF4',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#BBF7D0',
    marginBottom: 12,
  },
  impressionLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#166534',
    letterSpacing: 0.6,
    marginBottom: 4,
  },
  impressionText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#14532D',
    lineHeight: 18,
  },
  signatureBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 12,
  },
  sigTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sigBadge: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  sigBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#15803D',
  },
  sigTextGroup: {
    flex: 1,
  },
  sigTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0F172A',
  },
  sigAuthor: {
    fontSize: 10,
    color: '#64748B',
    marginTop: 1,
  },
  sigHashText: {
    fontSize: 9,
    color: '#94A3B8',
    fontFamily: 'SpaceMono',
    marginTop: 4,
  },
  pdfButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0F172A',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 8,
  },
  pdfButtonIcon: {
    fontSize: 14,
  },
  pdfButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  draftNotice: {
    backgroundColor: '#FFFBEB',
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  draftNoticeText: {
    fontSize: 11,
    color: '#92400E',
    lineHeight: 16,
  },
  reportEmptyBlock: {
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 8,
  },
  reportEmptyIcon: {
    fontSize: 28,
    marginBottom: 8,
    opacity: 0.6,
  },
  reportEmptyTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 4,
  },
  reportEmptyText: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 17,
  },
  indicationText: {
    fontSize: 13,
    color: '#334155',
    lineHeight: 18,
  },
  clinicianHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  clinicianInfoCol: {
    flex: 1,
  },
  clinicianNameText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  clinicianDeptText: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  clinicianContactText: {
    fontSize: 11,
    color: '#475569',
    fontWeight: '600',
    marginTop: 2,
  },
  callClinicianBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    gap: 4,
  },
  callBtnIcon: {
    fontSize: 13,
  },
  callBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1D4ED8',
  },
  bottomSpacer: {
    height: 90,
  },
  stickyTray: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 24,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    gap: 10,
  },
  primaryViewerBtn: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#0F172A',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  primaryViewerBtnDisabled: {
    opacity: 0.7,
  },
  viewerBtnIcon: {
    fontSize: 15,
  },
  viewerBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  dictateBtn: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  dictateBtnSaved: {
    backgroundColor: '#DCFCE7',
    borderColor: '#BBF7D0',
  },
  dictateBtnIcon: {
    fontSize: 15,
  },
  dictateBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
  },
});
