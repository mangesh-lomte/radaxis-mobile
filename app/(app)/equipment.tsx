import React, { useState } from 'react';
import {
  ActivityIndicator,
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
import {
  useEquipmentAvailability,
  useEquipmentList,
  usePmSchedules,
} from '@/src/hooks/useOperations';
import { EquipmentAsset, EquipmentStatus } from '@/src/types/operations';
import { ModuleIcon } from '@/src/components/ui/ModuleIcon';

type EquipmentTab = 'ASSETS' | 'PM';

const STATUS_STYLE: Record<EquipmentStatus, { bg: string; text: string; border: string }> = {
  AVAILABLE: { bg: '#F0FDF4', text: '#166534', border: '#BBF7D0' },
  IN_USE: { bg: '#EFF6FF', text: '#1E40AF', border: '#BFDBFE' },
  MAINTENANCE: { bg: '#FFFBEB', text: '#92400E', border: '#FDE68A' },
  OUT_OF_SERVICE: { bg: '#FEF2F2', text: '#991B1B', border: '#FECACA' },
  DECOMMISSIONED: { bg: '#F1F5F9', text: '#475569', border: '#CBD5E1' },
};

export default function EquipmentScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<EquipmentTab>('ASSETS');
  const [selectedAsset, setSelectedAsset] = useState<EquipmentAsset | null>(null);

  const {
    data: assets = [],
    isLoading: loadingAssets,
    isError: errorAssets,
    refetch: refetchAssets,
    isRefetching: refetchingAssets,
  } = useEquipmentList();

  const {
    data: summary,
    refetch: refetchSummary,
  } = useEquipmentAvailability();

  const {
    data: pmSchedules = [],
    isLoading: loadingPm,
    refetch: refetchPm,
  } = usePmSchedules();

  const onRefreshAll = () => {
    refetchAssets();
    refetchSummary();
    refetchPm();
  };

  const formatDate = (d?: string | null) => {
    if (!d) return 'Not recorded';
    try {
      return new Date(d).toLocaleDateString();
    } catch {
      return d;
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {/* Top Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Back"
        >
          <Text style={styles.backText}>‹</Text>
        </TouchableOpacity>
        <View style={styles.headerTitleBlock}>
          <View style={styles.headerTitleRow}>
            <ModuleIcon name="equipment" size={16} containerSize={28} style={{ marginRight: 6 }} />
            <Text style={styles.headerTitle}>Equipment & Maintenance</Text>
          </View>
          <Text style={styles.headerSubtitle}>
            Modality machines, operational status & PM schedules
          </Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refetchingAssets}
            onRefresh={onRefreshAll}
            tintColor="#0F766E"
          />
        }
      >
        {/* Availability Summary Cards */}
        <View style={styles.kpiGrid}>
          <View style={styles.kpiCard}>
            <Text style={styles.kpiLabel}>Total Units</Text>
            <Text style={styles.kpiValue}>{summary?.totalUnits ?? assets.length}</Text>
          </View>
          <View style={styles.kpiCard}>
            <Text style={styles.kpiLabel}>Available</Text>
            <Text style={[styles.kpiValue, styles.kpiSuccess]}>
              {summary?.availableUnits ?? 0}
            </Text>
          </View>
          <View style={styles.kpiCard}>
            <Text style={styles.kpiLabel}>Under PM</Text>
            <Text
              style={[
                styles.kpiValue,
                (summary?.underPmUnits ?? 0) > 0 ? styles.kpiWarning : undefined,
              ]}
            >
              {summary?.underPmUnits ?? 0}
            </Text>
          </View>
          <View style={styles.kpiCard}>
            <Text style={styles.kpiLabel}>Out of Service</Text>
            <Text
              style={[
                styles.kpiValue,
                (summary?.outOfServiceUnits ?? 0) > 0 ? styles.kpiDanger : undefined,
              ]}
            >
              {summary?.outOfServiceUnits ?? 0}
            </Text>
          </View>
        </View>

        {/* View Tabs */}
        <View style={styles.tabsRow}>
          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'ASSETS' && styles.tabButtonActive]}
            onPress={() => setActiveTab('ASSETS')}
          >
            <Text
              style={[
                styles.tabButtonText,
                activeTab === 'ASSETS' && styles.tabButtonTextActive,
              ]}
            >
              Equipment Register ({assets.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'PM' && styles.tabButtonActive]}
            onPress={() => setActiveTab('PM')}
          >
            <Text
              style={[
                styles.tabButtonText,
                activeTab === 'PM' && styles.tabButtonTextActive,
              ]}
            >
              PM Schedule ({pmSchedules.length})
            </Text>
          </TouchableOpacity>
        </View>

        {/* TAB 1: ASSETS */}
        {activeTab === 'ASSETS' && (
          <View style={styles.assetsList}>
            {loadingAssets && (
              <View style={styles.loadingBox}>
                <ActivityIndicator size="large" color="#0F766E" />
                <Text style={styles.loadingText}>Fetching equipment register...</Text>
              </View>
            )}

            {errorAssets && !loadingAssets && (
              <View style={styles.errorBox}>
                <Text style={styles.errorTitle}>Error Loading Equipment</Text>
                <Text style={styles.errorText}>Could not retrieve assets from server.</Text>
                <TouchableOpacity style={styles.retryBtn} onPress={() => refetchAssets()}>
                  <Text style={styles.retryBtnText}>Retry</Text>
                </TouchableOpacity>
              </View>
            )}

            {!loadingAssets && !errorAssets && assets.length === 0 && (
              <View style={styles.emptyBox}>
                <Text style={styles.emptyTitle}>No Equipment Assets</Text>
                <Text style={styles.emptySubtitle}>No modality equipment registered.</Text>
              </View>
            )}

            {assets.map((asset) => {
              const statusStyle =
                STATUS_STYLE[asset.status] || STATUS_STYLE.AVAILABLE;
              return (
                <TouchableOpacity
                  key={asset.id}
                  style={styles.assetCard}
                  onPress={() => setSelectedAsset(asset)}
                  activeOpacity={0.7}
                >
                  <View style={styles.assetHeader}>
                    <View style={styles.modalityPill}>
                      <Text style={styles.modalityText}>{asset.modality}</Text>
                    </View>
                    <View
                      style={[
                        styles.statusPill,
                        {
                          backgroundColor: statusStyle.bg,
                          borderColor: statusStyle.border,
                        },
                      ]}
                    >
                      <Text style={[styles.statusText, { color: statusStyle.text }]}>
                        ● {asset.status}
                      </Text>
                    </View>
                  </View>

                  <Text style={styles.assetName}>{asset.name}</Text>
                  <Text style={styles.assetLocation}>{asset.location}</Text>

                  <View style={styles.metaRow}>
                    <Text style={styles.metaLabel}>
                      Tag: <Text style={styles.metaVal}>{asset.assetTag}</Text>
                    </Text>
                    <Text style={styles.metaLabel}>
                      Model: <Text style={styles.metaVal}>{asset.model}</Text>
                    </Text>
                  </View>

                  <View style={styles.divider} />

                  <View style={styles.datesRow}>
                    <View style={styles.dateBlock}>
                      <Text style={styles.dateLabel}>Last Serviced</Text>
                      <Text style={styles.dateVal}>
                        {formatDate(asset.lastMaintenanceDate)}
                      </Text>
                    </View>
                    <View style={styles.dateBlock}>
                      <Text style={styles.dateLabel}>Next PM Due</Text>
                      <Text style={[styles.dateVal, styles.nextPmVal]}>
                        {formatDate(asset.nextMaintenanceDate)}
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* TAB 2: PM SCHEDULES */}
        {activeTab === 'PM' && (
          <View style={styles.pmList}>
            {loadingPm && (
              <View style={styles.loadingBox}>
                <ActivityIndicator size="large" color="#0F766E" />
              </View>
            )}

            {!loadingPm && pmSchedules.length === 0 && (
              <View style={styles.emptyBox}>
                <Text style={styles.emptyTitle}>No Scheduled PM Tasks</Text>
                <Text style={styles.emptySubtitle}>
                  All preventive maintenance tasks for current cycle are up to date.
                </Text>
              </View>
            )}

            {pmSchedules.map((pm) => (
              <View key={pm.id} style={styles.pmCard}>
                <View style={styles.pmHeader}>
                  <Text style={styles.pmDateText}>{formatDate(pm.scheduledDate)}</Text>
                  <View style={styles.pmStatusPill}>
                    <Text style={styles.pmStatusText}>{pm.status}</Text>
                  </View>
                </View>
                <Text style={styles.pmEquipTitle}>
                  {pm.equipmentName || 'Modality Scanner'}
                </Text>
                <Text style={styles.pmMeta}>
                  Frequency: {pm.frequency} • Engineer:{' '}
                  {pm.assignedEngineer || 'Hospital Biomed Staff'}
                </Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* ASSET DETAIL MODAL */}
      <Modal
        visible={!!selectedAsset}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setSelectedAsset(null)}
      >
        {selectedAsset && (
          <View style={styles.modalOverlay}>
            <View style={styles.modalCard}>
              <View style={styles.modalHeader}>
                <View style={styles.modalHeaderTitleBlock}>
                  <Text style={styles.modalTag}>{selectedAsset.assetTag}</Text>
                  <Text style={styles.modalTitle} numberOfLines={2}>
                    {selectedAsset.name}
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.modalCloseBtn}
                  onPress={() => setSelectedAsset(null)}
                >
                  <Text style={styles.modalCloseText}>✕</Text>
                </TouchableOpacity>
              </View>

              <ScrollView contentContainerStyle={styles.modalScroll}>
                <View style={styles.modalSection}>
                  <Text style={styles.modalSectionTitle}>TECHNICAL SPECIFICATIONS</Text>
                  <View style={styles.modalRow}>
                    <Text style={styles.modalLabel}>Modality:</Text>
                    <Text style={styles.modalValue}>{selectedAsset.modality}</Text>
                  </View>
                  <View style={styles.modalRow}>
                    <Text style={styles.modalLabel}>Manufacturer:</Text>
                    <Text style={styles.modalValue}>{selectedAsset.manufacturer}</Text>
                  </View>
                  <View style={styles.modalRow}>
                    <Text style={styles.modalLabel}>Model:</Text>
                    <Text style={styles.modalValue}>{selectedAsset.model}</Text>
                  </View>
                  <View style={styles.modalRow}>
                    <Text style={styles.modalLabel}>Serial Number:</Text>
                    <Text style={[styles.modalValue, styles.mono]}>
                      {selectedAsset.serialNumber}
                    </Text>
                  </View>
                </View>

                <View style={styles.modalSection}>
                  <Text style={styles.modalSectionTitle}>FACILITY & OPERATIONAL STATUS</Text>
                  <View style={styles.modalRow}>
                    <Text style={styles.modalLabel}>Department:</Text>
                    <Text style={styles.modalValue}>{selectedAsset.department}</Text>
                  </View>
                  <View style={styles.modalRow}>
                    <Text style={styles.modalLabel}>Location / Room:</Text>
                    <Text style={styles.modalValue}>{selectedAsset.location}</Text>
                  </View>
                  <View style={styles.modalRow}>
                    <Text style={styles.modalLabel}>Current Status:</Text>
                    <Text style={styles.modalValue}>{selectedAsset.status}</Text>
                  </View>
                </View>

                <View style={styles.modalSection}>
                  <Text style={styles.modalSectionTitle}>SERVICE & MAINTENANCE DATES</Text>
                  <View style={styles.modalRow}>
                    <Text style={styles.modalLabel}>Last Maintenance:</Text>
                    <Text style={styles.modalValue}>
                      {formatDate(selectedAsset.lastMaintenanceDate)}
                    </Text>
                  </View>
                  <View style={styles.modalRow}>
                    <Text style={styles.modalLabel}>Next Scheduled PM:</Text>
                    <Text style={[styles.modalValue, styles.nextPmVal]}>
                      {formatDate(selectedAsset.nextMaintenanceDate)}
                    </Text>
                  </View>
                </View>
              </ScrollView>

              <View style={[styles.modalFooter, { paddingBottom: Math.max(insets.bottom, 16) }]}>
                <TouchableOpacity
                  style={styles.modalDismissBtn}
                  onPress={() => setSelectedAsset(null)}
                >
                  <Text style={styles.modalDismissText}>Close Equipment Details</Text>
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
  kpiWarning: {
    color: '#D97706',
  },
  kpiDanger: {
    color: '#DC2626',
  },
  tabsRow: {
    flexDirection: 'row',
    backgroundColor: '#E2E8F0',
    borderRadius: 10,
    padding: 3,
    marginBottom: 12,
    gap: 4,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8,
  },
  tabButtonActive: {
    backgroundColor: '#0F766E',
  },
  tabButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
  },
  tabButtonTextActive: {
    color: '#FFFFFF',
  },
  assetsList: {
    gap: 10,
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
  assetCard: {
  backgroundColor: '#FFFFFF',
  borderRadius: 12,
  padding: 14,
  borderWidth: 1,
  borderColor: '#E2E8F0',
},
  assetHeader: {
  flexDirection: 'row',
  justifyContent: 'space-between',
  marginBottom: 8,
},
  modalityPill: {
  backgroundColor: '#0F766E',
  paddingHorizontal: 8,
  paddingVertical: 3,
  borderRadius: 6,
},
  modalityText: {
  color: '#FFFFFF',
  fontSize: 10,
  fontWeight: '800',
},
  statusPill: {
  paddingHorizontal: 8,
  paddingVertical: 3,
  borderRadius: 999,
  borderWidth: 1,
},
  statusText: {
  fontSize: 10,
  fontWeight: '800',
},
  assetName: {
  fontSize: 14,
  fontWeight: '800',
  color: '#0F172A',
  marginBottom: 4,
},
  assetLocation: {
  fontSize: 12,
  color: '#475569',
  marginBottom: 8,
},
  metaRow: {
  flexDirection: 'row',
  gap: 16,
  marginBottom: 8,
},
  metaLabel: {
  fontSize: 11,
  color: '#64748B',
},
  metaVal: {
  color: '#0F172A',
  fontWeight: '600',
  fontFamily: 'SpaceMono',
},
  divider: {
  height: 1,
  backgroundColor: '#F1F5F9',
  marginVertical: 8,
},
  datesRow: {
  flexDirection: 'row',
  justifyContent: 'space-between',
},
  dateBlock: {
  flex: 1,
},
  dateLabel: {
  fontSize: 9,
  fontWeight: '700',
  color: '#64748B',
  textTransform: 'uppercase',
},
  dateVal: {
  fontSize: 11,
  fontWeight: '700',
  color: '#334155',
  marginTop: 2,
},
  nextPmVal: {
  color: '#0F766E',
},
  pmList: {
  gap: 10,
},
  pmCard: {
  backgroundColor: '#FFFFFF',
  borderRadius: 10,
  padding: 12,
  borderWidth: 1,
  borderColor: '#E2E8F0',
},
  pmHeader: {
  flexDirection: 'row',
  justifyContent: 'space-between',
  marginBottom: 4,
},
  pmDateText: {
  fontSize: 11,
  fontWeight: '700',
  color: '#0F766E',
},
  pmStatusPill: {
  backgroundColor: '#EFF6FF',
  paddingHorizontal: 6,
  paddingVertical: 2,
  borderRadius: 4,
},
  pmStatusText: {
  fontSize: 9,
  fontWeight: '800',
  color: '#1D4ED8',
},
  pmEquipTitle: {
  fontSize: 13,
  fontWeight: '800',
  color: '#0F172A',
  marginBottom: 2,
},
  pmMeta: {
  fontSize: 11,
  color: '#64748B',
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
  modalTag: {
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
  mono: {
  fontFamily: 'SpaceMono',
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
