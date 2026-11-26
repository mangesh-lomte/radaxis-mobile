import React, { useState } from 'react';
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
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAppointments, useSlotAvailability } from '@/src/hooks/useReception';
import { StaffAppointmentItem } from '@/src/types/reception';
import { ModalityType, Priority } from '@/src/types';
import { formatDate } from '@/src/utils/formatters';
import { Colors } from '@/src/theme/colors';
import { ModuleIcon } from '@/src/components/ui/ModuleIcon';

const MODALITIES: ModalityType[] = ['CT', 'MRI', 'XRAY', 'ULTRASOUND', 'MAMMOGRAPHY'];

export default function SchedulingScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ date?: string; search?: string; patientId?: string }>();
  const todayDateStr = new Date().toISOString().split('T')[0];

  // Date state: Defaults to today or parameter passed from Patient Jacket
  const [selectedDate, setSelectedDate] = useState<string>(params.date || todayDateStr);
  const [selectedModality, setSelectedModality] = useState<ModalityType>('CT');
  const [viewMode, setViewMode] = useState<'APPOINTMENTS' | 'SLOTS'>('APPOINTMENTS');
  const [searchQuery, setSearchQuery] = useState<string>(params.search || params.patientId || '');
  const [selectedAppt, setSelectedAppt] = useState<StaffAppointmentItem | null>(null);

  // Queries
  const {
    data: appointmentsData,
    isLoading: loadingAppts,
    isError: apptsError,
    error: apptsErrObj,
    refetch: refetchAppts,
    isRefetching: refetchingAppts,
  } = useAppointments({
    date: selectedDate,
    modality: selectedModality,
    pageSize: 50,
  });

  const {
    data: availabilityData,
    isLoading: loadingSlots,
    refetch: refetchSlots,
    isRefetching: refetchingSlots,
  } = useSlotAvailability({
    modality: selectedModality,
    date: selectedDate,
  });

  const isRefreshing = refetchingAppts || refetchingSlots;
  const handleRefresh = () => {
    refetchAppts();
    refetchSlots();
  };

  const appointments = appointmentsData?.items || [];
  const slots = availabilityData?.slots || [];

  const filteredAppointments = appointments.filter((appt) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      appt.appointmentNumber.toLowerCase().includes(q) ||
      appt.patient?.firstName.toLowerCase().includes(q) ||
      appt.patient?.lastName.toLowerCase().includes(q) ||
      appt.patient?.patientId.toLowerCase().includes(q) ||
      appt.imagingOrder?.accessionNumber.toLowerCase().includes(q) ||
      appt.examination.toLowerCase().includes(q) ||
      appt.imagingOrder?.referringDoctor?.name.toLowerCase().includes(q)
    );
  });

  const getPriorityBadgeStyle = (priority: Priority) => {
    switch (priority) {
      case 'STAT':
        return { bg: '#FEE2E2', text: '#DC2626', border: '#FCA5A5' };
      case 'URGENT':
        return { bg: '#FEF3C7', text: '#B45309', border: '#FDE68A' };
      default:
        return { bg: '#F1F5F9', text: '#475569', border: '#E2E8F0' };
    }
  };

  const getStatusBadgeStyle = (status: string) => {
    switch (status) {
      case 'CHECKED_IN':
        return { bg: '#D1FAE5', text: '#065F46', border: '#A7F3D0' };
      case 'SCHEDULED':
      case 'CONFIRMED':
        return { bg: '#EFF6FF', text: '#1D4ED8', border: '#BFDBFE' };
      case 'COMPLETED':
        return { bg: '#ECFDF5', text: '#047857', border: '#6EE7B7' };
      case 'CANCELLED':
      case 'NO_SHOW':
        return { bg: '#FEF2F2', text: '#991B1B', border: '#FECACA' };
      default:
        return { bg: '#F8FAFC', text: '#64748B', border: '#E2E8F0' };
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
            <ModuleIcon name="scheduling" size={16} containerSize={28} style={{ marginRight: 6 }} />
            <Text style={styles.headerTitle}>Scheduling & Calendar</Text>
          </View>
          <Text style={styles.headerSubtitle}>
            Modality Schedules, Machine Availability & Slots
          </Text>
        </View>
        <View style={{ width: 60 }} />
      </View>

      {/* Date Bar */}
      <View style={styles.dateBar}>
        <Text style={styles.dateLabel}>Date:</Text>
        <TouchableOpacity
          style={[
            styles.dateChip,
            selectedDate === todayDateStr && styles.dateChipActive,
          ]}
          onPress={() => setSelectedDate(todayDateStr)}
          activeOpacity={0.8}
        >
          <Text
            style={[
              styles.dateChipText,
              selectedDate === todayDateStr && styles.dateChipTextActive,
            ]}
          >
            Today (Live)
          </Text>
        </TouchableOpacity>
        {selectedDate !== todayDateStr && (
          <View style={[styles.dateChip, styles.dateChipActive]}>
            <Text style={[styles.dateChipText, styles.dateChipTextActive]}>
              {selectedDate}
            </Text>
          </View>
        )}
      </View>

      {/* Modality Selector Bar */}
      <View style={styles.modalityBar}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.modalityScroll}>
          {MODALITIES.map((mod) => (
            <TouchableOpacity
              key={mod}
              style={[styles.modalityChip, selectedModality === mod && styles.modalityChipActive]}
              onPress={() => setSelectedModality(mod)}
            >
              <Text style={[styles.modalityChipText, selectedModality === mod && styles.modalityChipTextActive]}>
                {mod}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* View Mode Toggle: Bookings vs Slots */}
      <View style={styles.viewModeRow}>
        <TouchableOpacity
          style={[styles.viewModeBtn, viewMode === 'APPOINTMENTS' && styles.viewModeBtnActive]}
          onPress={() => setViewMode('APPOINTMENTS')}
          activeOpacity={0.8}
        >
          <Text style={[styles.viewModeText, viewMode === 'APPOINTMENTS' && styles.viewModeTextActive]}>
            Booked Exams ({appointments.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.viewModeBtn, viewMode === 'SLOTS' && styles.viewModeBtnActive]}
          onPress={() => setViewMode('SLOTS')}
          activeOpacity={0.8}
        >
          <Text style={[styles.viewModeText, viewMode === 'SLOTS' && styles.viewModeTextActive]}>
            Available Slots ({slots.filter((s) => s.available).length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Search Input for Appointments View */}
      {viewMode === 'APPOINTMENTS' && (
        <View style={styles.searchBarContainer}>
          <TextInput
            style={styles.searchInput}
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search patient, accession, or exam..."
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
      )}

      {/* Main List Area */}
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={Colors.brand.emerald}
          />
        }
      >
        {/* VIEW MODE 1: BOOKED APPOINTMENTS */}
        {viewMode === 'APPOINTMENTS' && (
          <>
            {loadingAppts ? (
              <View style={styles.centered}>
                <ActivityIndicator size="large" color={Colors.brand.emerald} />
                <Text style={styles.loadingText}>Fetching scheduled examinations...</Text>
              </View>
            ) : apptsError ? (
              <View style={styles.errorBox}>
                <Text style={styles.errorIcon}>⚠️</Text>
                <Text style={styles.errorTitle}>Unable to Load Schedule</Text>
                <Text style={styles.errorSub}>
                  {apptsErrObj instanceof Error ? apptsErrObj.message : 'Please check connection.'}
                </Text>
              </View>
            ) : filteredAppointments.length > 0 ? (
              filteredAppointments.map((appt) => {
                const statusStyle = getStatusBadgeStyle(appt.status);
                const prioStyle = getPriorityBadgeStyle(appt.priority);
                const startTime = appt.scheduledStart
                  ? new Date(appt.scheduledStart).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                  : '--:--';
                const endTime = appt.scheduledEnd
                  ? new Date(appt.scheduledEnd).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                  : '';

                return (
                  <TouchableOpacity
                    key={appt.id}
                    style={styles.card}
                    onPress={() => setSelectedAppt(appt)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.cardHeaderRow}>
                      <View style={styles.timePill}>
                        <Text style={styles.timePillText}>{startTime} {endTime ? `- ${endTime}` : ''}</Text>
                      </View>
                      <View style={styles.badgesRow}>
                        <View style={[styles.priorityBadge, { backgroundColor: prioStyle.bg, borderColor: prioStyle.border }]}>
                          <Text style={[styles.priorityText, { color: prioStyle.text }]}>{appt.priority}</Text>
                        </View>
                        <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg, borderColor: statusStyle.border }]}>
                          <Text style={[styles.statusText, { color: statusStyle.text }]}>{appt.status}</Text>
                        </View>
                      </View>
                    </View>

                    <Text style={styles.patientName}>
                      {appt.patient?.firstName} {appt.patient?.lastName}
                    </Text>
                    <Text style={styles.patientMeta}>
                      MRN: {appt.patient?.patientId} • Phone: {appt.patient?.phone}
                    </Text>

                    <View style={styles.examBox}>
                      <Text style={styles.examModality}>{appt.modality}</Text>
                      <Text style={styles.examName} numberOfLines={1}>
                        {appt.examination || appt.imagingOrder?.examinationName}
                      </Text>
                    </View>

                    <View style={styles.footerRow}>
                      <Text style={styles.accessionTag}>ACC: {appt.imagingOrder?.accessionNumber}</Text>
                      <Text style={styles.locationTag}>{appt.equipment?.name || appt.location || 'Suite TBA'}</Text>
                    </View>

                    <View style={styles.detailsRow}>
                      <Text style={styles.detailsPrompt}>Tap for full clinical & scheduling details →</Text>
                    </View>
                  </TouchableOpacity>
                );
              })
            ) : (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyTitle}>No Appointments Scheduled</Text>
                <Text style={styles.emptySub}>
                  No booked {selectedModality} appointments found for {selectedDate}.
                </Text>
                {selectedDate !== '2026-11-17' && (
                  <TouchableOpacity
                    style={styles.switchDateBtn}
                    onPress={() => setSelectedDate('2026-11-17')}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.switchDateBtnText}>View November 17, 2026 →</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
          </>
        )}

        {/* VIEW MODE 2: MACHINE SLOT AVAILABILITY */}
        {viewMode === 'SLOTS' && (
          <>
            {loadingSlots ? (
              <View style={styles.centered}>
                <ActivityIndicator size="large" color={Colors.brand.emerald} />
                <Text style={styles.loadingText}>Calculating real-time machine slot availability...</Text>
              </View>
            ) : slots.length > 0 ? (
              <View style={styles.slotsContainer}>
                <Text style={styles.slotsHeader}>
                  Computed Scanner Time Slots ({selectedModality} • {selectedDate})
                </Text>
                {slots.map((slot, idx) => {
                  const startTime = new Date(slot.start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                  const endTime = new Date(slot.end).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

                  return (
                    <View key={idx} style={styles.slotCard}>
                      <View style={styles.slotTimeCol}>
                        <Text style={styles.slotTimeText}>{startTime} - {endTime}</Text>
                        <Text style={styles.slotEquipmentName}>{slot.equipmentName}</Text>
                      </View>
                      <View
                        style={[
                          styles.slotStatusBadge,
                          slot.available ? styles.slotAvailable : styles.slotOccupied,
                        ]}
                      >
                        <Text
                          style={[
                            styles.slotStatusText,
                            slot.available ? styles.slotTextAvailable : styles.slotTextOccupied,
                          ]}
                        >
                          {slot.available ? 'AVAILABLE' : 'RESERVED'}
                        </Text>
                      </View>
                    </View>
                  );
                })}
              </View>
            ) : (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyTitle}>No Machine Slots Computed</Text>
                <Text style={styles.emptySub}>
                  No operational equipment slots available for {selectedModality} on {selectedDate}.
                </Text>
              </View>
            )}
          </>
        )}
      </ScrollView>

      {/* Appointment Detail Modal */}
      <Modal
        visible={!!selectedAppt}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedAppt(null)}
      >
        {selectedAppt ? (
          <View style={styles.modalOverlay}>
            <View style={styles.modalContainer}>
              <View style={styles.modalHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.modalSubhead}>Appointment Record</Text>
                  <Text style={styles.modalTitle}>{selectedAppt.appointmentNumber}</Text>
                </View>
                <TouchableOpacity onPress={() => setSelectedAppt(null)} style={styles.modalCloseBtn}>
                  <Text style={styles.modalCloseText}>✕</Text>
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.modalBody}>
                {/* Patient Demographics */}
                <View style={styles.infoBox}>
                  <Text style={styles.boxTitle}>PATIENT DETAILS</Text>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Full Name:</Text>
                    <Text style={styles.infoValueBold}>
                      {selectedAppt.patient?.firstName} {selectedAppt.patient?.lastName}
                    </Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>MRN / Patient ID:</Text>
                    <Text style={styles.infoValue}>{selectedAppt.patient?.patientId}</Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Date of Birth:</Text>
                    <Text style={styles.infoValue}>
                      {selectedAppt.patient?.dateOfBirth ? formatDate(selectedAppt.patient.dateOfBirth) : 'N/A'}
                    </Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Telephone:</Text>
                    <Text style={styles.infoValue}>{selectedAppt.patient?.phone || 'N/A'}</Text>
                  </View>
                </View>

                {/* Clinical & Examination Details */}
                <View style={styles.infoBox}>
                  <Text style={styles.boxTitle}>EXAMINATION & MODALITY</Text>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Modality:</Text>
                    <Text style={styles.infoValueBold}>{selectedAppt.modality}</Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Procedure:</Text>
                    <Text style={styles.infoValueBold}>{selectedAppt.examination}</Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Accession Reference:</Text>
                    <Text style={styles.infoValue}>{selectedAppt.imagingOrder?.accessionNumber || 'N/A'}</Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Clinical Indication:</Text>
                    <Text style={styles.infoValue}>
                      {selectedAppt.imagingOrder?.clinicalIndication || 'None documented'}
                    </Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>IV Contrast Required:</Text>
                    <Text style={styles.infoValueBold}>
                      {selectedAppt.imagingOrder?.contrastRequired ? 'YES (Check Renal Function)' : 'NO'}
                    </Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Referring Physician:</Text>
                    <Text style={styles.infoValue}>
                      {selectedAppt.imagingOrder?.referringDoctor?.name || 'In-House Imaging'}
                    </Text>
                  </View>
                </View>

                {/* Machine & Schedule */}
                <View style={styles.infoBox}>
                  <Text style={styles.boxTitle}>SCHEDULE & EQUIPMENT</Text>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Scheduled Window:</Text>
                    <Text style={styles.infoValue}>
                      {selectedAppt.scheduledStart ? formatDate(selectedAppt.scheduledStart, { format: 'datetime' }) : 'TBA'}
                    </Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Duration:</Text>
                    <Text style={styles.infoValue}>{selectedAppt.durationMinutes || 30} minutes</Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Scanner Fleet:</Text>
                    <Text style={styles.infoValue}>{selectedAppt.equipment?.name || 'Standard Bay'}</Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Location / Room:</Text>
                    <Text style={styles.infoValue}>{selectedAppt.equipment?.location || selectedAppt.location || 'Floor 1'}</Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Current Status:</Text>
                    <Text style={styles.infoValueBold}>{selectedAppt.status}</Text>
                  </View>
                  {selectedAppt.tokenNumber && (
                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>Assigned Token:</Text>
                      <Text style={styles.infoValueBold}>{selectedAppt.tokenNumber}</Text>
                    </View>
                  )}
                  {selectedAppt.noShowReason && (
                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>No-Show Reason:</Text>
                      <Text style={[styles.infoValue, { color: '#B91C1C' }]}>{selectedAppt.noShowReason}</Text>
                    </View>
                  )}
                  {selectedAppt.cancellationReason && (
                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>Cancellation Reason:</Text>
                      <Text style={[styles.infoValue, { color: '#B91C1C' }]}>{selectedAppt.cancellationReason}</Text>
                    </View>
                  )}
                  {selectedAppt.notes && (
                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>Clinical Notes:</Text>
                      <Text style={styles.infoValue}>{selectedAppt.notes}</Text>
                    </View>
                  )}
                </View>

                <TouchableOpacity
                  style={styles.closeDetailBtn}
                  onPress={() => setSelectedAppt(null)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.closeDetailBtnText}>Close Record</Text>
                </TouchableOpacity>
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
  dateBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#F1F5F9',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  dateLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
    marginRight: 8,
  },
  dateChip: {
    backgroundColor: '#FFFFFF',
    borderColor: '#CBD5E1',
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginRight: 8,
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
  modalityBar: {
    paddingVertical: 8,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  modalityScroll: {
    paddingHorizontal: 14,
    gap: 6,
  },
  modalityChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  modalityChipActive: {
    backgroundColor: Colors.brand.navy,
    borderColor: Colors.brand.navy,
  },
  modalityChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
  },
  modalityChipTextActive: {
    color: '#FFFFFF',
  },
  viewModeRow: {
    flexDirection: 'row',
    marginHorizontal: 14,
    marginTop: 10,
    backgroundColor: '#F1F5F9',
    borderRadius: 10,
    padding: 3,
  },
  viewModeBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8,
  },
  viewModeBtnActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  viewModeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  viewModeTextActive: {
    color: Colors.brand.navy,
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
  scrollContent: {
    paddingHorizontal: 14,
    paddingTop: 10,
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
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  timePill: {
    backgroundColor: '#F1F5F9',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  timePillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#334155',
  },
  badgesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
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
  statusBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
  },
  statusText: {
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
  examBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 6,
    marginBottom: 8,
  },
  examModality: {
    fontSize: 10,
    fontWeight: '800',
    color: Colors.brand.emeraldDark,
    marginRight: 6,
  },
  examName: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 4,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  accessionTag: {
    fontSize: 11,
    fontFamily: 'monospace',
    color: '#475569',
    fontWeight: '600',
  },
  locationTag: {
    fontSize: 11,
    color: '#64748B',
  },
  detailsRow: {
    marginTop: 8,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#F8FAFC',
    alignItems: 'flex-end',
  },
  detailsPrompt: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.brand.emerald,
  },
  slotsContainer: {
    gap: 8,
  },
  slotsHeader: {
    fontSize: 12,
    fontWeight: '800',
    color: '#475569',
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  slotCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  slotTimeCol: {
    flex: 1,
  },
  slotTimeText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  slotEquipmentName: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  slotStatusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  slotAvailable: {
    backgroundColor: '#D1FAE5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  slotOccupied: {
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  slotStatusText: {
    fontSize: 10,
    fontWeight: '800',
  },
  slotTextAvailable: {
    color: '#065F46',
  },
  slotTextOccupied: {
    color: '#64748B',
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
    marginVertical: 10,
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
  lineHeight: 16,
},
  switchDateBtn: {
  marginTop: 14,
  backgroundColor: '#F0FDF4',
  borderColor: '#BBF7D0',
  borderWidth: 1,
  borderRadius: 8,
  paddingVertical: 9,
  paddingHorizontal: 14,
},
  switchDateBtnText: {
  fontSize: 12,
  fontWeight: '700',
  color: '#047857',
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
  maxHeight: '85%',
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
  boxTitle: {
  fontSize: 11,
  fontWeight: '800',
  color: '#475569',
  letterSpacing: 0.5,
  marginBottom: 8,
},
  infoBox: {
  backgroundColor: '#F8FAFC',
  borderRadius: 10,
  borderWidth: 1,
  borderColor: '#E2E8F0',
  padding: 12,
  marginBottom: 12,
},
  infoRow: {
  flexDirection: 'row',
  justifyContent: 'space-between',
  paddingVertical: 4,
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
  closeDetailBtn: {
  backgroundColor: Colors.brand.navy,
  borderRadius: 10,
  paddingVertical: 12,
  alignItems: 'center',
  marginTop: 10,
  marginBottom: 24,
},
  closeDetailBtnText: {
  color: '#FFFFFF',
  fontSize: 13,
  fontWeight: '700',
},
});
