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
  usePreparation,
  useSafetyScreening,
  useTechnologistWorklist,
} from '@/src/hooks/useClinical';
import { technologistService } from '@/src/services/clinicalService';
import { isMutationAllowed, MUTATION_GUARD_MESSAGE } from '@/src/constants/environment';
import { TechnologistWorklistItem } from '@/src/types/clinical';
import { ModalityType, Priority } from '@/src/types';
import { Colors } from '@/src/theme/colors';
import { ModuleIcon } from '@/src/components/ui/ModuleIcon';

const MODALITY_FILTERS = ['ALL', 'MRI', 'CT', 'XRAY', 'ULTRASOUND'];
const PRIORITY_FILTERS = ['ALL', 'STAT', 'URGENT', 'ROUTINE'];

type DetailTab = 'OVERVIEW' | 'SAFETY' | 'PREPARATION' | 'LIFECYCLE';

export default function TechnologistScreen() {
  const router = useRouter();
  const { user } = useAuth();

  const [selectedModality, setSelectedModality] = useState<string>('ALL');
  const [selectedPriority, setSelectedPriority] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedItem, setSelectedItem] = useState<TechnologistWorklistItem | null>(null);
  const [activeDetailTab, setActiveDetailTab] = useState<DetailTab>('OVERVIEW');

  // Local simulation state overrides
  const [simulatedState, setSimulatedState] = useState<Record<string, { stage: string; simulated: boolean }>>({});

  // Query Technologist Worklist
  const {
    data: worklistData,
    isLoading,
    isError,
    error,
    refetch,
    isRefetching,
  } = useTechnologistWorklist({
    date: 'ALL',
    modality: selectedModality,
    priority: selectedPriority,
    search: searchQuery.trim() || undefined,
  });

  // Query item detail sub-resources
  const activeOrderId = selectedItem?.orderId;
  const { data: safetyData, isLoading: loadingSafety } = useSafetyScreening(activeOrderId);
  const { data: prepData, isLoading: loadingPrep } = usePreparation(activeOrderId);

  const rawItems = worklistData || [];

  const filteredItems = rawItems.filter((item) => {
    if (selectedModality !== 'ALL' && item.order?.modality !== selectedModality) return false;
    if (selectedPriority !== 'ALL' && item.order?.priority !== selectedPriority) return false;
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      item.order?.accessionNumber.toLowerCase().includes(q) ||
      item.patient?.firstName.toLowerCase().includes(q) ||
      item.patient?.lastName.toLowerCase().includes(q) ||
      item.patient?.patientId.toLowerCase().includes(q) ||
      item.order?.examinationName.toLowerCase().includes(q) ||
      (item.appointment?.tokenNumber && item.appointment.tokenNumber.toLowerCase().includes(q))
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

  const getStageBadge = (orderId: string, defaultStatus: string) => {
    const sim = simulatedState[orderId];
    const current = sim ? sim.stage : defaultStatus;

    switch (current) {
      case 'SCAN_IN_PROGRESS':
        return { label: 'SCANNING', bg: '#EFF6FF', text: '#1D4ED8', border: '#BFDBFE' };
      case 'SCAN_COMPLETED':
        return { label: 'ACQUIRED', bg: '#ECFDF5', text: '#047857', border: '#A7F3D0' };
      case 'IMAGE_ACCEPTED':
      case 'PACS_READY':
        return { label: 'QA ACCEPTED / PACS', bg: '#F0FDF4', text: '#15803D', border: '#BBF7D0' };
      case 'SAFETY_CLEARED':
        return { label: 'SAFETY CLEARED', bg: '#ECFEFF', text: '#0E7490', border: '#A5F3FC' };
      default:
        return { label: current.replace(/_/g, ' '), bg: '#F1F5F9', text: '#475569', border: '#E2E8F0' };
    }
  };

  const canMutate = isMutationAllowed();

  const handleSimulateAction = async (orderId: string, nextStage: string, actionName: string) => {
    if (!canMutate) {
      Alert.alert('Read-Only Production View', MUTATION_GUARD_MESSAGE);
      return;
    }
    try {
      let res: { success: boolean; isLocalDemonstration: boolean; message: string };
      if (nextStage === 'SCAN_IN_PROGRESS') {
        res = await technologistService.startScan(orderId);
      } else if (nextStage === 'SCAN_COMPLETED') {
        res = await technologistService.finishScan(orderId);
      } else if (nextStage === 'IMAGE_ACCEPTED') {
        res = await technologistService.acceptImageQuality(orderId);
      } else {
        res = { success: false, isLocalDemonstration: false, message: MUTATION_GUARD_MESSAGE };
      }

      if (!res.success) {
        Alert.alert('Read-Only Production View', res.message);
        return;
      }

      setSimulatedState((prev) => ({
        ...prev,
        [orderId]: { stage: nextStage, simulated: res.isLocalDemonstration },
      }));
      refetch();

      Alert.alert(
        'Action Confirmed',
        `Order status transitioned to "${nextStage}". Note: Physical image acquisition and transfer occur on the modality console.`,
        [{ text: 'OK' }]
      );
    } catch (err: any) {
      Alert.alert('Action Error', err?.message || 'Could not update scan stage.');
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
            <ModuleIcon name="technologist" size={16} containerSize={28} style={{ marginRight: 6 }} />
            <Text style={styles.headerTitle}>Technologist Workspace</Text>
          </View>
          <Text style={styles.headerSubtitle}>
            Modality Scanning Queue & Safety Screening
          </Text>
        </View>
        <View style={{ width: 60 }} />
      </View>

      {/* Role Banner */}
      <View style={styles.roleBanner}>
        <Text style={styles.roleBannerText}>
          Authorized Role: {user?.role || 'TECHNOLOGIST'} • Scanner Operations
        </Text>
      </View>

      {/* Search Input Bar */}
      <View style={styles.searchBarContainer}>
        <TextInput
          style={styles.searchInput}
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search by Patient, MRN, Token, or Accession"
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

      {/* Filter Chips Bar */}
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

      {/* Main Worklist Feed */}
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
            <Text style={styles.loadingText}>Loading assigned examination queue...</Text>
          </View>
        ) : isError ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorIcon}>⚠️</Text>
            <Text style={styles.errorTitle}>Unable to Load Worklist</Text>
            <Text style={styles.errorSub}>
              {error instanceof Error ? error.message : 'Please check connection.'}
            </Text>
          </View>
        ) : filteredItems.length > 0 ? (
          filteredItems.map((item) => {
            const prioStyle = getPriorityStyle(item.order?.priority);
            const stageStyle = getStageBadge(item.orderId, item.order?.orderStatus);
            const isSim = simulatedState[item.orderId]?.simulated;

            return (
              <TouchableOpacity
                key={item.orderId || item.appointmentId}
                style={styles.card}
                onPress={() => {
                  setSelectedItem(item);
                  setActiveDetailTab('OVERVIEW');
                }}
                activeOpacity={0.7}
              >
                <View style={styles.cardTopRow}>
                  <View style={styles.tokenPill}>
                    <Text style={styles.tokenText}>{item.appointment?.tokenNumber || 'NO TOKEN'}</Text>
                  </View>
                  <View style={styles.badgesRow}>
                    <View style={[styles.priorityBadge, { backgroundColor: prioStyle.bg, borderColor: prioStyle.border }]}>
                      <Text style={[styles.priorityText, { color: prioStyle.text }]}>{item.order?.priority}</Text>
                    </View>
                    <View style={[styles.stageBadge, { backgroundColor: stageStyle.bg, borderColor: stageStyle.border }]}>
                      <Text style={[styles.stageText, { color: stageStyle.text }]}>{stageStyle.label}</Text>
                    </View>
                  </View>
                </View>

                <Text style={styles.patientName}>
                  {item.patient?.firstName} {item.patient?.lastName}
                </Text>
                <Text style={styles.patientMeta}>
                  MRN: {item.patient?.patientId} • {item.patient?.gender} • DOB: {item.patient?.dateOfBirth}
                </Text>

                <View style={styles.procedureBox}>
                  <Text style={styles.procedureModality}>{item.order?.modality}</Text>
                  <Text style={styles.procedureName} numberOfLines={1}>
                    {item.order?.examinationName}
                  </Text>
                </View>

                {item.order?.contrastRequired && (
                  <View style={styles.contrastWarningRow}>
                    <Text style={styles.contrastWarningIcon}>⚠️</Text>
                    <Text style={styles.contrastWarningText}>
                      IV CONTRAST REQUIRED — Check Creatinine / Allergy Protocol
                    </Text>
                  </View>
                )}

                <View style={styles.footerRow}>
                  <Text style={styles.accessionText}>ACC: {item.order?.accessionNumber}</Text>
                  <Text style={styles.equipmentText}>{item.equipment?.name || 'Scanner TBA'}</Text>
                </View>

                <View style={styles.actionPromptRow}>
                  <Text style={styles.actionPromptText}>Review Safety & Protocol →</Text>
                </View>
              </TouchableOpacity>
            );
          })
        ) : (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>Queue Cleared</Text>
            <Text style={styles.emptySub}>
              No active patients waiting for examination in the technologist worklist.
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Clinical Detail Drawer Modal */}
      <Modal
        visible={!!selectedItem}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedItem(null)}
      >
        {selectedItem ? (
          <View style={styles.modalOverlay}>
            <View style={styles.modalContainer}>
              {/* Modal Header */}
              <View style={styles.modalHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.modalSubhead}>Examination Jacket</Text>
                  <Text style={styles.modalTitle}>
                    {selectedItem.patient?.firstName} {selectedItem.patient?.lastName}
                  </Text>
                </View>
                <TouchableOpacity onPress={() => setSelectedItem(null)} style={styles.modalCloseBtn}>
                  <Text style={styles.modalCloseText}>✕</Text>
                </TouchableOpacity>
              </View>

              {/* Sub-Tabs */}
              <View style={styles.modalTabBar}>
                <TouchableOpacity
                  style={[styles.modalTabItem, activeDetailTab === 'OVERVIEW' && styles.modalTabItemActive]}
                  onPress={() => setActiveDetailTab('OVERVIEW')}
                >
                  <Text style={[styles.modalTabText, activeDetailTab === 'OVERVIEW' && styles.modalTabTextActive]}>
                    Details
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalTabItem, activeDetailTab === 'SAFETY' && styles.modalTabItemActive]}
                  onPress={() => setActiveDetailTab('SAFETY')}
                >
                  <Text style={[styles.modalTabText, activeDetailTab === 'SAFETY' && styles.modalTabTextActive]}>
                    Safety Screen
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalTabItem, activeDetailTab === 'PREPARATION' && styles.modalTabItemActive]}
                  onPress={() => setActiveDetailTab('PREPARATION')}
                >
                  <Text style={[styles.modalTabText, activeDetailTab === 'PREPARATION' && styles.modalTabTextActive]}>
                    Preparation
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalTabItem, activeDetailTab === 'LIFECYCLE' && styles.modalTabItemActive]}
                  onPress={() => setActiveDetailTab('LIFECYCLE')}
                >
                  <Text style={[styles.modalTabText, activeDetailTab === 'LIFECYCLE' && styles.modalTabTextActive]}>
                    Scan Actions
                  </Text>
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.modalBody}>
                {/* TAB 1: OVERVIEW */}
                {activeDetailTab === 'OVERVIEW' && (
                  <View>
                    <View style={styles.sectionCard}>
                      <Text style={styles.sectionTitle}>CLINICAL ORDER</Text>
                      <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>Procedure:</Text>
                        <Text style={styles.infoValueBold}>{selectedItem?.order?.examinationName}</Text>
                      </View>
                      <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>Accession #:</Text>
                        <Text style={styles.infoValue}>{selectedItem?.order?.accessionNumber}</Text>
                      </View>
                      <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>Indication:</Text>
                        <Text style={styles.infoValue}>{selectedItem?.order?.clinicalIndication || 'None documented'}</Text>
                      </View>
                      <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>Priority:</Text>
                        <Text style={styles.infoValueBold}>{selectedItem?.order?.priority}</Text>
                      </View>
                      <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>Waiting Token:</Text>
                        <Text style={styles.infoValueBold}>{selectedItem?.appointment?.tokenNumber || 'N/A'}</Text>
                      </View>
                    </View>

                    <View style={styles.sectionCard}>
                      <Text style={styles.sectionTitle}>SCANNER & ROOM</Text>
                      <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>Assigned Equipment:</Text>
                        <Text style={styles.infoValueBold}>{selectedItem?.equipment?.name || 'TBA'}</Text>
                      </View>
                      <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>Suite Location:</Text>
                        <Text style={styles.infoValue}>{selectedItem?.equipment?.location || 'Floor 1'}</Text>
                      </View>
                    </View>
                  </View>
                )}

                {/* TAB 2: SAFETY SCREENING */}
                {activeDetailTab === 'SAFETY' && (
                  <View>
                    {loadingSafety ? (
                      <ActivityIndicator color={Colors.brand.emerald} style={{ marginVertical: 20 }} />
                    ) : safetyData?.screening ? (
                      <View style={styles.sectionCard}>
                        <View style={styles.safetyHeaderRow}>
                          <Text style={styles.sectionTitle}>SAFETY SCREENING VERIFICATION</Text>
                          <View style={styles.clearedPill}>
                            <Text style={styles.clearedPillText}>{safetyData.screening.safetyStatus}</Text>
                          </View>
                        </View>
                        <Text style={styles.safetyNotes}>{safetyData.screening.safetyNotes}</Text>
                        <Text style={styles.completedByText}>
                          Screened by: {safetyData.screening.completedByUser?.firstName} {safetyData.screening.completedByUser?.lastName} (Technologist)
                        </Text>

                        <View style={styles.divider} />
                        <Text style={styles.subHeaderTitle}>SAFETY QUESTIONNAIRE ANSWERS:</Text>
                        {safetyData.screening.answers &&
                          Object.entries(safetyData.screening.answers).map(([key, value]) => (
                            <View key={key} style={styles.answerRow}>
                              <Text style={styles.answerKey}>
                                {key.replace(/^mri_/, '').replace(/_/g, ' ').toUpperCase()}:
                              </Text>
                              <Text style={[styles.answerVal, value === 'NO' ? styles.safeVal : styles.riskVal]}>
                                {value}
                              </Text>
                            </View>
                          ))}
                      </View>
                    ) : (
                      <View style={styles.sectionCard}>
                        <Text style={styles.emptySub}>No formal screening form filed yet for this study.</Text>
                      </View>
                    )}
                  </View>
                )}

                {/* TAB 3: PREPARATION */}
                {activeDetailTab === 'PREPARATION' && (
                  <View>
                    {loadingPrep ? (
                      <ActivityIndicator color={Colors.brand.emerald} style={{ marginVertical: 20 }} />
                    ) : prepData ? (
                      <View style={styles.sectionCard}>
                        <Text style={styles.sectionTitle}>PRE-SCAN PREPARATION REQUIREMENTS</Text>
                        <View style={styles.checkItem}>
                          <Text style={styles.checkIcon}>{prepData.requirements?.ivRequired ? '•' : '✓'}</Text>
                          <Text style={styles.checkText}>
                            IV Cannulation: {prepData.requirements?.ivRequired ? 'Required (20G in AC fossa)' : 'Not required'}
                          </Text>
                        </View>
                        <View style={styles.checkItem}>
                          <Text style={styles.checkIcon}>{prepData.requirements?.fastingRequired ? '!' : '✓'}</Text>
                          <Text style={styles.checkText}>
                            Fasting Requirement: {prepData.requirements?.fastingRequired ? 'Required (4-6 hours)' : 'None'}
                          </Text>
                        </View>
                        <View style={styles.checkItem}>
                          <Text style={styles.checkIcon}>{prepData.requirements?.contrastPreparationRequired ? '•' : '✓'}</Text>
                          <Text style={styles.checkText}>
                            Contrast Prep: {prepData.requirements?.contrastPreparationRequired ? 'Hydration & Renal Check Required' : 'None'}
                          </Text>
                        </View>
                        {prepData.requirements?.additionalPreparationInstructions && (
                          <View style={styles.prepNoticeBox}>
                            <Text style={styles.prepNoticeTitle}>INSTRUCTIONS:</Text>
                            <Text style={styles.prepNoticeText}>
                              {prepData.requirements.additionalPreparationInstructions}
                            </Text>
                          </View>
                        )}

                        <View style={styles.divider} />
                        <Text style={styles.subHeaderTitle}>ELIGIBLE PROTOCOLS</Text>
                        {prepData.eligibleProtocols?.map((proto) => (
                          <View key={proto.id} style={styles.protocolCard}>
                            <Text style={styles.protocolCode}>{proto.code}</Text>
                            <Text style={styles.protocolName}>{proto.name}</Text>
                            <Text style={styles.protocolDesc}>{proto.description}</Text>
                          </View>
                        ))}
                      </View>
                    ) : null}
                  </View>
                )}

                {/* TAB 4: SCAN ACTIONS (WORKFLOW STATUS MANAGEMENT) */}
                {activeDetailTab === 'LIFECYCLE' && (
                  <View>
                    <View style={styles.simNoticeBox}>
                      <Text style={styles.simNoticeTitle}>WORKFLOW STATUS NOTICE</Text>
                      <Text style={styles.simNoticeText}>
                        Mobile actions update the RIS order status in the database. Physical scan acquisition and raw DICOM transfer occur at the modality console.
                      </Text>
                    </View>

                    <View style={styles.sectionCard}>
                      <Text style={styles.sectionTitle}>ACQUISITION STEPPER</Text>
                      <View style={styles.stepperContainer}>
                        <View style={styles.stepRow}>
                          <View style={[styles.stepCircle, styles.stepDone]}>
                            <Text style={styles.stepCircleText}>1</Text>
                          </View>
                          <View style={styles.stepInfo}>
                            <Text style={styles.stepTitle}>Patient Arrival & Token</Text>
                            <Text style={styles.stepSub}>Verified at Reception</Text>
                          </View>
                        </View>

                        <View style={styles.stepLine} />

                        <View style={styles.stepRow}>
                          <View style={[styles.stepCircle, styles.stepDone]}>
                            <Text style={styles.stepCircleText}>2</Text>
                          </View>
                          <View style={styles.stepInfo}>
                            <Text style={styles.stepTitle}>Safety & Protocol</Text>
                            <Text style={styles.stepSub}>Screening cleared by Technologist</Text>
                          </View>
                        </View>

                        <View style={styles.stepLine} />

                        <View style={styles.stepRow}>
                          <View
                            style={[
                              styles.stepCircle,
                              simulatedState[selectedItem.orderId]?.stage === 'SCAN_IN_PROGRESS' ||
                              simulatedState[selectedItem.orderId]?.stage === 'SCAN_COMPLETED' ||
                              simulatedState[selectedItem.orderId]?.stage === 'IMAGE_ACCEPTED'
                                ? styles.stepDone
                                : styles.stepActive,
                            ]}
                          >
                            <Text style={styles.stepCircleText}>3</Text>
                          </View>
                          <View style={styles.stepInfo}>
                            <Text style={styles.stepTitle}>Image Acquisition</Text>
                            <Text style={styles.stepSub}>Scanner active in Zone IV</Text>
                          </View>
                        </View>

                        <View style={styles.stepLine} />

                        <View style={styles.stepRow}>
                          <View
                            style={[
                              styles.stepCircle,
                              simulatedState[selectedItem.orderId]?.stage === 'IMAGE_ACCEPTED'
                                ? styles.stepDone
                                : styles.stepPending,
                            ]}
                          >
                            <Text style={styles.stepCircleText}>4</Text>
                          </View>
                          <View style={styles.stepInfo}>
                            <Text style={styles.stepTitle}>QA & PACS Sync</Text>
                            <Text style={styles.stepSub}>Transfer to Orthanc Archive</Text>
                          </View>
                        </View>
                      </View>

                      {/* Workflow Transition Actions (only enabled when environment allows mutations) */}
                      {canMutate ? (
                        <>
                          <TouchableOpacity
                            style={styles.actionBtnBlue}
                            onPress={() =>
                              handleSimulateAction(selectedItem.orderId, 'SCAN_IN_PROGRESS', 'Start Acquisition')
                            }
                            activeOpacity={0.8}
                          >
                            <Text style={styles.actionBtnText}>1. Update Order Status: Scan In Progress →</Text>
                          </TouchableOpacity>

                          <TouchableOpacity
                            style={styles.actionBtnGreen}
                            onPress={() =>
                              handleSimulateAction(selectedItem.orderId, 'SCAN_COMPLETED', 'Finish Acquisition')
                            }
                            activeOpacity={0.8}
                          >
                            <Text style={styles.actionBtnText}>2. Record Acquisition Complete & Review QA →</Text>
                          </TouchableOpacity>

                          <TouchableOpacity
                            style={styles.actionBtnDark}
                            onPress={() =>
                              handleSimulateAction(selectedItem.orderId, 'IMAGE_ACCEPTED', 'Accept QA & Sync')
                            }
                            activeOpacity={0.8}
                          >
                            <Text style={styles.actionBtnText}>3. Accept Image QA & Update PACS Status →</Text>
                          </TouchableOpacity>
                        </>
                      ) : (
                        <View style={styles.simNoticeBox}>
                          <Text style={styles.simNoticeTitle}>READ-ONLY PRODUCTION VIEW</Text>
                          <Text style={styles.simNoticeText}>
                            Scan acquisition and image QA transitions must be executed from the modality console / RIS Web Workstation.
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>
                )}
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
    backgroundColor: '#ECFDF5',
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#A7F3D0',
    alignItems: 'center',
  },
  roleBannerText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#047857',
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
  tokenPill: {
    backgroundColor: '#F1F5F9',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  tokenText: {
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
  demoBadge: {
    backgroundColor: '#FEF3C7',
    borderColor: '#FDE68A',
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  demoBadgeText: {
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
  stageBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
  },
  stageText: {
    fontSize: 10,
    fontWeight: '700',
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
    marginBottom: 8,
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
  contrastWarningRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFBEB',
    borderColor: '#FDE68A',
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginBottom: 8,
  },
  contrastWarningIcon: {
    marginRight: 6,
    fontSize: 12,
  },
  contrastWarningText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#B45309',
    flex: 1,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 4,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  accessionText: {
    fontSize: 11,
    fontFamily: 'monospace',
    color: '#475569',
    fontWeight: '600',
  },
  equipmentText: {
    fontSize: 11,
    color: '#64748B',
  },
  actionPromptRow: {
    marginTop: 8,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#F8FAFC',
    alignItems: 'flex-end',
  },
  actionPromptText: {
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
    maxHeight: '88%',
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
  modalTabBar: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  modalTabItem: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  modalTabItemActive: {
    borderBottomColor: Colors.brand.emerald,
  },
  modalTabText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
  },
  modalTabTextActive: {
    color: Colors.brand.emeraldDark,
    fontWeight: '700',
  },
  modalBody: {
    padding: 16,
  },
  sectionCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 12,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#475569',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 3,
  },
  infoLabel: {
    fontSize: 12,
    color: '#64748B',
  },
  infoValue: {
    fontSize: 12,
    color: '#0F172A',
    fontWeight: '600',
    flex: 1,
    textAlign: 'right',
  },
  infoValueBold: {
    fontSize: 12,
    color: '#0F172A',
    fontWeight: '800',
    flex: 1,
    textAlign: 'right',
  },
  safetyHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  clearedPill: {
    backgroundColor: '#D1FAE5',
    borderColor: '#A7F3D0',
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  clearedPillText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#065F46',
  },
  safetyNotes: {
    fontSize: 12,
    color: '#334155',
    fontStyle: 'italic',
    marginBottom: 4,
  },
  completedByText: {
    fontSize: 11,
    color: '#64748B',
  },
  divider: {
    height: 1,
    backgroundColor: '#E2E8F0',
    marginVertical: 10,
  },
  subHeaderTitle: {
    fontSize: 10,
    fontWeight: '800',
    color: '#64748B',
    marginBottom: 6,
  },
  answerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 2,
  },
  answerKey: {
    fontSize: 11,
    color: '#475569',
  },
  answerVal: {
    fontSize: 11,
    fontWeight: '700',
  },
  safeVal: {
    color: '#047857',
  },
  riskVal: {
    color: '#DC2626',
  },
  checkItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
  },
  checkIcon: {
    fontSize: 14,
    marginRight: 8,
  },
  checkText: {
    fontSize: 12,
    color: '#334155',
    flex: 1,
  },
  prepNoticeBox: {
    backgroundColor: '#EFF6FF',
    borderColor: '#BFDBFE',
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    marginTop: 8,
  },
  prepNoticeTitle: {
    fontSize: 10,
    fontWeight: '800',
    color: '#1D4ED8',
    marginBottom: 2,
  },
  prepNoticeText: {
    fontSize: 11,
    color: '#1E40AF',
    lineHeight: 15,
  },
  protocolCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 10,
    marginBottom: 6,
  },
  protocolCode: {
    fontSize: 10,
    fontWeight: '800',
    color: Colors.brand.emeraldDark,
    fontFamily: 'monospace',
  },
  protocolName: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
    marginTop: 2,
  },
  protocolDesc: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
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
    marginBottom: 3,
  },
  simNoticeText: {
    fontSize: 11,
    color: '#B45309',
    lineHeight: 15,
  },
  stepperContainer: {
    marginBottom: 14,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stepCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  stepDone: {
    backgroundColor: '#10B981',
  },
  stepActive: {
    backgroundColor: '#3B82F6',
  },
  stepPending: {
    backgroundColor: '#CBD5E1',
  },
  stepCircleText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  stepInfo: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
  },
  stepSub: {
    fontSize: 10,
    color: '#64748B',
  },
  stepLine: {
    width: 2,
    height: 16,
    backgroundColor: '#E2E8F0',
    marginLeft: 13,
    marginVertical: 2,
  },
  actionBtnBlue: {
    backgroundColor: '#1D4ED8',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    marginBottom: 8,
  },
  actionBtnGreen: {
    backgroundColor: '#047857',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    marginBottom: 8,
  },
  actionBtnDark: {
    backgroundColor: '#0F172A',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    marginBottom: 24,
  },
  actionBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
});
