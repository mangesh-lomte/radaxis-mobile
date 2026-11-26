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
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  useAvailableSlots,
  useCancelAppointment,
  usePatientAppointments,
  useRescheduleAppointment,
} from '@/src/hooks/usePatientPortal';
import { isProductionTarget } from '@/src/services/portalService';
import { PatientAppointment, TimeSlot } from '@/src/types/patient';
import { StatusBadge } from '@/src/components/ui/StatusBadge';
import { Colors } from '@/src/theme/colors';

type FilterType = 'ALL' | 'UPCOMING' | 'COMPLETED';

export default function PatientAppointmentsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [filter, setFilter] = useState<FilterType>('ALL');

  // Active appointment for Rescheduling
  const [rescheduleTarget, setRescheduleTarget] = useState<PatientAppointment | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 2);
    return d.toISOString().slice(0, 10);
  });
  const [selectedRescheduleSlot, setSelectedRescheduleSlot] = useState<TimeSlot | null>(null);
  const [rescheduleReason, setRescheduleReason] = useState<string>('Schedule conflict');

  // Active appointment for Cancellation
  const [cancelTarget, setCancelTarget] = useState<PatientAppointment | null>(null);
  const [cancelReason, setCancelReason] = useState<string>('Schedule conflict');

  const {
    data: appointments,
    isLoading,
    isError,
    error,
    refetch,
    isRefetching,
  } = usePatientAppointments();

  const rescheduleMutation = useRescheduleAppointment();
  const cancelMutation = useCancelAppointment();

  const isProduction = isProductionTarget();

  // Slots query for the rescheduling modal
  const targetModality = rescheduleTarget?.modality || 'CT';
  const { data: replacementSlots, isLoading: loadingSlots } = useAvailableSlots(
    rescheduleTarget ? targetModality : undefined,
    rescheduleTarget ? rescheduleDate : undefined
  );

  const rescheduleDateOptions = [1, 2, 3, 4].map((offset) => {
    const d = new Date();
    d.setDate(d.getDate() + offset);
    return {
      iso: d.toISOString().slice(0, 10),
      label:
        offset === 1
          ? 'Tomorrow'
          : d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
    };
  });

  const filteredAppointments = appointments?.filter((item) => {
    if (filter === 'UPCOMING') {
      return item.status !== 'COMPLETED' && item.status !== 'CANCELLED';
    }
    if (filter === 'COMPLETED') {
      return item.status === 'COMPLETED' || item.status === 'CANCELLED';
    }
    return true;
  });

  const handleConfirmReschedule = async () => {
    if (!rescheduleTarget || !selectedRescheduleSlot) return;

    try {
      await rescheduleMutation.mutateAsync({
        appointmentId: rescheduleTarget.id,
        newStart: selectedRescheduleSlot.startTime,
        reason: rescheduleReason.trim() || 'Patient requested reschedule',
        durationMinutes: rescheduleTarget.durationMinutes || 30,
      });

      const newDateStr = `${rescheduleDate} at ${selectedRescheduleSlot.displayTime}`;
      setRescheduleTarget(null);
      setSelectedRescheduleSlot(null);

      Alert.alert(
        'Appointment Rescheduled',
        `Your appointment has been rescheduled to:\n\n${newDateStr}\nEquipment: ${selectedRescheduleSlot.equipmentName}`
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unable to reschedule appointment. Please try again.';
      Alert.alert('Reschedule Notice', msg);
    }
  };

  const handleConfirmCancellation = async () => {
    if (!cancelTarget) return;

    try {
      await cancelMutation.mutateAsync({
        appointmentId: cancelTarget.id,
        reason: cancelReason.trim() || 'Patient cancelled via portal',
      });

      const apptNum = cancelTarget.appointmentNumber;
      setCancelTarget(null);

      Alert.alert(
        'Appointment Cancelled',
        `Appointment ${apptNum} has been cancelled.`
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unable to cancel appointment. Please try again.';
      Alert.alert('Cancellation Notice', msg);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>My Appointments</Text>
          <Text style={styles.headerSubtitle}>
            {appointments?.length || 0} examination{appointments?.length === 1 ? '' : 's'} on record
          </Text>
        </View>

        <TouchableOpacity
          style={styles.bookBtn}
          onPress={() => router.push('/(patient)/catalog')}
          activeOpacity={0.8}
        >
          <Text style={styles.bookBtnText}>+ Book Scan</Text>
        </TouchableOpacity>
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterRow}>
        {(['ALL', 'UPCOMING', 'COMPLETED'] as FilterType[]).map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.filterChip, filter === tab && styles.filterChipActive]}
            onPress={() => setFilter(tab)}
          >
            <Text style={[styles.filterChipText, filter === tab && styles.filterChipTextActive]}>
              {tab === 'ALL' ? 'All Scans' : tab === 'UPCOMING' ? 'Upcoming' : 'Past & Cancelled'}
            </Text>
          </TouchableOpacity>
        ))}
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
            <Text style={styles.loadingText}>Fetching scheduled appointments...</Text>
          </View>
        ) : isError ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorIcon}>⚠️</Text>
            <Text style={styles.errorTitle}>Unable to Load Appointments</Text>
            <Text style={styles.errorSub}>
              {error instanceof Error ? error.message : 'Please check your connection and pull down to retry.'}
            </Text>
            <TouchableOpacity style={styles.retryBtn} onPress={() => refetch()}>
              <Text style={styles.retryBtnText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : filteredAppointments && filteredAppointments.length > 0 ? (
          filteredAppointments.map((appt) => {
            const startDate = new Date(appt.scheduledStart);
            const dateStr = startDate.toLocaleDateString('en-US', {
              weekday: 'short',
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            });
            const timeStr = startDate.toLocaleTimeString('en-US', {
              hour: 'numeric',
              minute: '2-digit',
            });

            const isDemo =
              appt.status === 'DEMO — NOT SUBMITTED' ||
              appt.appointmentNumber.startsWith('DEMO') ||
              appt.appointmentNumber.includes('DEMO');

            const canModify =
              appt.status !== 'CANCELLED' && appt.status !== 'COMPLETED';

            return (
              <View key={appt.id} style={styles.appointmentCard}>
                <View style={styles.cardHeaderRow}>
                  <View style={styles.modalityPill}>
                    <Text style={styles.modalityPillText}>{appt.modality}</Text>
                  </View>
                  <StatusBadge status={appt.status} />
                </View>

                <Text style={styles.examName}>{appt.examination}</Text>

                <View style={styles.detailRow}>
                  <Text style={styles.detailText}>
                    Date: {dateStr} at {timeStr}
                  </Text>
                </View>

                {appt.equipmentName && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailText}>Location: {appt.equipmentName}</Text>
                  </View>
                )}

                <View style={styles.detailRow}>
                  <Text style={styles.detailText}>
                    Apt #{appt.appointmentNumber}{' '}
                    {appt.accessionNumber ? `• Acc #${appt.accessionNumber}` : ''}
                  </Text>
                </View>

                {appt.notesData?.raw && (
                  <View style={styles.prepCard}>
                    <Text style={styles.prepCardTitle}>Preparation Guideline:</Text>
                    <Text style={styles.prepCardBody}>{appt.notesData.raw}</Text>
                  </View>
                )}

                {/* Patient Action Buttons: Reschedule & Cancel */}
                {canModify ? (
                  <View style={styles.actionButtonsRow}>
                    <TouchableOpacity
                      style={styles.rescheduleBtn}
                      onPress={() => {
                        setRescheduleTarget(appt);
                        setSelectedRescheduleSlot(null);
                      }}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.rescheduleBtnText}>Reschedule</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.cancelBtn}
                      onPress={() => setCancelTarget(appt)}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.cancelBtnText}>Cancel</Text>
                    </TouchableOpacity>
                  </View>
                ) : null}

                {appt.isReportFinalized && (
                  <TouchableOpacity
                    style={styles.viewReportRow}
                    onPress={() => router.push('/(patient)/(tabs)/reports')}
                  >
                    <Text style={styles.viewReportText}>Finalized Radiology Report Ready →</Text>
                  </TouchableOpacity>
                )}
              </View>
            );
          })
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>No Appointments Found</Text>
            <Text style={styles.emptySub}>
              {filter === 'ALL'
                ? 'You do not currently have any scheduled imaging procedures.'
                : `No ${filter.toLowerCase()} appointments on record.`}
            </Text>
            <TouchableOpacity
              style={styles.emptyActionBtn}
              onPress={() => router.push('/(patient)/catalog')}
            >
              <Text style={styles.emptyActionText}>Browse Examinations & Available Slots</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* Reschedule Modal */}
      <Modal
        visible={!!rescheduleTarget}
        transparent
        animationType="slide"
        onRequestClose={() => setRescheduleTarget(null)}
      >
        {rescheduleTarget ? (
          <View style={styles.modalOverlay}>
            <View style={styles.modalContainer}>
              <View style={styles.modalHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.modalSubhead}>Reschedule Appointment</Text>
                  <Text style={styles.modalTitle} numberOfLines={1}>
                    {rescheduleTarget.examination}
                  </Text>
                </View>
                <TouchableOpacity onPress={() => setRescheduleTarget(null)} style={styles.modalCloseBtn}>
                  <Text style={styles.modalCloseText}>✕</Text>
                </TouchableOpacity>
              </View>

              {/* Date Selector Row */}
              <View style={styles.dateSelectorRow}>
                {rescheduleDateOptions.map((item) => (
                  <TouchableOpacity
                    key={item.iso}
                    style={[styles.dateChip, rescheduleDate === item.iso && styles.dateChipActive]}
                    onPress={() => {
                      setRescheduleDate(item.iso);
                      setSelectedRescheduleSlot(null);
                    }}
                  >
                    <Text style={[styles.dateChipText, rescheduleDate === item.iso && styles.dateChipTextActive]}>
                      {item.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Replacement Slots */}
              <ScrollView style={styles.slotsScroll}>
                <Text style={styles.slotsHeader}>
                  Available {targetModality} Slots on {rescheduleDate}:
                </Text>

                {loadingSlots ? (
                  <View style={styles.centered}>
                    <ActivityIndicator color={Colors.brand.emerald} />
                    <Text style={styles.loadingText}>Loading replacement slots...</Text>
                  </View>
                ) : replacementSlots?.slots && replacementSlots.slots.length > 0 ? (
                  <View style={styles.slotsGrid}>
                    {replacementSlots.slots.map((slot, idx) => (
                      <TouchableOpacity
                        key={`${slot.equipmentId}-${slot.startTime}-${idx}`}
                        style={[
                          styles.slotCard,
                          !slot.isAvailable && styles.slotCardUnavailable,
                          selectedRescheduleSlot?.startTime === slot.startTime && styles.slotCardSelected,
                        ]}
                        onPress={() => {
                          if (slot.isAvailable) setSelectedRescheduleSlot(slot);
                        }}
                        activeOpacity={slot.isAvailable ? 0.7 : 1}
                      >
                        <Text style={[styles.slotTime, !slot.isAvailable && styles.slotTimeUnavailable]}>
                          {slot.displayTime}
                        </Text>
                        <Text style={styles.slotEquipment} numberOfLines={1}>
                          {slot.equipmentName}
                        </Text>
                        <View
                          style={[
                            styles.slotStatusPill,
                            slot.isAvailable ? styles.slotStatusAvailable : styles.slotStatusBooked,
                          ]}
                        >
                          <Text
                            style={[
                              styles.slotStatusText,
                              slot.isAvailable ? styles.slotStatusTextAvailable : styles.slotStatusTextBooked,
                            ]}
                          >
                            {slot.isAvailable ? 'AVAILABLE' : 'BOOKED'}
                          </Text>
                        </View>
                      </TouchableOpacity>
                    ))}
                  </View>
                ) : (
                  <Text style={styles.noSlotsText}>No open slots on this date. Please pick another date.</Text>
                )}

                {/* Optional Reschedule Reason */}
                <View style={styles.reasonBox}>
                  <Text style={styles.reasonLabel}>Reason for Rescheduling:</Text>
                  <TextInput
                    style={styles.reasonInput}
                    value={rescheduleReason}
                    onChangeText={setRescheduleReason}
                    placeholder="e.g. Schedule conflict, transportation delay"
                  />
                </View>
              </ScrollView>

              <View style={[styles.modalFooter, { paddingBottom: Math.max(insets.bottom, 16) }]}>
                <TouchableOpacity
                  style={[
                    styles.confirmActionBtn,
                    (!selectedRescheduleSlot || rescheduleMutation.isPending) && { opacity: 0.5 },
                  ]}
                  onPress={handleConfirmReschedule}
                  disabled={!selectedRescheduleSlot || rescheduleMutation.isPending}
                >
                  {rescheduleMutation.isPending ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text style={styles.confirmActionBtnText}>
                      {selectedRescheduleSlot
                        ? `Reschedule to ${selectedRescheduleSlot.displayTime}`
                        : 'Select a Replacement Slot'}
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        ) : null}
      </Modal>

      {/* Cancellation Confirmation Modal */}
      <Modal
        visible={!!cancelTarget}
        transparent
        animationType="fade"
        onRequestClose={() => setCancelTarget(null)}
      >
        {cancelTarget ? (
          <View style={styles.modalOverlay}>
            <View style={styles.cancelModalCard}>
              <Text style={styles.cancelWarningIcon}>⚠️</Text>
              <Text style={styles.cancelModalTitle}>Cancel Appointment</Text>
              <Text style={styles.cancelModalSub}>
                Are you sure you want to cancel your upcoming appointment for{' '}
                <Text style={{ fontWeight: '700', color: Colors.brand.navy }}>
                  {cancelTarget.examination}
                </Text>
                ?
              </Text>

              <View style={styles.cancelReasonBox}>
                <Text style={styles.cancelReasonLabel}>Reason for cancellation:</Text>
                <TextInput
                  style={styles.reasonInput}
                  value={cancelReason}
                  onChangeText={setCancelReason}
                  placeholder="e.g. Schedule conflict, doctor advised postponement"
                />
              </View>

              <View style={styles.cancelModalActions}>
                <TouchableOpacity
                  style={[styles.confirmCancelBtn, cancelMutation.isPending && { opacity: 0.5 }]}
                  onPress={handleConfirmCancellation}
                  disabled={cancelMutation.isPending}
                >
                  {cancelMutation.isPending ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text style={styles.confirmCancelBtnText}>Yes, Cancel Appointment</Text>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.dismissCancelBtn}
                  onPress={() => setCancelTarget(null)}
                  disabled={cancelMutation.isPending}
                >
                  <Text style={styles.dismissCancelBtnText}>Keep Appointment</Text>
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
  bookBtn: {
    backgroundColor: Colors.brand.navy,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
  },
  bookBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 8,
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
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  filterChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 32,
  },
  appointmentCard: {
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
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  modalityPill: {
    backgroundColor: '#E0F2FE',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  modalityPillText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#0369A1',
  },
  examName: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.brand.navy,
    marginBottom: 10,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  detailIcon: {
    fontSize: 12,
    marginRight: 6,
  },
  detailText: {
    fontSize: 12,
    color: '#475569',
    fontWeight: '500',
  },
  prepCard: {
    backgroundColor: '#FFFBEB',
    borderRadius: 8,
    padding: 10,
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  prepCardTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#92400E',
    marginBottom: 2,
  },
  prepCardBody: {
    fontSize: 11,
    color: '#B45309',
    lineHeight: 16,
  },
  actionButtonsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  rescheduleBtn: {
    flex: 1,
    backgroundColor: '#F1F5F9',
    borderRadius: 8,
    paddingVertical: 9,
    alignItems: 'center',
  },
  rescheduleBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
  },
  cancelBtn: {
    flex: 1,
    backgroundColor: '#FEF2F2',
    borderRadius: 8,
    paddingVertical: 9,
    alignItems: 'center',
  },
  cancelBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#DC2626',
  },
  viewReportRow: {
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  viewReportText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.brand.emeraldDark,
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
  marginBottom: 16,
  lineHeight: 18,
},
  emptyActionBtn: {
  backgroundColor: Colors.brand.navy,
  paddingHorizontal: 16,
  paddingVertical: 10,
  borderRadius: 10,
},
  emptyActionText: {
  color: '#FFFFFF',
  fontSize: 12,
  fontWeight: '700',
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
  fontSize: 15,
  fontWeight: '800',
  color: Colors.brand.navy,
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
  dateSelectorRow: {
  flexDirection: 'row',
  gap: 8,
  marginBottom: 12,
},
  dateChip: {
  flex: 1,
  paddingVertical: 8,
  alignItems: 'center',
  borderRadius: 8,
  backgroundColor: '#F1F5F9',
  borderWidth: 1,
  borderColor: '#E2E8F0',
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
  slotsScroll: {
  maxHeight: 320,
},
  slotsHeader: {
  fontSize: 11,
  fontWeight: '700',
  color: '#64748B',
  marginBottom: 8,
},
  slotsGrid: {
  gap: 8,
},
  slotCard: {
  flexDirection: 'row',
  justifyContent: 'space-between',
  alignItems: 'center',
  backgroundColor: '#FFFFFF',
  borderRadius: 10,
  padding: 12,
  borderWidth: 1,
  borderColor: '#E2E8F0',
},
  slotCardUnavailable: {
  backgroundColor: '#F8FAFC',
  borderColor: '#F1F5F9',
  opacity: 0.6,
},
  slotCardSelected: {
  borderColor: Colors.brand.emerald,
  backgroundColor: '#ECFDF5',
},
  slotTime: {
  fontSize: 13,
  fontWeight: '700',
  color: Colors.brand.navy,
},
  slotTimeUnavailable: {
  color: '#94A3B8',
},
  slotEquipment: {
  fontSize: 11,
  color: '#64748B',
  maxWidth: '45%',
},
  slotStatusPill: {
  paddingHorizontal: 8,
  paddingVertical: 3,
  borderRadius: 6,
},
  slotStatusAvailable: {
  backgroundColor: '#D1FAE5',
},
  slotStatusBooked: {
  backgroundColor: '#F1F5F9',
},
  slotStatusText: {
  fontSize: 9,
  fontWeight: '800',
  letterSpacing: 0.5,
},
  slotStatusTextAvailable: {
  color: '#065F46',
},
  slotStatusTextBooked: {
  color: '#94A3B8',
},
  noSlotsText: {
  fontSize: 12,
  color: '#64748B',
  textAlign: 'center',
  paddingVertical: 20,
},
  reasonBox: {
  marginTop: 12,
},
  reasonLabel: {
  fontSize: 11,
  fontWeight: '700',
  color: '#475569',
  marginBottom: 4,
},
  reasonInput: {
  backgroundColor: '#F8FAFC',
  borderWidth: 1,
  borderColor: '#CBD5E1',
  borderRadius: 8,
  paddingHorizontal: 10,
  paddingVertical: 8,
  fontSize: 12,
  color: Colors.brand.navy,
},
  safetyGuardBanner: {
  backgroundColor: '#EFF6FF',
  borderRadius: 8,
  padding: 10,
  borderWidth: 1,
  borderColor: '#BFDBFE',
  marginTop: 12,
  marginBottom: 4,
},
  safetyGuardTitle: {
  fontSize: 11,
  fontWeight: '800',
  color: '#1E40AF',
  marginBottom: 2,
},
  safetyGuardText: {
  fontSize: 10,
  color: '#1D4ED8',
  lineHeight: 14,
},
  modalFooter: {
  marginTop: 12,
  paddingTop: 10,
  borderTopWidth: 1,
  borderTopColor: '#F1F5F9',
},
  confirmActionBtn: {
  backgroundColor: Colors.brand.emeraldDark,
  borderRadius: 10,
  paddingVertical: 12,
  alignItems: 'center',
},
  confirmActionBtnText: {
  color: '#FFFFFF',
  fontSize: 13,
  fontWeight: '700',
},
  cancelModalCard: {
  backgroundColor: '#FFFFFF',
  borderRadius: 20,
  padding: 22,
  marginHorizontal: 20,
  alignItems: 'center',
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.15,
  shadowRadius: 10,
  elevation: 5,
  width: '90%',
  alignSelf: 'center',
  marginBottom: 'auto',
  marginTop: 'auto',
},
  cancelWarningIcon: {
  fontSize: 32,
  marginBottom: 8,
},
  cancelModalTitle: {
  fontSize: 17,
  fontWeight: '800',
  color: '#B91C1C',
  marginBottom: 6,
},
  cancelModalSub: {
  fontSize: 12,
  color: '#475569',
  textAlign: 'center',
  marginBottom: 14,
  lineHeight: 17,
},
  cancelReasonBox: {
  width: '100%',
  marginBottom: 10,
},
  cancelReasonLabel: {
  fontSize: 11,
  fontWeight: '700',
  color: '#475569',
  marginBottom: 4,
},
  cancelModalActions: {
  width: '100%',
  gap: 8,
  marginTop: 12,
},
  confirmCancelBtn: {
  backgroundColor: '#DC2626',
  borderRadius: 10,
  paddingVertical: 12,
  alignItems: 'center',
},
  confirmCancelBtnText: {
  color: '#FFFFFF',
  fontSize: 13,
  fontWeight: '700',
},
  dismissCancelBtn: {
  paddingVertical: 8,
  alignItems: 'center',
},
  dismissCancelBtnText: {
  fontSize: 12,
  color: '#64748B',
  fontWeight: '600',
},
  appointmentCardDemo: {
  borderColor: '#FDE68A',
  backgroundColor: '#FFFDF5',
},
  demoWarningBanner: {
  backgroundColor: '#FEF3C7',
  borderRadius: 6,
  paddingHorizontal: 8,
  paddingVertical: 4,
  marginBottom: 8,
},
  demoWarningText: {
  fontSize: 10,
  fontWeight: '800',
  color: '#92400E',
  letterSpacing: 0.5,
},
  demoStatusPill: {
  backgroundColor: '#FEF3C7',
  paddingHorizontal: 8,
  paddingVertical: 2,
  borderRadius: 6,
  borderWidth: 1,
  borderColor: '#FDE68A',
},
  demoStatusText: {
  fontSize: 10,
  fontWeight: '800',
  color: '#B45309',
},
});
