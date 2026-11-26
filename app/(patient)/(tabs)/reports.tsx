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
import * as WebBrowser from 'expo-web-browser';
import { usePatientReports } from '@/src/hooks/usePatientPortal';
import { usePatientAuth } from '@/src/auth/PatientAuthContext';
import { portalService } from '@/src/services/portalService';
import { PatientReport } from '@/src/types/patient';
import { formatDate, formatFileSize } from '@/src/utils/formatters';
import { Colors } from '@/src/theme/colors';

export default function PatientReportsScreen() {
  const { patientToken } = usePatientAuth();
  const insets = useSafeAreaInsets();
  const { data: reports, isLoading, isError, error, refetch, isRefetching } = usePatientReports();

  const [selectedReport, setSelectedReport] = useState<PatientReport | null>(null);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
  const [isLaunchingViewer, setIsLaunchingViewer] = useState(false);

  const handleLaunchOhif = async (accessionNumber: string) => {
    try {
      setIsLaunchingViewer(true);
      const launch = await portalService.getReportViewerUrl(accessionNumber, patientToken || undefined);
      const viewerPath = launch.viewerUrl;
      const fullViewerUrl = viewerPath.startsWith('http')
        ? viewerPath
        : `https://meril-ris.mangesh.my.id${viewerPath.startsWith('/') ? '' : '/'}${viewerPath}`;

      await WebBrowser.openBrowserAsync(fullViewerUrl, {
        presentationStyle: WebBrowser.WebBrowserPresentationStyle.FULL_SCREEN,
        toolbarColor: '#0F172A',
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unable to connect to diagnostic imaging viewer.';
      Alert.alert('OHIF Viewer Notice', msg);
    } finally {
      setIsLaunchingViewer(false);
    }
  };

  const handleDownloadPdf = async (accessionNumber: string, report: PatientReport) => {
    try {
      setIsDownloadingPdf(true);
      const meta = await portalService.verifyReportPdfAccess(accessionNumber, patientToken || undefined);

      const sizeFormatted = formatFileSize(meta.fileSizeBytes);
      const signer = report.signedBy || 'Attending Radiologist';
      const finalizedDate = report.finalizedAt
        ? formatDate(report.finalizedAt, { format: 'datetime' })
        : 'Finalized';

      Alert.alert(
        `Authorized Diagnostic Report PDF`,
        `Accession: ${report.accessionNumber}\n` +
        `File: ${meta.filename}\n` +
        `Size: ${sizeFormatted}\n` +
        `Status: Authenticated via Patient Session\n` +
        `Reporting Radiologist: Dr. ${signer}\n` +
        `Date Finalized: ${finalizedDate}\n\n` +
        `Record Status: Finalized Diagnostic Report on RadAxis RIS`,
        [{ text: 'Close', style: 'cancel' }]
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'PDF report is not currently available for download.';
      Alert.alert('Report PDF Notice', msg);
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Radiology Reports</Text>
        <Text style={styles.headerSubtitle}>
          {reports?.length || 0} finalized diagnostic report{reports?.length === 1 ? '' : 's'}
        </Text>
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
            tintColor={Colors.brand.emerald}
          />
        }
      >
        {isLoading ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={Colors.brand.emerald} />
            <Text style={styles.loadingText}>Fetching authorized patient reports...</Text>
          </View>
        ) : isError ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorIcon}>⚠️</Text>
            <Text style={styles.errorTitle}>Unable to Load Reports</Text>
            <Text style={styles.errorSub}>
              {error instanceof Error ? error.message : 'Failed to retrieve reports. Pull down to retry.'}
            </Text>
            <TouchableOpacity style={styles.retryBtn} onPress={() => refetch()}>
              <Text style={styles.retryBtnText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : reports && reports.length > 0 ? (
          reports.map((report) => (
            <View key={report.reportId || report.accessionNumber} style={styles.reportCard}>
              <View style={styles.cardTopRow}>
                <View style={styles.accessionBadge}>
                  <Text style={styles.accessionText}>{report.accessionNumber}</Text>
                </View>
                <View style={styles.statusPill}>
                  <Text style={styles.statusPillText}>{report.status} VERIFIED</Text>
                </View>
              </View>

              <Text style={styles.examName}>{report.examinationName}</Text>

              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Modality:</Text>
                <Text style={styles.infoValue}>{report.modality}</Text>
                <Text style={styles.bullet}>•</Text>
                <Text style={styles.infoLabel}>Priority:</Text>
                <Text style={styles.infoValue}>{report.priority}</Text>
              </View>

              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Attending Radiologist:</Text>
                <Text style={styles.infoValueBold}>Dr. {report.signedBy}</Text>
              </View>

              {report.referringDoctor && (
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Referring Clinician:</Text>
                  <Text style={styles.infoValue}>{report.referringDoctor}</Text>
                </View>
              )}

              {report.finalizedAt && (
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Verified Date:</Text>
                  <Text style={styles.infoValue}>
                    {new Date(report.finalizedAt).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </Text>
                </View>
              )}

              <View style={styles.cardDivider} />

              <View style={styles.actionsRow}>
                <TouchableOpacity
                  style={styles.detailBtn}
                  onPress={() => setSelectedReport(report)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.detailBtnText}>View Summary</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.pdfBtn}
                  onPress={() => handleDownloadPdf(report.accessionNumber, report)}
                  activeOpacity={0.7}
                  disabled={isDownloadingPdf}
                >
                  <Text style={styles.pdfBtnText}>Download PDF</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.viewerBtn}
                  onPress={() => handleLaunchOhif(report.accessionNumber)}
                  activeOpacity={0.7}
                  disabled={isLaunchingViewer}
                >
                  <Text style={styles.viewerBtnText}>DICOM (OHIF)</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>No Diagnostic Reports Ready</Text>
            <Text style={styles.emptySub}>
              Diagnostic reports will appear here automatically once finalized and reviewed by the attending radiologist.
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Report Summary Modal */}
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
                <View>
                  <Text style={styles.modalTitle}>Diagnostic Report Summary</Text>
                  <Text style={styles.modalAccession}>{selectedReport.accessionNumber}</Text>
                </View>
                <TouchableOpacity onPress={() => setSelectedReport(null)} style={styles.modalCloseBtn}>
                  <Text style={styles.modalCloseText}>✕</Text>
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.modalBody}>
                <View style={styles.modalSection}>
                  <Text style={styles.modalSectionLabel}>EXAMINATION</Text>
                  <Text style={styles.modalSectionValue}>{selectedReport.examinationName}</Text>
                </View>

                <View style={styles.modalSection}>
                  <Text style={styles.modalSectionLabel}>CLINICAL DETAILS</Text>
                  <Text style={styles.modalSectionDetail}>Modality: {selectedReport.modality}</Text>
                  <Text style={styles.modalSectionDetail}>Priority: {selectedReport.priority}</Text>
                  <Text style={styles.modalSectionDetail}>Referring Doctor: {selectedReport.referringDoctor || 'Attending'}</Text>
                </View>

                <View style={styles.modalSection}>
                  <Text style={styles.modalSectionLabel}>REPORT STATUS</Text>
                  <Text style={styles.modalSectionDetail}>Status: {selectedReport.status || 'FINALIZED'}</Text>
                  <Text style={styles.modalSectionDetail}>Radiologist: Dr. {selectedReport.signedBy || 'Arthur Evans'}</Text>
                  <Text style={styles.modalSectionDetail}>
                    Finalized:{' '}
                    {selectedReport.finalizedAt
                      ? formatDate(selectedReport.finalizedAt, { format: 'datetime' })
                      : 'On file'}
                  </Text>
                  <Text style={styles.modalSectionDetail}>Amendments: {selectedReport.amendmentsCount || 0}</Text>
                </View>

                <View style={styles.complianceBox}>
                  <Text style={styles.complianceTitle}>Finalized Diagnostic Record</Text>
                  <Text style={styles.complianceText}>
                    This imaging report has been finalized and recorded in the hospital radiology system.
                  </Text>
                </View>
              </ScrollView>

              <View style={[styles.modalFooter, { paddingBottom: Math.max(insets.bottom, 16) }]}>
                <TouchableOpacity
                  style={styles.modalPrimaryBtn}
                  onPress={() => {
                    handleDownloadPdf(selectedReport.accessionNumber, selectedReport);
                  }}
                >
                  <Text style={styles.modalPrimaryBtnText}>Download Official PDF</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.modalSecondaryBtn}
                  onPress={() => {
                    handleLaunchOhif(selectedReport.accessionNumber);
                  }}
                >
                  <Text style={styles.modalSecondaryBtnText}>Launch Full OHIF Viewer</Text>
                </TouchableOpacity>
              </View>
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
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.brand.navy,
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 32,
  },
  reportCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  accessionBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  accessionText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#334155',
  },
  statusPill: {
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusPillText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#065F46',
  },
  examName: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.brand.navy,
    marginBottom: 8,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    flexWrap: 'wrap',
  },
  infoLabel: {
    fontSize: 11,
    color: '#64748B',
    marginRight: 4,
  },
  infoValue: {
    fontSize: 11,
    color: '#334155',
    fontWeight: '500',
  },
  infoValueBold: {
    fontSize: 11,
    color: Colors.brand.navy,
    fontWeight: '700',
  },
  bullet: {
    marginHorizontal: 6,
    color: '#CBD5E1',
    fontSize: 10,
  },
  cardDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 12,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  detailBtn: {
    flex: 1,
    backgroundColor: '#F1F5F9',
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: 'center',
  },
  detailBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#334155',
  },
  pdfBtn: {
    flex: 1.2,
    backgroundColor: '#E0F2FE',
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: 'center',
  },
  pdfBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0369A1',
  },
  viewerBtn: {
    flex: 1.2,
    backgroundColor: '#0F172A',
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: 'center',
  },
  viewerBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  centered: {
    paddingVertical: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 10,
  },
  errorBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FCA5A5',
  },
  errorIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  errorTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#B91C1C',
  },
  errorSub: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 14,
  },
  retryBtn: {
    backgroundColor: '#B91C1C',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  retryBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  emptyState: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 28,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginTop: 12,
  },

  emptyTitle: {
  fontSize: 16,
  fontWeight: '700',
  color: Colors.brand.navy,
},
  emptySub: {
  fontSize: 12,
  color: '#64748B',
  textAlign: 'center',
  marginTop: 4,
  lineHeight: 18,
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
  padding: 20,
  maxHeight: '85%',
},
  modalHeader: {
  flexDirection: 'row',
  justifyContent: 'space-between',
  alignItems: 'flex-start',
  marginBottom: 16,
  borderBottomWidth: 1,
  borderBottomColor: '#F1F5F9',
  paddingBottom: 12,
},
  modalTitle: {
  fontSize: 17,
  fontWeight: '800',
  color: Colors.brand.navy,
},
  modalAccession: {
  fontSize: 12,
  color: '#64748B',
  marginTop: 2,
},
  modalCloseBtn: {
  padding: 4,
},
  modalCloseText: {
  fontSize: 18,
  color: '#94A3B8',
  fontWeight: '700',
},
  modalBody: {
  marginBottom: 16,
},
  modalSection: {
  marginBottom: 14,
},
  modalSectionLabel: {
  fontSize: 10,
  fontWeight: '800',
  color: '#94A3B8',
  letterSpacing: 0.5,
  marginBottom: 4,
},
  modalSectionValue: {
  fontSize: 14,
  fontWeight: '700',
  color: Colors.brand.navy,
},
  modalSectionDetail: {
  fontSize: 12,
  color: '#475569',
  marginBottom: 3,
},
  complianceBox: {
  backgroundColor: '#F8FAFC',
  borderRadius: 8,
  padding: 12,
  borderWidth: 1,
  borderColor: '#E2E8F0',
  marginTop: 8,
},
  complianceTitle: {
  fontSize: 11,
  fontWeight: '700',
  color: '#0369A1',
  marginBottom: 3,
},
  complianceText: {
  fontSize: 11,
  color: '#64748B',
  lineHeight: 16,
},
  modalFooter: {
  gap: 8,
},
  modalPrimaryBtn: {
  backgroundColor: '#0369A1',
  paddingVertical: 12,
  borderRadius: 10,
  alignItems: 'center',
},
  modalPrimaryBtnText: {
  color: '#FFFFFF',
  fontSize: 13,
  fontWeight: '700',
},
  modalSecondaryBtn: {
  backgroundColor: '#0F172A',
  paddingVertical: 12,
  borderRadius: 10,
  alignItems: 'center',
},
  modalSecondaryBtnText: {
  color: '#FFFFFF',
  fontSize: 13,
  fontWeight: '700',
},
});
