import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
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
import { FilterChip } from '@/src/components/ui/FilterChip';
import {
  useExpiryAlerts,
  useInventoryItems,
  useReorderAlerts,
} from '@/src/hooks/useOperations';
import { InventoryItem, ReorderAlertItem } from '@/src/types/operations';
import { ModuleIcon } from '@/src/components/ui/ModuleIcon';
import { formatCurrency, formatNumber } from '@/src/utils/formatters';

type InventoryTab = 'ITEMS' | 'REORDER' | 'EXPIRY';

export default function InventoryScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<InventoryTab>('ITEMS');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);

  // Live Queries
  const {
    data: items = [],
    isLoading: loadingItems,
    isError: errorItems,
    refetch: refetchItems,
    isRefetching: refetchingItems,
  } = useInventoryItems();

  const {
    data: reorderData,
    isLoading: loadingReorder,
    refetch: refetchReorder,
  } = useReorderAlerts();

  const {
    data: expiryData,
    isLoading: loadingExpiry,
    refetch: refetchExpiry,
  } = useExpiryAlerts();

  const reorderAlerts = reorderData?.alerts || [];
  const expiryNear = expiryData?.nearExpiry || [];
  const expiryExpired = expiryData?.expired || [];

  // Filter items
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      if (categoryFilter !== 'ALL' && item.category !== categoryFilter) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const code = item.itemCode?.toLowerCase() || '';
        const name = item.name?.toLowerCase() || '';
        const barcode = item.barcode?.toLowerCase() || '';
        const sku = item.sku?.toLowerCase() || '';
        if (!code.includes(q) && !name.includes(q) && !barcode.includes(q) && !sku.includes(q)) {
          return false;
        }
      }
      return true;
    });
  }, [items, categoryFilter, searchQuery]);

  // Categories list
  const categories = ['ALL', 'EMERGENCY_KIT', 'CONTRAST', 'CONSUMABLE', 'FILM', 'GENERAL'];

  const onRefreshAll = () => {
    refetchItems();
    refetchReorder();
    refetchExpiry();
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {/* Top Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Back to previous screen"
        >
          <Text style={styles.backText}>‹</Text>
        </TouchableOpacity>
        <View style={styles.headerTitleBlock}>
          <View style={styles.headerTitleRow}>
            <ModuleIcon name="inventory" size={16} containerSize={28} style={{ marginRight: 6 }} />
            <Text style={styles.headerTitle}>Hospital Inventory & Pharmacy</Text>
          </View>
          <Text style={styles.headerSubtitle}>
            Stock counts, batches & reorder thresholds
          </Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refetchingItems}
            onRefresh={onRefreshAll}
            tintColor="#0F766E"
          />
        }
      >
        {/* Micro-KPI Grid */}
        <View style={styles.kpiGrid}>
          <View style={styles.kpiCard}>
            <Text style={styles.kpiLabel}>Total Items</Text>
            <Text style={styles.kpiValue}>{items.length}</Text>
          </View>
          <View style={styles.kpiCard}>
            <Text style={styles.kpiLabel}>Reorder Alert</Text>
            <Text
              style={[
                styles.kpiValue,
                reorderAlerts.length > 0 ? styles.kpiDanger : styles.kpiSuccess,
              ]}
            >
              {reorderAlerts.length}
            </Text>
          </View>
          <View style={styles.kpiCard}>
            <Text style={styles.kpiLabel}>Near Expiry</Text>
            <Text
              style={[
                styles.kpiValue,
                expiryNear.length > 0 ? styles.kpiWarning : styles.kpiSuccess,
              ]}
            >
              {expiryNear.length}
            </Text>
          </View>
          <View style={styles.kpiCard}>
            <Text style={styles.kpiLabel}>Expired</Text>
            <Text
              style={[
                styles.kpiValue,
                expiryExpired.length > 0 ? styles.kpiDanger : styles.kpiSuccess,
              ]}
            >
              {expiryExpired.length}
            </Text>
          </View>
        </View>

        {/* View Mode Tabs */}
        <View style={styles.tabsRow}>
          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'ITEMS' && styles.tabButtonActive]}
            onPress={() => setActiveTab('ITEMS')}
          >
            <Text
              style={[
                styles.tabButtonText,
                activeTab === 'ITEMS' && styles.tabButtonTextActive,
              ]}
            >
              Catalog ({items.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'REORDER' && styles.tabButtonActive]}
            onPress={() => setActiveTab('REORDER')}
          >
            <Text
              style={[
                styles.tabButtonText,
                activeTab === 'REORDER' && styles.tabButtonTextActive,
              ]}
            >
              Reorder ({reorderAlerts.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'EXPIRY' && styles.tabButtonActive]}
            onPress={() => setActiveTab('EXPIRY')}
          >
            <Text
              style={[
                styles.tabButtonText,
                activeTab === 'EXPIRY' && styles.tabButtonTextActive,
              ]}
            >
              Expiry ({expiryNear.length + expiryExpired.length})
            </Text>
          </TouchableOpacity>
        </View>

        {/* TAB 1: ALL ITEMS */}
        {activeTab === 'ITEMS' && (
          <>
            {/* Search Input */}
            <View style={styles.searchBox}>
              <TextInput
                style={styles.searchInput}
                placeholder="Search by name, code, barcode, or SKU..."
                placeholderTextColor="#94A3B8"
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery('')}>
                  <Text style={styles.clearText}>Clear</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Category Filter Chips */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.categoryRow}
            >
              {categories.map((cat) => (
                <FilterChip
                  key={cat}
                  label={cat.replace('_', ' ')}
                  selected={categoryFilter === cat}
                  onPress={() => setCategoryFilter(cat)}
                />
              ))}
            </ScrollView>

            {/* Loading */}
            {loadingItems && (
              <View style={styles.loadingBox}>
                <ActivityIndicator size="large" color="#0F766E" />
                <Text style={styles.loadingText}>Loading inventory items from RIS...</Text>
              </View>
            )}

            {/* Error */}
            {errorItems && !loadingItems && (
              <View style={styles.errorBox}>
                <Text style={styles.errorTitle}>Error Loading Inventory</Text>
                <Text style={styles.errorText}>Could not retrieve inventory items.</Text>
                <TouchableOpacity style={styles.retryBtn} onPress={() => refetchItems()}>
                  <Text style={styles.retryBtnText}>Retry</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Empty */}
            {!loadingItems && !errorItems && filteredItems.length === 0 && (
              <View style={styles.emptyBox}>
                <Text style={styles.emptyTitle}>No Inventory Items Found</Text>
                <Text style={styles.emptySubtitle}>
                  No items match the selected filter or search terms.
                </Text>
              </View>
            )}

            {/* Item List */}
            {!loadingItems &&
              filteredItems.map((item) => {
                const isLow = item.quantity <= item.reorderLevel || item.reorderAlert;
                return (
                  <TouchableOpacity
                    key={item.id}
                    style={styles.itemCard}
                    onPress={() => setSelectedItem(item)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.itemCardHeader}>
                      <View style={styles.codeBadge}>
                        <Text style={styles.codeText}>{item.itemCode}</Text>
                      </View>
                      <View style={styles.categoryBadge}>
                        <Text style={styles.categoryText}>{item.category}</Text>
                      </View>
                    </View>

                    <Text style={styles.itemName}>{item.name}</Text>

                    <View style={styles.stockRow}>
                      <View style={styles.stockQuantityBlock}>
                        <Text style={styles.stockQuantityLabel}>Current Stock</Text>
                        <Text
                          style={[
                            styles.stockQuantityValue,
                            isLow ? styles.stockLow : styles.stockOk,
                          ]}
                        >
                          {item.quantity}{' '}
                          <Text style={styles.stockUnit}>{item.unit}</Text>
                        </Text>
                      </View>

                      <View style={styles.stockQuantityBlock}>
                        <Text style={styles.stockQuantityLabel}>Reorder Threshold</Text>
                        <Text style={styles.stockThresholdValue}>
                          {item.reorderLevel} {item.unit}
                        </Text>
                      </View>

                      {isLow && (
                        <View style={styles.lowStockPill}>
                          <Text style={styles.lowStockText}>⚠️ REORDER</Text>
                        </View>
                      )}
                    </View>

                    <View style={styles.itemFooter}>
                      <Text style={styles.footerMeta}>
                        Pack: {item.packSize || 'Standard'}
                      </Text>
                      {item.unitPrice && (
                        <Text style={styles.footerPrice}>
                          {formatCurrency(item.unitPrice, { symbol: '₹' })} / {item.unit}
                        </Text>
                      )}
                    </View>
                  </TouchableOpacity>
                );
              })}
          </>
        )}

        {/* TAB 2: REORDER ALERTS */}
        {activeTab === 'REORDER' && (
          <View style={styles.reorderList}>
            {loadingReorder && (
              <View style={styles.loadingBox}>
                <ActivityIndicator size="large" color="#0F766E" />
              </View>
            )}

            {!loadingReorder && reorderAlerts.length === 0 && (
              <View style={styles.emptyBox}>
                <Text style={styles.emptyTitle}>All Stock Levels Healthy</Text>
                <Text style={styles.emptySubtitle}>
                  No inventory items are currently below minimum reorder thresholds.
                </Text>
              </View>
            )}

            {reorderAlerts.map((alert: ReorderAlertItem) => (
              <View key={alert.itemId} style={styles.reorderCard}>
                <View style={styles.reorderCardHeader}>
                  <Text style={styles.reorderItemCode}>{alert.itemCode}</Text>
                  <View style={styles.deficitPill}>
                    <Text style={styles.deficitText}>
                      Deficit: -{alert.deficit} {alert.unit}
                    </Text>
                  </View>
                </View>

                <Text style={styles.reorderItemName}>{alert.name}</Text>

                <View style={styles.reorderMetaGrid}>
                  <View style={styles.reorderMetaItem}>
                    <Text style={styles.reorderMetaLabel}>Current Stock</Text>
                    <Text style={[styles.reorderMetaValue, styles.stockLow]}>
                      {alert.currentStock} {alert.unit}
                    </Text>
                  </View>
                  <View style={styles.reorderMetaItem}>
                    <Text style={styles.reorderMetaLabel}>Threshold</Text>
                    <Text style={styles.reorderMetaValue}>
                      {alert.reorderLevel} {alert.unit}
                    </Text>
                  </View>
                  <View style={styles.reorderMetaItem}>
                    <Text style={styles.reorderMetaLabel}>Suggested Order</Text>
                    <Text style={styles.reorderMetaValue}>
                      {alert.suggestedOrderQty} {alert.unit}
                    </Text>
                  </View>
                  <View style={styles.reorderMetaItem}>
                    <Text style={styles.reorderMetaLabel}>Est. Cost</Text>
                    <Text style={styles.reorderMetaValue}>
                      {formatCurrency(alert.estimatedOrderCost, { symbol: '₹' })}
                    </Text>
                  </View>
                </View>

                <View style={styles.supplierRow}>
                  <Text style={styles.supplierLabel}>Preferred Supplier:</Text>
                  <Text style={styles.supplierValue}>{alert.preferredSupplier}</Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* TAB 3: EXPIRY ALERTS */}
        {activeTab === 'EXPIRY' && (
          <View style={styles.expiryList}>
            {loadingExpiry && (
              <View style={styles.loadingBox}>
                <ActivityIndicator size="large" color="#0F766E" />
              </View>
            )}

            {!loadingExpiry && expiryNear.length === 0 && expiryExpired.length === 0 && (
              <View style={styles.emptyBox}>
                <Text style={styles.emptyTitle}>No Expiring Batches</Text>
                <Text style={styles.emptySubtitle}>
                  All registered medicine, contrast, and consumable batches are within valid expiration dates.
                </Text>
              </View>
            )}

            {/* Expired Batches */}
            {expiryExpired.map((exp) => (
              <View key={exp.id} style={[styles.expiryCard, styles.expiryCardDanger]}>
                <View style={styles.expiryHeader}>
                  <Text style={styles.expiryTagDanger}>EXPIRED</Text>
                  <Text style={styles.expiryDateText}>{exp.expiryDate}</Text>
                </View>
                <Text style={styles.expiryItemName}>{exp.itemName}</Text>
                <Text style={styles.expiryBatchText}>
                  Batch: {exp.batchNumber} • Qty: {exp.quantity} {exp.unit}
                </Text>
              </View>
            ))}

            {/* Near Expiry Batches */}
            {expiryNear.map((near) => (
              <View key={near.id} style={[styles.expiryCard, styles.expiryCardWarning]}>
                <View style={styles.expiryHeader}>
                  <Text style={styles.expiryTagWarning}>
                    EXPIRING IN {near.daysToExpiry} DAYS
                  </Text>
                  <Text style={styles.expiryDateText}>{near.expiryDate}</Text>
                </View>
                <Text style={styles.expiryItemName}>{near.itemName}</Text>
                <Text style={styles.expiryBatchText}>
                  Batch: {near.batchNumber} • Qty: {near.quantity} {near.unit}
                </Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* ITEM DETAIL MODAL */}
      <Modal
        visible={!!selectedItem}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setSelectedItem(null)}
      >
        {selectedItem && (
          <View style={styles.modalOverlay}>
            <View style={styles.modalCard}>
              <View style={styles.modalHeader}>
                <View style={styles.modalHeaderTitleBlock}>
                  <Text style={styles.modalCode}>{selectedItem.itemCode}</Text>
                  <Text style={styles.modalTitle} numberOfLines={2}>
                    {selectedItem.name}
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.modalCloseBtn}
                  onPress={() => setSelectedItem(null)}
                >
                  <Text style={styles.modalCloseText}>✕</Text>
                </TouchableOpacity>
              </View>

              <ScrollView contentContainerStyle={styles.modalScroll}>
                <View style={styles.modalSection}>
                  <Text style={styles.modalSectionTitle}>STOCK & PRICING SPECIFICATION</Text>
                  <View style={styles.modalRow}>
                    <Text style={styles.modalLabel}>Current Physical Stock:</Text>
                    <Text
                      style={[
                        styles.modalValue,
                        selectedItem.quantity <= selectedItem.reorderLevel
                          ? styles.stockLow
                          : styles.stockOk,
                      ]}
                    >
                      {selectedItem.quantity} {selectedItem.unit}
                    </Text>
                  </View>
                  <View style={styles.modalRow}>
                    <Text style={styles.modalLabel}>Minimum Threshold:</Text>
                    <Text style={styles.modalValue}>
                      {selectedItem.reorderLevel} {selectedItem.unit}
                    </Text>
                  </View>
                  <View style={styles.modalRow}>
                    <Text style={styles.modalLabel}>Unit Price:</Text>
                    <Text style={styles.modalValue}>
                      {formatCurrency(selectedItem.unitPrice, { symbol: '₹' })}
                    </Text>
                  </View>
                  <View style={styles.modalRow}>
                    <Text style={styles.modalLabel}>Pack Size:</Text>
                    <Text style={styles.modalValue}>{selectedItem.packSize || 'N/A'}</Text>
                  </View>
                </View>

                <View style={styles.modalSection}>
                  <Text style={styles.modalSectionTitle}>IDENTIFIERS & CLASSIFICATION</Text>
                  <View style={styles.modalRow}>
                    <Text style={styles.modalLabel}>Category:</Text>
                    <Text style={styles.modalValue}>{selectedItem.category}</Text>
                  </View>
                  <View style={styles.modalRow}>
                    <Text style={styles.modalLabel}>Barcode / UPC:</Text>
                    <Text style={[styles.modalValue, styles.mono]}>
                      {selectedItem.barcode || 'N/A'}
                    </Text>
                  </View>
                  <View style={styles.modalRow}>
                    <Text style={styles.modalLabel}>SKU:</Text>
                    <Text style={[styles.modalValue, styles.mono]}>
                      {selectedItem.sku || 'N/A'}
                    </Text>
                  </View>
                  <View style={styles.modalRow}>
                    <Text style={styles.modalLabel}>Emergency Kit Item:</Text>
                    <Text style={styles.modalValue}>
                      {selectedItem.isEmergencyKit ? 'Yes (Critical)' : 'No'}
                    </Text>
                  </View>
                </View>
              </ScrollView>

              <View style={[styles.modalFooter, { paddingBottom: Math.max(insets.bottom, 16) }]}>
                <TouchableOpacity
                  style={styles.modalDismissBtn}
                  onPress={() => setSelectedItem(null)}
                >
                  <Text style={styles.modalDismissText}>Close Item Details</Text>
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
  kpiDanger: {
    color: '#DC2626',
  },
  kpiWarning: {
    color: '#D97706',
  },
  kpiSuccess: {
    color: '#059669',
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
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 10,
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
  clearText: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
  },
  categoryRow: {
    flexDirection: 'row',
    paddingBottom: 10,
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
  itemCard: {
  backgroundColor: '#FFFFFF',
  borderRadius: 12,
  padding: 14,
  marginBottom: 10,
  borderWidth: 1,
  borderColor: '#E2E8F0',
},
  itemCardHeader: {
  flexDirection: 'row',
  justifyContent: 'space-between',
  marginBottom: 6,
},
  codeBadge: {
  backgroundColor: '#F1F5F9',
  paddingHorizontal: 6,
  paddingVertical: 2,
  borderRadius: 4,
},
  codeText: {
  fontSize: 10,
  fontWeight: '700',
  color: '#334155',
  fontFamily: 'SpaceMono',
},
  categoryBadge: {
  backgroundColor: '#EFF6FF',
  paddingHorizontal: 6,
  paddingVertical: 2,
  borderRadius: 4,
},
  categoryText: {
  fontSize: 10,
  fontWeight: '700',
  color: '#1D4ED8',
},
  itemName: {
  fontSize: 14,
  fontWeight: '800',
  color: '#0F172A',
  marginBottom: 10,
},
  stockRow: {
  flexDirection: 'row',
  alignItems: 'center',
  backgroundColor: '#F8FAFC',
  borderRadius: 8,
  padding: 10,
  marginBottom: 8,
  gap: 16,
},
  stockQuantityBlock: {
  flex: 1,
},
  stockQuantityLabel: {
  fontSize: 9,
  fontWeight: '700',
  color: '#64748B',
  textTransform: 'uppercase',
},
  stockQuantityValue: {
  fontSize: 15,
  fontWeight: '800',
  marginTop: 2,
  fontFamily: 'SpaceMono',
},
  stockUnit: {
  fontSize: 10,
  fontWeight: '600',
  color: '#64748B',
},
  stockThresholdValue: {
  fontSize: 13,
  fontWeight: '700',
  color: '#334155',
  marginTop: 2,
  fontFamily: 'SpaceMono',
},
  stockLow: {
  color: '#DC2626',
},
  stockOk: {
  color: '#059669',
},
  lowStockPill: {
  backgroundColor: '#FEE2E2',
  paddingHorizontal: 8,
  paddingVertical: 4,
  borderRadius: 6,
},
  lowStockText: {
  fontSize: 9,
  fontWeight: '800',
  color: '#991B1B',
},
  itemFooter: {
  flexDirection: 'row',
  justifyContent: 'space-between',
  paddingTop: 4,
},
  footerMeta: {
  fontSize: 11,
  color: '#64748B',
},
  footerPrice: {
  fontSize: 11,
  fontWeight: '700',
  color: '#0F766E',
},
  reorderList: {
  gap: 10,
},
  reorderCard: {
  backgroundColor: '#FFFFFF',
  borderRadius: 12,
  padding: 14,
  borderWidth: 1,
  borderColor: '#FECACA',
  borderLeftWidth: 4,
  borderLeftColor: '#DC2626',
},
  reorderCardHeader: {
  flexDirection: 'row',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: 4,
},
  reorderItemCode: {
  fontSize: 10,
  fontWeight: '800',
  color: '#64748B',
  fontFamily: 'SpaceMono',
},
  deficitPill: {
  backgroundColor: '#FEE2E2',
  paddingHorizontal: 6,
  paddingVertical: 2,
  borderRadius: 4,
},
  deficitText: {
  fontSize: 10,
  fontWeight: '800',
  color: '#991B1B',
},
  reorderItemName: {
  fontSize: 13,
  fontWeight: '800',
  color: '#0F172A',
  marginBottom: 8,
},
  reorderMetaGrid: {
  flexDirection: 'row',
  gap: 8,
  backgroundColor: '#F8FAFC',
  borderRadius: 8,
  padding: 8,
  marginBottom: 8,
},
  reorderMetaItem: {
  flex: 1,
},
  reorderMetaLabel: {
  fontSize: 8,
  fontWeight: '700',
  color: '#64748B',
  textTransform: 'uppercase',
},
  reorderMetaValue: {
  fontSize: 12,
  fontWeight: '700',
  color: '#0F172A',
  fontFamily: 'SpaceMono',
  marginTop: 2,
},
  supplierRow: {
  flexDirection: 'row',
  justifyContent: 'space-between',
  paddingTop: 2,
},
  supplierLabel: {
  fontSize: 10,
  color: '#64748B',
},
  supplierValue: {
  fontSize: 10,
  fontWeight: '700',
  color: '#334155',
},
  expiryList: {
  gap: 10,
},
  expiryCard: {
  backgroundColor: '#FFFFFF',
  borderRadius: 10,
  padding: 12,
  borderWidth: 1,
  borderLeftWidth: 4,
},
  expiryCardDanger: {
  borderColor: '#FECACA',
  borderLeftColor: '#DC2626',
},
  expiryCardWarning: {
  borderColor: '#FDE68A',
  borderLeftColor: '#D97706',
},
  expiryHeader: {
  flexDirection: 'row',
  justifyContent: 'space-between',
  marginBottom: 4,
},
  expiryTagDanger: {
  fontSize: 9,
  fontWeight: '800',
  color: '#DC2626',
},
  expiryTagWarning: {
  fontSize: 9,
  fontWeight: '800',
  color: '#D97706',
},
  expiryDateText: {
  fontSize: 10,
  color: '#64748B',
  fontFamily: 'SpaceMono',
},
  expiryItemName: {
  fontSize: 13,
  fontWeight: '800',
  color: '#0F172A',
  marginBottom: 2,
},
  expiryBatchText: {
  fontSize: 11,
  color: '#475569',
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
  modalCode: {
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
