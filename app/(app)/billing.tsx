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
import { useInvoiceDetail, useInvoices } from '@/src/hooks/useBilling';
import { billingService } from '@/src/services/billingService';
import {
  InvoiceDetail,
  InvoiceItem,
  InvoiceListItem,
  InvoiceStatus,
  ReceiptRecord,
} from '@/src/types/billing';
import { Colors } from '@/src/theme/colors';
import { ModuleIcon } from '@/src/components/ui/ModuleIcon';
import { formatCurrency, formatDate } from '@/src/utils/formatters';

const STATUS_FILTERS: { key: string; label: string }[] = [
  { key: 'ALL', label: 'All Invoices' },
  { key: 'PAID', label: 'Paid' },
  { key: 'PENDING', label: 'Pending' },
  { key: 'PARTIALLY_PAID', label: 'Partial' },
  { key: 'CANCELLED', label: 'Cancelled' },
];

export default function StaffBillingScreen() {
  const router = useRouter();
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(null);
  const [activeReceipt, setActiveReceipt] = useState<ReceiptRecord | null>(null);

  const {
    data: liveInvoices,
    isLoading,
    isError,
    error,
    refetch,
    isRefetching,
  } = useInvoices({
    status: selectedStatus === 'ALL' ? undefined : selectedStatus,
    search: searchQuery.trim() || undefined,
  });

  const { data: liveInvoiceDetail, isLoading: loadingDetail } = useInvoiceDetail(
    selectedInvoiceId || undefined
  );

  const activeInvoices = liveInvoices || [];

  const filteredInvoices = activeInvoices.filter((inv) => {
    if (selectedStatus !== 'ALL' && inv.status !== selectedStatus) return false;
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      inv.invoiceNumber.toLowerCase().includes(q) ||
      inv.patientName.toLowerCase().includes(q) ||
      inv.patientId.toLowerCase().includes(q) ||
      inv.accessionNumber.toLowerCase().includes(q)
    );
  });

  const activeDetail: InvoiceDetail | undefined = liveInvoiceDetail;

  const getStatusBadgeStyle = (status: InvoiceStatus) => {
    switch (status) {
      case 'PAID':
        return { bg: '#D1FAE5', text: '#065F46', border: '#A7F3D0' };
      case 'PENDING':
      case 'ISSUED':
        return { bg: '#FFFBEB', text: '#B45309', border: '#FDE68A' };
      case 'PARTIALLY_PAID':
        return { bg: '#EFF6FF', text: '#1D4ED8', border: '#BFDBFE' };
      case 'CANCELLED':
      case 'REFUNDED':
        return { bg: '#FEF2F2', text: '#B91C1C', border: '#FECACA' };
      default:
        return { bg: '#F1F5F9', text: '#475569', border: '#E2E8F0' };
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header with Back button */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>← Back</Text>
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <View style={styles.headerTitleRow}>
            <ModuleIcon name="billing" size={16} containerSize={28} style={{ marginRight: 6 }} />
            <Text style={styles.headerTitle}>Billing & Accounts</Text>
          </View>
          <Text style={styles.headerSubtitle}>
            {filteredInvoices?.length || 0} invoice{filteredInvoices?.length === 1 ? '' : 's'}
          </Text>
        </View>
        <View style={{ width: 60 }} />
      </View>

      {/* Search Input Bar */}
      <View style={styles.searchBarContainer}>
        <TextInput
          style={styles.searchInput}
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search by Patient, MRN, Invoice #, or Accession"
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

      {/* Status Filter Chips */}
      <View style={styles.filterRow}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
          {STATUS_FILTERS.map((tab) => (
            <TouchableOpacity
              key={tab.key}
              style={[styles.filterChip, selectedStatus === tab.key && styles.filterChipActive]}
              onPress={() => setSelectedStatus(tab.key)}
            >
              <Text
                style={[
                  styles.filterChipText,
                  selectedStatus === tab.key && styles.filterChipTextActive,
                ]}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Invoices List */}
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
            <Text style={styles.loadingText}>Fetching billing records from RIS gateway...</Text>
          </View>
        ) : isError ? (
          <View style={styles.errorBox}>
            <ModuleIcon name="alerts" size={24} containerSize={48} style={{ marginBottom: 12 }} />
            <Text style={styles.errorTitle}>Unable to Load Invoices</Text>
            <Text style={styles.errorSub}>
              {error instanceof Error ? error.message : 'Please check your connection and pull down to retry.'}
            </Text>
            <TouchableOpacity style={styles.retryBtn} onPress={() => refetch()}>
              <Text style={styles.retryBtnText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : filteredInvoices && filteredInvoices.length > 0 ? (
          filteredInvoices.map((inv) => {
            const badge = getStatusBadgeStyle(inv.status);
            const dateStr = inv.createdAt
              ? new Date(inv.createdAt).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })
              : 'On record';

            return (
              <TouchableOpacity
                key={inv.id || inv.invoiceNumber}
                style={styles.invoiceCard}
                onPress={() => setSelectedInvoiceId(inv.id || inv.invoiceNumber)}
                activeOpacity={0.7}
              >
                <View style={styles.cardTopRow}>
                  <View style={styles.invNumberPill}>
                    <Text style={styles.invNumberText}>{inv.invoiceNumber}</Text>
                  </View>
                  <View style={styles.cardBadgesRow}>
                    <View style={[styles.statusBadge, { backgroundColor: badge.bg, borderColor: badge.border }]}>
                      <Text style={[styles.statusText, { color: badge.text }]}>{inv.status}</Text>
                    </View>
                  </View>
                </View>

                <View style={styles.patientRow}>
                  <Text style={styles.patientName}>{inv.patientName}</Text>
                  <Text style={styles.patientMrn}>MRN: {inv.patientId}</Text>
                </View>

                <View style={styles.metaRow}>
                  <Text style={styles.metaLabel}>Accession:</Text>
                  <Text style={styles.metaValue}>{inv.accessionNumber}</Text>
                  <Text style={styles.bullet}>•</Text>
                  <Text style={styles.metaLabel}>Date:</Text>
                  <Text style={styles.metaValue}>{dateStr}</Text>
                </View>

                <View style={styles.financialDivider} />

                <View style={styles.financialRow}>
                  <View style={styles.financialCol}>
                    <Text style={styles.financialLabel}>TOTAL</Text>
                    <Text style={styles.financialValueTotal}>{formatCurrency(inv.total)}</Text>
                  </View>
                  <View style={styles.financialCol}>
                    <Text style={styles.financialLabel}>PAID</Text>
                    <Text style={styles.financialValuePaid}>{formatCurrency(inv.paidAmount)}</Text>
                  </View>
                  <View style={styles.financialCol}>
                    <Text style={styles.financialLabel}>BALANCE</Text>
                    <Text
                      style={[
                        styles.financialValueBalance,
                        (inv.balance ?? 0) > 0 ? styles.balanceDue : styles.balanceClear,
                      ]}
                    >
                      {formatCurrency(inv.balance)}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            );
          })
        ) : (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>No Invoices on File</Text>
            <Text style={styles.emptySub}>
              {selectedStatus === 'ALL'
                ? 'No financial billing invoices have been created yet on the RIS gateway.'
                : `No invoices match the status '${selectedStatus}'.`}
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Invoice Detail Modal */}
      <Modal
        visible={!!selectedInvoiceId}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedInvoiceId(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalSubhead}>Invoice Breakdown</Text>
                <Text style={styles.modalTitle}>{activeDetail?.invoiceNumber || selectedInvoiceId}</Text>
              </View>
              <TouchableOpacity onPress={() => setSelectedInvoiceId(null)} style={styles.modalCloseBtn}>
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>

            {loadingDetail && !activeDetail ? (
              <View style={styles.centered}>
                <ActivityIndicator color={Colors.brand.emerald} />
                <Text style={styles.loadingText}>Loading invoice line items...</Text>
              </View>
            ) : activeDetail ? (
              <ScrollView style={styles.modalBody}>
                {/* Patient and clinical reference */}
                <View style={styles.summaryBox}>
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Patient Name:</Text>
                    <Text style={styles.summaryValueBold}>{activeDetail.patientName}</Text>
                  </View>
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Medical Record #:</Text>
                    <Text style={styles.summaryValue}>{activeDetail.patientId}</Text>
                  </View>
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Accession Reference:</Text>
                    <Text style={styles.summaryValue}>{activeDetail.accessionNumber}</Text>
                  </View>
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Status:</Text>
                    <Text style={styles.summaryValueBold}>{activeDetail.status}</Text>
                  </View>
                </View>

                {/* Itemized charges table */}
                <Text style={styles.sectionHeaderTitle}>ITEMIZED CLINICAL CHARGES</Text>
                {activeDetail.items && activeDetail.items.length > 0 ? (
                  activeDetail.items.map((item: InvoiceItem, idx: number) => (
                    <View key={item.id || idx} style={styles.itemRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.itemDesc}>{item.description}</Text>
                        <Text style={styles.itemCode}>Code: {item.serviceCode}</Text>
                      </View>
                      <View style={styles.itemPricing}>
                        <Text style={styles.itemQty}>x{item.quantity}</Text>
                        <Text style={styles.itemTotal}>{formatCurrency(item.totalPrice)}</Text>
                      </View>
                    </View>
                  ))
                ) : (
                  <Text style={styles.noItemsText}>No individual line items attached.</Text>
                )}

                {/* Financial Totals */}
                <View style={styles.totalsCard}>
                  <View style={styles.totalLine}>
                    <Text style={styles.totalLineLabel}>Gross Total (Subtotal):</Text>
                    <Text style={styles.totalLineVal}>{formatCurrency(activeDetail.grossAmount)}</Text>
                  </View>
                  {(activeDetail.discount ?? 0) > 0 && (
                    <View style={styles.totalLine}>
                      <Text style={styles.totalLineLabel}>
                        Discount {activeDetail.discountReason ? `(${activeDetail.discountReason})` : ''}:
                      </Text>
                      <Text style={styles.totalLineDiscount}>-{formatCurrency(activeDetail.discount)}</Text>
                    </View>
                  )}
                  {(activeDetail.taxAmount ?? 0) > 0 && (
                    <View style={styles.totalLine}>
                      <Text style={styles.totalLineLabel}>Tax Amount:</Text>
                      <Text style={styles.totalLineVal}>{formatCurrency(activeDetail.taxAmount)}</Text>
                    </View>
                  )}
                  <View style={styles.totalLineDivider} />
                  <View style={styles.totalLine}>
                    <Text style={styles.grandTotalLabel}>Net Invoice Total:</Text>
                    <Text style={styles.grandTotalVal}>{formatCurrency(activeDetail.total)}</Text>
                  </View>
                  <View style={styles.totalLine}>
                    <Text style={styles.totalLineLabel}>Amount Paid to Date:</Text>
                    <Text style={styles.totalLinePaid}>{formatCurrency(activeDetail.paidAmount)}</Text>
                  </View>
                  <View style={styles.totalLine}>
                    <Text style={styles.totalLineLabel}>Outstanding Balance:</Text>
                    <Text
                      style={[
                        styles.grandTotalVal,
                        (activeDetail.balance ?? 0) > 0 ? styles.balanceDue : styles.balanceClear,
                      ]}
                    >
                      {formatCurrency(activeDetail.balance)}
                    </Text>
                  </View>
                </View>

                {/* Collect Payment Action if Balance Due */}
                {(activeDetail.balance ?? 0) > 0 && (
                  <TouchableOpacity
                    style={[
                      styles.viewReceiptBtn,
                      {
                        backgroundColor: Colors.brand.emerald,
                        marginTop: 12,
                        paddingVertical: 12,
                        alignItems: 'center',
                        justifyContent: 'center',
                      },
                    ]}
                    onPress={() => {
                      Alert.alert(
                        'Collect Outstanding Payment',
                        `Invoice: ${activeDetail.invoiceNumber}\nPatient: ${activeDetail.patientName}\nBalance Due: ${formatCurrency(activeDetail.balance)}\n\nSelect payment method to record settlement:`,
                        [
                          { text: 'Cancel', style: 'cancel' },
                          {
                            text: 'UPI Transfer',
                            onPress: async () => {
                              try {
                                const res = await billingService.recordPayment(activeDetail.id, {
                                  amount: activeDetail.balance,
                                  paymentMethod: 'UPI',
                                  reference: `UPI-MOB-${Date.now()}`,
                                });
                                Alert.alert(
                                  res.isLocalDemonstration ? 'Preview Only' : 'Payment Recorded',
                                  res.isLocalDemonstration
                                    ? 'Preview only — no changes saved.'
                                    : res.message,
                                  [
                                    {
                                      text: 'View Receipt',
                                      onPress: () => setActiveReceipt(res.receipt),
                                    },
                                  ]
                                );
                              } catch (err: any) {
                                Alert.alert('Payment Error', err?.message || 'Could not record payment.');
                              }
                            },
                          },
                          {
                            text: 'Cash Desk',
                            onPress: async () => {
                              try {
                                const res = await billingService.recordPayment(activeDetail.id, {
                                  amount: activeDetail.balance,
                                  paymentMethod: 'CASH',
                                  reference: `CASH-MOB-${Date.now()}`,
                                });
                                Alert.alert(
                                  res.isLocalDemonstration ? 'Preview Only' : 'Payment Recorded',
                                  res.isLocalDemonstration
                                    ? 'Preview only — no changes saved.'
                                    : res.message,
                                  [
                                    {
                                      text: 'View Receipt',
                                      onPress: () => setActiveReceipt(res.receipt),
                                    },
                                  ]
                                );
                              } catch (err: any) {
                                Alert.alert('Payment Error', err?.message || 'Could not record payment.');
                              }
                            },
                          },
                        ]
                      );
                    }}
                  >
                    <Text style={[styles.viewReceiptBtnText, { color: '#FFFFFF', fontWeight: '700' }]}>
                      + Collect Payment ({formatCurrency(activeDetail.balance)})
                    </Text>
                  </TouchableOpacity>
                )}

                {/* Receipts Section */}
                <Text style={styles.sectionHeaderTitle}>PAYMENT RECEIPTS</Text>
                {activeDetail.receipts && activeDetail.receipts.length > 0 ? (
                  activeDetail.receipts.map((rcpt: ReceiptRecord) => (
                    <View key={rcpt.id || rcpt.receiptNumber} style={styles.receiptRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.receiptNumber}>{rcpt.receiptNumber}</Text>
                        <Text style={styles.receiptMeta}>
                          {rcpt.paymentMethod} •{' '}
                          {new Date(rcpt.issuedAt).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </Text>
                      </View>
                      <TouchableOpacity
                        style={styles.viewReceiptBtn}
                        onPress={() => setActiveReceipt(rcpt)}
                      >
                        <Text style={styles.viewReceiptBtnText}>View Receipt</Text>
                      </TouchableOpacity>
                    </View>
                  ))
                ) : (
                  <Text style={styles.noItemsText}>
                    No payments or receipts recorded yet.
                  </Text>
                )}
              </ScrollView>
            ) : null}
          </View>
        </View>
      </Modal>

      {/* Official Payment Receipt Modal */}
      <Modal
        visible={!!activeReceipt}
        transparent
        animationType="fade"
        onRequestClose={() => setActiveReceipt(null)}
      >
        {activeReceipt ? (
          <View style={styles.modalOverlay}>
            <View style={styles.receiptModalCard}>
              <View style={styles.receiptHeader}>
                <Text style={styles.receiptHospitalTitle}>RADAXIS RADIOLOGY CENTRE</Text>
                <Text style={styles.receiptHospitalSub}>
                  RadAxis Radiology Information System • Billing & Accounts
                </Text>
                <View style={styles.receiptAckPill}>
                  <Text style={styles.receiptAckText}>OFFICIAL PAYMENT RECEIPT</Text>
                </View>
              </View>

              <View style={styles.receiptDetailsBox}>
                <View style={styles.receiptDetailRow}>
                  <Text style={styles.rcptLabel}>Receipt #:</Text>
                  <Text style={styles.rcptValueBold}>{activeReceipt.receiptNumber || 'N/A'}</Text>
                </View>
                <View style={styles.receiptDetailRow}>
                  <Text style={styles.rcptLabel}>Invoice #:</Text>
                  <Text style={styles.rcptValue}>{activeReceipt.invoiceNumber || 'N/A'}</Text>
                </View>
                <View style={styles.receiptDetailRow}>
                  <Text style={styles.rcptLabel}>Patient (MRN):</Text>
                  <Text style={styles.rcptValue}>{activeReceipt.patientId || 'N/A'}</Text>
                </View>
                <View style={styles.receiptDetailRow}>
                  <Text style={styles.rcptLabel}>Patient Name:</Text>
                  <Text style={styles.rcptValueBold}>{activeReceipt.patientName || 'N/A'}</Text>
                </View>
                <View style={styles.receiptDetailRow}>
                  <Text style={styles.rcptLabel}>Payment Method:</Text>
                  <Text style={styles.rcptValue}>{activeReceipt.paymentMethod || 'CASH'}</Text>
                </View>
                <View style={styles.receiptDetailRow}>
                  <Text style={styles.rcptLabel}>Date Issued:</Text>
                  <Text style={styles.rcptValue}>
                    {formatDate(activeReceipt.issuedAt, { format: 'datetime' })}
                  </Text>
                </View>
                <View style={styles.receiptDetailDivider} />
                <View style={styles.receiptDetailRow}>
                  <Text style={styles.rcptTotalLabel}>Amount Received:</Text>
                  <Text style={styles.rcptTotalValue}>{formatCurrency(activeReceipt.amount)}</Text>
                </View>
              </View>

              <View style={styles.receiptStampBox}>
                <Text style={styles.receiptStampTitle}>ELECTRONIC CASHIER CONFIRMATION</Text>
                <Text style={styles.receiptStampSub}>
                  Official receipt generated by RadAxis RIS Gateway. Authorized payment acknowledged.
                </Text>
              </View>

              <TouchableOpacity style={styles.closeReceiptBtn} onPress={() => setActiveReceipt(null)}>
                <Text style={styles.closeReceiptBtnText}>Close Receipt</Text>
              </TouchableOpacity>
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
  },
  backBtn: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  backBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.brand.navy,
  },
  headerTitleContainer: {
    alignItems: 'center',
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.brand.navy,
  },
  headerSubtitle: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
  },
  searchBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  searchInput: {
    flex: 1,
    backgroundColor: '#F1F5F9',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 12,
    color: Colors.brand.navy,
  },
  clearSearchBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  clearSearchText: {
    fontSize: 14,
    color: '#94A3B8',
    fontWeight: '700',
  },
  filterRow: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    paddingVertical: 8,
  },
  filterScroll: {
    paddingHorizontal: 16,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  filterChipActive: {
    backgroundColor: Colors.brand.navy,
    borderColor: Colors.brand.navy,
  },
  filterChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
  },
  filterChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 32,
  },
  invoiceCard: {
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
  invNumberPill: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  invNumberText: {
    fontSize: 11,
    fontWeight: '800',
    color: Colors.brand.navy,
    fontFamily: 'SpaceMono',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  patientRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  patientName: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.brand.navy,
  },
  patientMrn: {
    fontSize: 11,
    color: '#0369A1',
    fontWeight: '600',
    fontFamily: 'SpaceMono',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  metaLabel: {
    fontSize: 11,
    color: '#64748B',
    marginRight: 4,
  },
  metaValue: {
    fontSize: 11,
    color: '#334155',
    fontWeight: '500',
  },
  bullet: {
    marginHorizontal: 6,
    color: '#CBD5E1',
    fontSize: 10,
  },
  financialDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 10,
  },
  financialRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  financialCol: {
    flex: 1,
  },
  financialLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: '#94A3B8',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  financialValueTotal: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.brand.navy,
  },
  financialValuePaid: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.brand.emeraldDark,
  },
  financialValueBalance: {
    fontSize: 13,
    fontWeight: '800',
  },
  balanceDue: {
    color: '#DC2626',
  },
  balanceClear: {
    color: '#059669',
  },
  centered: {
    paddingVertical: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 8,
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
  emptyCard: {
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
  paddingTop: 16,
  paddingBottom: 24,
  paddingHorizontal: 16,
  maxHeight: '90%',
},
  modalHeader: {
  flexDirection: 'row',
  justifyContent: 'space-between',
  alignItems: 'flex-start',
  marginBottom: 12,
  borderBottomWidth: 1,
  borderBottomColor: '#F1F5F9',
  paddingBottom: 10,
},
  modalSubhead: {
  fontSize: 11,
  fontWeight: '800',
  color: '#0369A1',
  letterSpacing: 0.5,
},
  modalTitle: {
  fontSize: 16,
  fontWeight: '800',
  color: Colors.brand.navy,
  fontFamily: 'SpaceMono',
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
  maxHeight: 460,
},
  summaryBox: {
  backgroundColor: '#F8FAFC',
  borderRadius: 12,
  padding: 12,
  borderWidth: 1,
  borderColor: '#E2E8F0',
  marginBottom: 14,
},
  summaryRow: {
  flexDirection: 'row',
  justifyContent: 'space-between',
  marginBottom: 4,
},
  summaryLabel: {
  fontSize: 11,
  color: '#64748B',
},
  summaryValue: {
  fontSize: 11,
  color: '#334155',
  fontWeight: '500',
},
  summaryValueBold: {
  fontSize: 11,
  color: Colors.brand.navy,
  fontWeight: '700',
},
  sectionHeaderTitle: {
  fontSize: 10,
  fontWeight: '800',
  color: '#94A3B8',
  letterSpacing: 0.8,
  marginBottom: 8,
},
  itemRow: {
  flexDirection: 'row',
  justifyContent: 'space-between',
  paddingVertical: 8,
  borderBottomWidth: 1,
  borderBottomColor: '#F1F5F9',
},
  itemDesc: {
  fontSize: 12,
  fontWeight: '600',
  color: Colors.brand.navy,
},
  itemCode: {
  fontSize: 10,
  color: '#64748B',
  fontFamily: 'SpaceMono',
  marginTop: 1,
},
  itemPricing: {
  alignItems: 'flex-end',
},
  itemQty: {
  fontSize: 10,
  color: '#94A3B8',
},
  itemTotal: {
  fontSize: 12,
  fontWeight: '700',
  color: Colors.brand.navy,
},
  noItemsText: {
  fontSize: 11,
  color: '#94A3B8',
  fontStyle: 'italic',
  marginBottom: 12,
},
  totalsCard: {
  backgroundColor: '#F8FAFC',
  borderRadius: 12,
  padding: 14,
  borderWidth: 1,
  borderColor: '#E2E8F0',
  marginVertical: 14,
},
  totalLine: {
  flexDirection: 'row',
  justifyContent: 'space-between',
  marginBottom: 5,
},
  totalLineLabel: {
  fontSize: 11,
  color: '#64748B',
},
  totalLineVal: {
  fontSize: 12,
  color: Colors.brand.navy,
  fontWeight: '600',
},
  totalLineDiscount: {
  fontSize: 12,
  color: '#059669',
  fontWeight: '600',
},
  totalLinePaid: {
  fontSize: 12,
  color: Colors.brand.emeraldDark,
  fontWeight: '700',
},
  totalLineDivider: {
  height: 1,
  backgroundColor: '#CBD5E1',
  marginVertical: 8,
},
  grandTotalLabel: {
  fontSize: 12,
  fontWeight: '800',
  color: Colors.brand.navy,
},
  grandTotalVal: {
  fontSize: 14,
  fontWeight: '800',
  color: Colors.brand.navy,
},
  receiptRow: {
  flexDirection: 'row',
  justifyContent: 'space-between',
  alignItems: 'center',
  paddingVertical: 10,
  borderBottomWidth: 1,
  borderBottomColor: '#F1F5F9',
},
  receiptNumber: {
  fontSize: 12,
  fontWeight: '700',
  color: Colors.brand.navy,
  fontFamily: 'SpaceMono',
},
  receiptMeta: {
  fontSize: 11,
  color: '#64748B',
  marginTop: 1,
},
  viewReceiptBtn: {
  backgroundColor: '#E0F2FE',
  paddingHorizontal: 10,
  paddingVertical: 5,
  borderRadius: 6,
},
  viewReceiptBtnText: {
  fontSize: 11,
  fontWeight: '700',
  color: '#0369A1',
},
  receiptModalCard: {
  backgroundColor: '#FFFFFF',
  borderRadius: 20,
  padding: 22,
  marginHorizontal: 16,
  maxHeight: '85%',
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.15,
  shadowRadius: 10,
  elevation: 5,
},
  receiptHeader: {
  alignItems: 'center',
  borderBottomWidth: 1,
  borderBottomColor: '#E2E8F0',
  paddingBottom: 12,
  marginBottom: 12,
},
  receiptHospitalTitle: {
  fontSize: 14,
  fontWeight: '800',
  color: Colors.brand.navy,
  letterSpacing: 0.5,
},
  receiptHospitalSub: {
  fontSize: 10,
  color: '#64748B',
  marginTop: 2,
  textAlign: 'center',
},
  receiptAckPill: {
  backgroundColor: '#D1FAE5',
  paddingHorizontal: 10,
  paddingVertical: 3,
  borderRadius: 999,
  marginTop: 8,
},
  receiptAckText: {
  fontSize: 9,
  fontWeight: '800',
  color: '#065F46',
  letterSpacing: 0.5,
},
  receiptDetailsBox: {
  backgroundColor: '#F8FAFC',
  borderRadius: 12,
  padding: 12,
  borderWidth: 1,
  borderColor: '#E2E8F0',
  marginBottom: 12,
},
  receiptDetailRow: {
  flexDirection: 'row',
  justifyContent: 'space-between',
  marginBottom: 5,
},
  rcptLabel: {
  fontSize: 11,
  color: '#64748B',
},
  rcptValue: {
  fontSize: 11,
  color: '#334155',
  fontWeight: '500',
},
  rcptValueBold: {
  fontSize: 11,
  fontWeight: '700',
  color: Colors.brand.navy,
},
  receiptDetailDivider: {
  height: 1,
  backgroundColor: '#E2E8F0',
  marginVertical: 8,
},
  rcptTotalLabel: {
  fontSize: 12,
  fontWeight: '800',
  color: Colors.brand.navy,
},
  rcptTotalValue: {
  fontSize: 14,
  fontWeight: '800',
  color: Colors.brand.emeraldDark,
},
  receiptStampBox: {
  backgroundColor: '#F1F5F9',
  borderRadius: 8,
  padding: 10,
  alignItems: 'center',
  marginBottom: 14,
  borderWidth: 1,
  borderColor: '#E2E8F0',
},
  receiptStampTitle: {
  fontSize: 9,
  fontWeight: '800',
  color: '#475569',
  letterSpacing: 0.5,
},
  receiptStampSub: {
  fontSize: 10,
  color: '#64748B',
  textAlign: 'center',
  marginTop: 2,
},
  closeReceiptBtn: {
  backgroundColor: Colors.brand.navy,
  borderRadius: 10,
  paddingVertical: 12,
  alignItems: 'center',
},
  closeReceiptBtnText: {
  color: '#FFFFFF',
  fontSize: 12,
  fontWeight: '700',
},
  sourceToggleRow: {
  flexDirection: 'row',
  marginHorizontal: 16,
  marginBottom: 10,
  backgroundColor: '#F1F5F9',
  borderRadius: 10,
  padding: 3,
},
  sourceToggleBtn: {
  flex: 1,
  paddingVertical: 8,
  alignItems: 'center',
  borderRadius: 8,
},
  sourceToggleBtnActive: {
  backgroundColor: '#FFFFFF',
  shadowColor: '#0F172A',
  shadowOffset: { width: 0, height: 1 },
  shadowOpacity: 0.08,
  shadowRadius: 2,
  elevation: 2,
},
  sourceToggleBtnActiveDemo: {
  backgroundColor: '#FEF3C7',
  borderWidth: 1,
  borderColor: '#FDE68A',
},
  sourceToggleText: {
  fontSize: 12,
  fontWeight: '600',
  color: '#64748B',
},
  sourceToggleTextActive: {
  color: Colors.brand.navy,
  fontWeight: '700',
},
  sourceToggleTextActiveDemo: {
  color: '#92400E',
  fontWeight: '700',
},
  demoWarningBanner: {
  marginHorizontal: 16,
  marginBottom: 10,
  backgroundColor: '#FFFBEB',
  borderColor: '#FDE68A',
  borderWidth: 1,
  borderRadius: 8,
  paddingHorizontal: 10,
  paddingVertical: 6,
},
  demoWarningText: {
  fontSize: 11,
  fontWeight: '600',
  color: '#B45309',
  lineHeight: 15,
},
  cardBadgesRow: {
  flexDirection: 'row',
  alignItems: 'center',
  gap: 6,
},
  demoBadgePill: {
  backgroundColor: '#FEF3C7',
  borderColor: '#FDE68A',
  borderWidth: 1,
  borderRadius: 6,
  paddingHorizontal: 6,
  paddingVertical: 2,
},
  demoBadgePillText: {
  fontSize: 10,
  fontWeight: '800',
  color: '#92400E',
},
  inspectDemoBtn: {
  marginTop: 14,
  backgroundColor: '#EFF6FF',
  borderColor: '#BFDBFE',
  borderWidth: 1,
  borderRadius: 8,
  paddingVertical: 10,
  paddingHorizontal: 14,
  alignItems: 'center',
},
  inspectDemoBtnText: {
  fontSize: 12,
  fontWeight: '700',
  color: '#1D4ED8',
},
});
