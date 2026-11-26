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
import { useAuth } from '@/src/auth/AuthContext';
import {
  useFinalizedReports,
  useRadiologistWorklist,
  useReportingTemplates,
} from '@/src/hooks/useClinical';
import { radiologistService } from '@/src/services/clinicalService';
import { isMutationAllowed, MUTATION_GUARD_MESSAGE } from '@/src/constants/environment';
import {
  FinalizedReportSummary,
  RadiologistWorklistItem,
  ReportingTemplateItem,
} from '@/src/types/clinical';
import { ModalityType, Priority } from '@/src/types';
import { Colors } from '@/src/theme/colors';
import { ModuleIcon } from '@/src/components/ui/ModuleIcon';

const MODALITY_FILTERS = ['ALL', 'CT', 'MRI', 'XRAY', 'ULTRASOUND'];
const PRIORITY_FILTERS = ['ALL', 'STAT', 'URGENT', 'ROUTINE'];

export default function RadiologistScreen() {
  const router = useRouter();
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState<'WORKLIST' | 'FINALIZED'>('WORKLIST');
  const [selectedModality, setSelectedModality] = useState<string>('ALL');
  const [selectedPriority, setSelectedPriority] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Reporting Workspace Modal State
  const [selectedStudy, setSelectedStudy] = useState<RadiologistWorklistItem | null>(null);
  const [claimedStudies, setClaimedStudies] = useState<Record<string, boolean>>({});
  const [selectedTemplate, setSelectedTemplate] = useState<ReportingTemplateItem | null>(null);
  const [findingsText, setFindingsText] = useState<string>('');
  const [impressionText, setImpressionText] = useState<string>('');

  // Selected Finalized Report detail
  const [selectedFinalizedReport, setSelectedFinalizedReport] = useState<FinalizedReportSummary | null>(null);

  // Queries
  const {
    data: worklistData,
    isLoading: loadingWorklist,
    isError: worklistError,
    error: worklistErrObj,
    refetch: refetchWorklist,
    isRefetching: refetchingWorklist,
  } = useRadiologistWorklist({
    modality: selectedModality,
    priority: selectedPriority,
    search: searchQuery.trim() || undefined,
  });

  const { data: templatesData, isLoading: loadingTemplates } = useReportingTemplates();
  const { data: finalizedReportsData, isLoading: loadingFinalized, refetch: refetchFinalized } = useFinalizedReports();

  const rawWorklist = worklistData || [];
  const rawTemplates = templatesData || [];
  const rawFinalized = finalizedReportsData || [];

  const filteredWorklist = rawWorklist.filter((item) => {
    if (selectedModality !== 'ALL' && item.modality !== selectedModality) return false;
    if (selectedPriority !== 'ALL' && item.priority !== selectedPriority) return false;
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      item.accessionNumber.toLowerCase().includes(q) ||
      item.patientName.toLowerCase().includes(q) ||
      item.patientId.toLowerCase().includes(q) ||
      item.procedureName.toLowerCase().includes(q) ||
      (item.referringDoctor && item.referringDoctor.toLowerCase().includes(q))
    );
  });

  const getPriorityStyle = (priority: Priority) => {
    switch (priority) {
      case 'STAT':
        return { bg: '#FEE2E2', text: '#DC2626', border: '#FCA5A5' };
      case 'URGENT':
        return { bg: '#FEF3C7', text: '#B45309', border: '#FDE68A' };
      default:
        return { bg: '#F1F5F9', text: '#475569', border: '#E2E8F0' };
    }
  };

  const canMutate = isMutationAllowed();

  const handleOpenWorkspace = (study: RadiologistWorklistItem) => {
    setSelectedStudy(study);
    const matchingTemplate = rawTemplates.find((t) => t.modality === study.modality) || rawTemplates[0] || null;
    setSelectedTemplate(matchingTemplate);
    setFindingsText('');
    setImpressionText('');
  };

  const handleSelectTemplate = (template: ReportingTemplateItem) => {
    setSelectedTemplate(template);
    const sectionStub = (template.sections || ['FINDINGS', 'IMPRESSION'])
      .map((s) => `${s}:\n`)
      .join('\n');
    setFindingsText(sectionStub);
    setImpressionText('');
  };

  const handleToggleClaim = async (orderId: string) => {
    if (!canMutate) {
      Alert.alert('Read-Only Production View', MUTATION_GUARD_MESSAGE);
      return;
    }
    const nextClaimed = !claimedStudies[orderId];
    try {
      const res = nextClaimed
        ? await radiologistService.claimStudy(orderId)
        : await radiologistService.releaseStudy(orderId);

      if (!res.success) {
        Alert.alert('Read-Only Production View', res.message);
        return;
      }

      setClaimedStudies((prev) => ({ ...prev, [orderId]: nextClaimed }));

      Alert.alert(
        nextClaimed ? 'Study Claimed' : 'Study Released',
        nextClaimed
          ? `Study ${selectedStudy?.accessionNumber} claimed successfully.`
          : `Study ${selectedStudy?.accessionNumber} released successfully.`,
        [{ text: 'OK' }]
      );
    } catch (err: any) {
      Alert.alert('Claim Error', err?.message || 'Could not update study claim.');
    }
  };

  const handleSimulateSigning = async () => {
    if (!selectedStudy) return;
    if (!canMutate) {
      Alert.alert('Read-Only Production View', MUTATION_GUARD_MESSAGE);
      return;
    }
    try {
      const res = await radiologistService.finalizeAndSignReport(selectedStudy.imagingOrderId, {
        findings: findingsText,
        impression: impressionText,
      });

      if (!res.success) {
        Alert.alert('Read-Only Production View', res.message);
        return;
      }

      refetchWorklist();
      refetchFinalized();
      Alert.alert(
        'Report Finalized & Signed',
        res.message || 'Diagnostic report has been electronically finalized and signed.',
        [{ text: 'Close', onPress: () => setSelectedStudy(null) }]
      );
    } catch (err: any) {
      Alert.alert('Signing Error', err?.message || 'Could not finalize report.');
    }
  };

  const handleLaunchOhif = (studyInstanceUid?: string) => {
    if (!studyInstanceUid) {
      Alert.alert('PACS Reference', 'No DICOM StudyInstanceUID associated with this study record.');
      return;
    }

    router.push({
      pathname: '/(app)/study/[id]' as any,
      params: { id: selectedStudy?.accessionNumber || '' },
    });
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
            <ModuleIcon name="radiologist" size={16} containerSize={28} style={{ marginRight: 6 }} />
            <Text style={styles.headerTitle}>Radiologist Workspace</Text>
          </View>
          <Text style={styles.headerSubtitle}>
            Diagnostic Reading Worklist & Reporting Suite
          </Text>
        </View>
        <View style={{ width: 60 }} />
      </View>

      {/* Role Banner */}
      <View style={styles.roleBanner}>
        <Text style={styles.roleBannerText}>
          Authorized Role: {user?.role || 'RADIOLOGIST'} • Diagnostic Reading Room
        </Text>
      </View>

      {/* Primary Tab Bar */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'WORKLIST' && styles.tabItemActive]}
          onPress={() => setActiveTab('WORKLIST')}
        >
          <Text style={[styles.tabText, activeTab === 'WORKLIST' && styles.tabTextActive]}>
            Reading Worklist ({rawWorklist.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'FINALIZED' && styles.tabItemActive]}
          onPress={() => setActiveTab('FINALIZED')}
        >
          <Text style={[styles.tabText, activeTab === 'FINALIZED' && styles.tabTextActive]}>
            Finalized Reports ({rawFinalized.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View style={styles.searchBarContainer}>
        <TextInput
          style={styles.searchInput}
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Filter by Patient, MRN, Accession, or Doctor..."
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

      {/* Modality Chips Filter */}
      {activeTab === 'WORKLIST' && (
        <View style={styles.filterBar}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
            {MODALITY_FILTERS.map((mod) => (
              <TouchableOpacity
                key={mod}
                style={[styles.filterChip, selectedModality === mod && styles.filterChipActive]}
                onPress={() => setSelectedModality(mod)}
              >
                <Text style={[styles.filterChipText, selectedModality === mod && styles.filterChipTextActive]}>
                  {mod}
                </Text>
              </TouchableOpacity>
            ))}
            <View style={styles.chipDivider} />
            {PRIORITY_FILTERS.map((prio) => (
              <TouchableOpacity
                key={prio}
                style={[styles.filterChip, selectedPriority === prio && styles.filterChipActivePrio]}
                onPress={() => setSelectedPriority(prio)}
              >
                <Text style={[styles.filterChipText, selectedPriority === prio && styles.filterChipTextActivePrio]}>
                  {prio}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Main List ScrollView */}
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refetchingWorklist}
            onRefresh={() => {
              refetchWorklist();
              refetchFinalized();
            }}
            tintColor={Colors.brand.emerald}
          />
        }
      >
        {/* TAB 1: READING WORKLIST */}
        {activeTab === 'WORKLIST' && (
          <>
            {loadingWorklist ? (
              <View style={styles.centered}>
                <ActivityIndicator size="large" color={Colors.brand.emerald} />
                <Text style={styles.loadingText}>Fetching diagnostic reading queue...</Text>
              </View>
            ) : worklistError ? (
              <View style={styles.errorBox}>
                <Text style={styles.errorIcon}>⚠️</Text>
                <Text style={styles.errorTitle}>Unable to Load Worklist</Text>
                <Text style={styles.errorSub}>
                  {worklistErrObj instanceof Error ? worklistErrObj.message : 'Please check connection.'}
                </Text>
              </View>
            ) : filteredWorklist.length > 0 ? (
              filteredWorklist.map((study) => {
                const prioStyle = getPriorityStyle(study.priority);
                const isClaimed = claimedStudies[study.imagingOrderId];
                const pacsMatched = study.pacsIntegrationState?.reconciled;

                return (
                  <View key={study.imagingOrderId} style={styles.card}>
                    <View style={styles.cardTopRow}>
                      <View style={styles.accessionPill}>
                        <Text style={styles.accessionText}>{study.accessionNumber}</Text>
                      </View>
                      <View style={styles.badgesRow}>
                        {isClaimed && (
                          <View style={styles.claimedPill}>
                            <Text style={styles.claimedText}>CLAIMED</Text>
                          </View>
                        )}
                        <View style={[styles.priorityBadge, { backgroundColor: prioStyle.bg, borderColor: prioStyle.border }]}>
                          <Text style={[styles.priorityText, { color: prioStyle.text }]}>{study.priority}</Text>
                        </View>
                      </View>
                    </View>

                    <Text style={styles.patientName}>{study.patientName}</Text>
                    <Text style={styles.patientMeta}>
                      MRN: {study.patientId} • {study.patientGender} • DOB: {study.patientDob}
                    </Text>

                    <View style={styles.procedureBox}>
                      <Text style={styles.procedureModality}>{study.modality}</Text>
                      <Text style={styles.procedureName} numberOfLines={1}>
                        {study.procedureName}
                      </Text>
                    </View>

                    <Text style={styles.indicationText} numberOfLines={2}>
                      Indication: {study.clinicalIndication || 'Routine Diagnostic Evaluation'}
                    </Text>

                    {/* PACS Synchronization Badge */}
                    <View style={styles.pacsBox}>
                      <View style={[styles.pacsDot, pacsMatched ? styles.pacsDotGreen : styles.pacsDotAmber]} />
                      <Text style={styles.pacsLabel}>
                        {study.pacsIntegrationState?.label || 'PACS ARCHIVE LINKED'}
                      </Text>
                    </View>

                    <View style={styles.footerRow}>
                      <Text style={styles.doctorText}>Ref: {study.referringDoctor || 'Internal Staff'}</Text>
                      <Text style={styles.waitText}>Wait: {study.waitingMinutes}m</Text>
                    </View>

                    {/* Clinical Actions Bar */}
                    <View style={styles.actionBar}>
                      <TouchableOpacity
                        style={styles.actionBtnLaunch}
                        onPress={() => handleLaunchOhif(study.pacsIntegrationState?.studyInstanceUid)}
                        activeOpacity={0.8}
                      >
                        <Text style={styles.actionBtnLaunchText}>View DICOM</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.actionBtnReport}
                        onPress={() => handleOpenWorkspace(study)}
                        activeOpacity={0.8}
                      >
                        <Text style={styles.actionBtnReportText}>Report & Sign →</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })
            ) : (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyTitle}>No Studies Awaiting Interpretation</Text>
                <Text style={styles.emptySub}>
                  All studies for the selected filter have been reported and finalized.
                </Text>
              </View>
            )}
          </>
        )}

        {/* TAB 2: FINALIZED REPORTS */}
        {activeTab === 'FINALIZED' && (
          <>
            {loadingFinalized ? (
              <View style={styles.centered}>
                <ActivityIndicator size="large" color={Colors.brand.emerald} />
                <Text style={styles.loadingText}>Fetching finalized reports...</Text>
              </View>
            ) : rawFinalized.length > 0 ? (
              rawFinalized.map((rep) => (
                <TouchableOpacity
                  key={rep.id}
                  style={styles.card}
                  onPress={() => setSelectedFinalizedReport(rep)}
                  activeOpacity={0.7}
                >
                  <View style={styles.cardTopRow}>
                    <View style={styles.finalPill}>
                      <Text style={styles.finalPillText}>FINALIZED & SIGNED</Text>
                    </View>
                    <Text style={styles.finalDate}>
                      {new Date(rep.finalizedAt).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </Text>
                  </View>

                  <Text style={styles.patientName}>
                    {rep.order?.patient?.firstName} {rep.order?.patient?.lastName}
                  </Text>
                  <Text style={styles.patientMeta}>
                    MRN: {rep.order?.patient?.patientId} • Accession: {rep.order?.accessionNumber}
                  </Text>

                  <View style={styles.findingsPreviewBox}>
                    <Text style={styles.findingsPreviewLabel}>IMPRESSION:</Text>
                    <Text style={styles.findingsPreviewText} numberOfLines={2}>
                      {rep.impression}
                    </Text>
                  </View>

                  <View style={styles.signatureBar}>
                    <Text style={styles.signerName}>
                      Signed by: {rep.radiologist?.firstName} {rep.radiologist?.lastName}
                    </Text>
                    <Text style={styles.viewDocLink}>View Signature Details →</Text>
                  </View>
                </TouchableOpacity>
              ))
            ) : (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyTitle}>No Finalized Reports on Record</Text>
              </View>
            )}
          </>
        )}
      </ScrollView>

      {/* Reporting Workspace Drawer Modal */}
      <Modal
        visible={!!selectedStudy}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedStudy(null)}
      >
        {selectedStudy ? (
          <View style={styles.modalOverlay}>
            <View style={styles.modalContainer}>
              <View style={styles.modalHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.modalSubhead}>Diagnostic Reporting Suite</Text>
                  <Text style={styles.modalTitle}>{selectedStudy.accessionNumber}</Text>
                </View>
                <TouchableOpacity onPress={() => setSelectedStudy(null)} style={styles.modalCloseBtn}>
                  <Text style={styles.modalCloseText}>✕</Text>
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.modalBody}>
                {/* Study Summary & Claim Action */}
                <View style={styles.workspaceCard}>
                  <View style={styles.claimRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.workspacePatient}>{selectedStudy.patientName}</Text>
                      <Text style={styles.workspaceMeta}>
                        MRN: {selectedStudy.patientId} • {selectedStudy.procedureName}
                      </Text>
                    </View>
                    {canMutate && (
                      <TouchableOpacity
                        style={[
                          styles.claimBtn,
                          claimedStudies[selectedStudy.imagingOrderId || ''] && styles.claimedBtnActive,
                        ]}
                        onPress={() => handleToggleClaim(selectedStudy.imagingOrderId)}
                        activeOpacity={0.8}
                      >
                        <Text style={styles.claimBtnText}>
                          {claimedStudies[selectedStudy.imagingOrderId || ''] ? 'Release' : 'Claim'}
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>

                  {/* Direct OHIF Viewer Launcher */}
                  <TouchableOpacity
                    style={styles.ohifLauncherBtn}
                    onPress={() => handleLaunchOhif(selectedStudy?.pacsIntegrationState?.studyInstanceUid)}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.ohifLauncherBtnText}>
                      Launch OHIF DICOM Viewer ({selectedStudy?.modality}) →
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Template Picker */}
                <Text style={styles.sectionHeaderTitle}>STRUCTURED REPORT TEMPLATES</Text>
                {rawTemplates.length > 0 ? (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.templateScroll}>
                    {rawTemplates.map((t) => (
                      <TouchableOpacity
                        key={t.id}
                        style={[
                          styles.templateChip,
                          selectedTemplate?.id === t.id && styles.templateChipActive,
                        ]}
                        onPress={() => handleSelectTemplate(t)}
                      >
                        <Text style={[styles.templateChipText, selectedTemplate?.id === t.id && styles.templateChipTextActive]}>
                          {t.name}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                ) : (
                  <Text style={[styles.patientMeta, { marginBottom: 12 }]}>
                    Structured templates catalog requires ADMIN permission or RIS Web Workstation access.
                  </Text>
                )}

                {/* Live Report Editor */}
                <Text style={styles.sectionHeaderTitle}>FINDINGS {canMutate ? '(EDITABLE DRAFT)' : '(READ-ONLY VIEW)'}</Text>
                <TextInput
                  style={styles.reportTextInput}
                  value={findingsText}
                  onChangeText={setFindingsText}
                  editable={canMutate}
                  placeholder={canMutate ? 'Enter diagnostic findings...' : 'Report authoring restricted to RIS Web Workstation'}
                  placeholderTextColor="#94A3B8"
                  multiline
                  numberOfLines={6}
                  textAlignVertical="top"
                />

                <Text style={styles.sectionHeaderTitle}>IMPRESSION (CONCLUSION)</Text>
                <TextInput
                  style={[styles.reportTextInput, { minHeight: 80 }]}
                  value={impressionText}
                  onChangeText={setImpressionText}
                  editable={canMutate}
                  placeholder={canMutate ? 'Enter diagnostic impression...' : 'Read-only view in production mobile'}
                  placeholderTextColor="#94A3B8"
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                />

                {/* Electronic Signature Review Box */}
                <View style={styles.sigBox}>
                  <Text style={styles.sigTitle}>ELECTRONIC SIGNATURE MANIFEST</Text>
                  <Text style={styles.sigStatement}>
                    "Electronically reviewed, approved, and authorized for clinical record."
                  </Text>
                  <View style={styles.sigMetaRow}>
                    <Text style={styles.sigSigner}>
                      Signer: {user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email : 'Clinician'} ({user?.role || 'RADIOLOGIST'})
                    </Text>
                    <Text style={styles.sigAlg}>
                      Status: {canMutate ? 'Ready to Sign' : 'Read-Only'}
                    </Text>
                  </View>
                </View>

                {/* Safety Notice */}
                <View style={styles.simNoticeBox}>
                  <Text style={styles.simNoticeTitle}>
                    {canMutate ? 'REPORT FINALIZATION NOTICE' : 'READ-ONLY PRODUCTION POLICY'}
                  </Text>
                  <Text style={styles.simNoticeText}>
                    {canMutate
                      ? 'Electronically signs the diagnostic findings and advances the order status to COMPLETED on the RIS server.'
                      : 'Diagnostic report authoring, claiming, and digital signing are performed on the authorized RIS Web Workstation.'}
                  </Text>
                </View>

                {canMutate && (
                  <TouchableOpacity
                    style={styles.signReportBtn}
                    onPress={handleSimulateSigning}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.signReportBtnText}>Sign & Finalize Diagnostic Report →</Text>
                  </TouchableOpacity>
                )}
              </ScrollView>
            </View>
          </View>
        ) : null}
      </Modal>

      {/* Finalized Report Detail Modal */}
      <Modal
        visible={!!selectedFinalizedReport}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedFinalizedReport(null)}
      >
        {selectedFinalizedReport ? (
          <View style={styles.modalOverlay}>
            <View style={styles.modalContainer}>
              <View style={styles.modalHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.modalSubhead}>Final Diagnostic Report</Text>
                  <Text style={styles.modalTitle}>{selectedFinalizedReport.order?.accessionNumber}</Text>
                </View>
                <TouchableOpacity onPress={() => setSelectedFinalizedReport(null)} style={styles.modalCloseBtn}>
                  <Text style={styles.modalCloseText}>✕</Text>
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.modalBody}>
                <View style={styles.workspaceCard}>
                  <Text style={styles.sectionHeaderTitle}>FINDINGS:</Text>
                  <Text style={styles.reportContentText}>{selectedFinalizedReport.findings}</Text>

                  <View style={styles.divider} />
                  <Text style={styles.sectionHeaderTitle}>IMPRESSION:</Text>
                  <Text style={styles.reportContentTextBold}>{selectedFinalizedReport.impression}</Text>

                  <View style={styles.divider} />
                  <View style={styles.sigBox}>
                    <Text style={styles.sigTitle}>DIGITAL SIGNATURE MANIFEST</Text>
                    <Text style={styles.sigSigner}>
                      Signed by: {selectedFinalizedReport.digitalSignature?.signedBy || (selectedFinalizedReport.radiologist ? `${selectedFinalizedReport.radiologist.firstName} ${selectedFinalizedReport.radiologist.lastName}`.trim() : 'Attending Radiologist')}
                    </Text>
                    <Text style={styles.sigStatement}>
                      {selectedFinalizedReport.digitalSignature?.statement}
                    </Text>
                    <Text style={styles.hashText} numberOfLines={1} ellipsizeMode="middle">
                      Hash: {selectedFinalizedReport.digitalSignature?.signatureHash}
                    </Text>
                  </View>
                </View>
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
  roleBanner: {
    backgroundColor: '#FDF4FF',
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F5D0FE',
    alignItems: 'center',
  },
  roleBannerText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#A21CAF',
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
  filterBar: {
    marginTop: 8,
    marginBottom: 4,
  },
  filterScroll: {
    paddingHorizontal: 14,
    gap: 6,
    alignItems: 'center',
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  filterChipActive: {
    backgroundColor: Colors.brand.navy,
    borderColor: Colors.brand.navy,
  },
  filterChipActivePrio: {
    backgroundColor: '#B45309',
    borderColor: '#B45309',
  },
  filterChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#475569',
  },
  filterChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  filterChipTextActivePrio: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  chipDivider: {
    width: 1,
    height: 16,
    backgroundColor: '#CBD5E1',
    marginHorizontal: 4,
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
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  accessionPill: {
    backgroundColor: '#F1F5F9',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  accessionText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#1E293B',
    fontFamily: 'monospace',
  },
  badgesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  claimedPill: {
    backgroundColor: '#EFF6FF',
    borderColor: '#BFDBFE',
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  claimedText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#1D4ED8',
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
  procedureBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 6,
    marginBottom: 6,
  },
  procedureModality: {
    fontSize: 11,
    fontWeight: '800',
    color: Colors.brand.emeraldDark,
    marginRight: 6,
  },
  procedureName: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
  },
  indicationText: {
    fontSize: 12,
    color: '#475569',
    marginBottom: 8,
    lineHeight: 16,
  },
  pacsBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginBottom: 8,
  },
  pacsDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    marginRight: 6,
  },
  pacsDotGreen: {
    backgroundColor: '#10B981',
  },
  pacsDotAmber: {
    backgroundColor: '#F59E0B',
  },
  pacsLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#475569',
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 4,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    marginBottom: 8,
  },
  doctorText: {
    fontSize: 11,
    color: '#64748B',
  },
  waitText: {
    fontSize: 11,
    color: '#DC2626',
    fontWeight: '700',
  },
  actionBar: {
    flexDirection: 'row',
    gap: 8,
    paddingTop: 4,
  },
  actionBtnLaunch: {
    flex: 1,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    paddingVertical: 9,
    alignItems: 'center',
  },
  actionBtnLaunchText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
  },
  actionBtnReport: {
    flex: 1.2,
    backgroundColor: Colors.brand.navy,
    borderRadius: 8,
    paddingVertical: 9,
    alignItems: 'center',
  },
  actionBtnReportText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  finalPill: {
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  finalPillText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#047857',
  },
  finalDate: {
    fontSize: 11,
    color: '#64748B',
  },
  findingsPreviewBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 6,
    padding: 8,
    marginVertical: 6,
  },
  findingsPreviewLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#475569',
    marginBottom: 2,
  },
  findingsPreviewText: {
    fontSize: 12,
    color: '#334155',
    lineHeight: 16,
  },
  signatureBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  signerName: {
    fontSize: 11,
    color: '#64748B',
  },
  viewDocLink: {
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
  maxHeight: '90%',
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
  workspaceCard: {
  backgroundColor: '#F8FAFC',
  borderRadius: 10,
  borderWidth: 1,
  borderColor: '#E2E8F0',
  padding: 12,
  marginBottom: 12,
},
  claimRow: {
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'space-between',
  marginBottom: 10,
},
  workspacePatient: {
  fontSize: 15,
  fontWeight: '800',
  color: '#0F172A',
},
  workspaceMeta: {
  fontSize: 11,
  color: '#64748B',
  marginTop: 2,
},
  claimBtn: {
  backgroundColor: '#EFF6FF',
  borderColor: '#BFDBFE',
  borderWidth: 1,
  borderRadius: 8,
  paddingHorizontal: 12,
  paddingVertical: 6,
},
  claimedBtnActive: {
  backgroundColor: '#FEF3C7',
  borderColor: '#FDE68A',
},
  claimBtnText: {
  fontSize: 11,
  fontWeight: '700',
  color: '#1D4ED8',
},
  ohifLauncherBtn: {
  backgroundColor: Colors.brand.navy,
  borderRadius: 8,
  paddingVertical: 10,
  alignItems: 'center',
},
  ohifLauncherBtnText: {
  color: '#FFFFFF',
  fontSize: 12,
  fontWeight: '700',
},
  sectionHeaderTitle: {
  fontSize: 11,
  fontWeight: '800',
  color: '#475569',
  letterSpacing: 0.5,
  marginBottom: 6,
  marginTop: 8,
},
  templateScroll: {
  gap: 6,
  marginBottom: 10,
},
  templateChip: {
  backgroundColor: '#F1F5F9',
  borderRadius: 8,
  borderWidth: 1,
  borderColor: '#E2E8F0',
  paddingHorizontal: 10,
  paddingVertical: 6,
},
  templateChipActive: {
  backgroundColor: '#0F766E',
  borderColor: '#0F766E',
},
  templateChipText: {
  fontSize: 11,
  fontWeight: '600',
  color: '#475569',
},
  templateChipTextActive: {
  color: '#FFFFFF',
  fontWeight: '700',
},
  reportTextInput: {
  backgroundColor: '#F8FAFC',
  borderRadius: 8,
  borderWidth: 1,
  borderColor: '#CBD5E1',
  padding: 10,
  fontSize: 13,
  color: '#0F172A',
  minHeight: 120,
  lineHeight: 18,
},
  sigBox: {
  backgroundColor: '#F1F5F9',
  borderRadius: 8,
  borderWidth: 1,
  borderColor: '#CBD5E1',
  padding: 10,
  marginTop: 12,
  marginBottom: 10,
},
  sigTitle: {
  fontSize: 9,
  fontWeight: '800',
  color: '#475569',
  letterSpacing: 0.5,
  marginBottom: 4,
},
  sigStatement: {
  fontSize: 10,
  color: '#334155',
  fontStyle: 'italic',
  lineHeight: 14,
  marginBottom: 6,
},
  sigMetaRow: {
  flexDirection: 'row',
  justifyContent: 'space-between',
},
  sigSigner: {
  fontSize: 10,
  fontWeight: '700',
  color: '#0F172A',
},
  sigAlg: {
  fontSize: 10,
  color: '#64748B',
},
  simNoticeBox: {
  backgroundColor: '#FFFBEB',
  borderColor: '#FDE68A',
  borderWidth: 1,
  borderRadius: 8,
  padding: 10,
  marginBottom: 12,
},
  simNoticeTitle: {
  fontSize: 11,
  fontWeight: '800',
  color: '#92400E',
  marginBottom: 2,
},
  simNoticeText: {
  fontSize: 11,
  color: '#B45309',
  lineHeight: 15,
},
  signReportBtn: {
  backgroundColor: '#059669',
  borderRadius: 10,
  paddingVertical: 13,
  alignItems: 'center',
  marginBottom: 30,
},
  signReportBtnText: {
  color: '#FFFFFF',
  fontSize: 13,
  fontWeight: '800',
},
  reportContentText: {
  fontSize: 13,
  color: '#334155',
  lineHeight: 18,
},
  reportContentTextBold: {
  fontSize: 13,
  fontWeight: '700',
  color: '#0F172A',
  lineHeight: 18,
},
  divider: {
  height: 1,
  backgroundColor: '#E2E8F0',
  marginVertical: 10,
},
  hashText: {
  fontSize: 9,
  fontFamily: 'monospace',
  color: '#64748B',
  marginTop: 4,
},
});
