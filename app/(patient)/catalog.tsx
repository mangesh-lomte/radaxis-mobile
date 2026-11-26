import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAvailableSlots, useBookAppointment, useExaminations } from '@/src/hooks/usePatientPortal';
import { isProductionTarget } from '@/src/services/portalService';
import { AvailableExamination, BookingResult, TimeSlot } from '@/src/types/patient';
import { formatCurrency } from '@/src/utils/formatters';
import { Colors } from '@/src/theme/colors';

const MODALITIES = ['ALL', 'CT', 'MRI', 'XRAY', 'ULTRASOUND'];

export default function ExamCatalogScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [selectedModality, setSelectedModality] = useState<string>('ALL');
  const [selectedExam, setSelectedExam] = useState<AvailableExamination | null>(null);

  // Default to tomorrow's date for slot browsing
  const tomorrowDate = new Date();
  tomorrowDate.setDate(tomorrowDate.getDate() + 1);
  const defaultDateStr = tomorrowDate.toISOString().slice(0, 10);
  const [selectedDate, setSelectedDate] = useState<string>(defaultDateStr);

  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [clinicalNotes, setClinicalNotes] = useState<string>('');
  const [reviewModalVisible, setReviewModalVisible] = useState<boolean>(false);
  const [bookingSuccessResult, setBookingSuccessResult] = useState<BookingResult | null>(null);

  // Queries & Mutations
  const { data: examinations, isLoading: loadingExams, isError: examError, refetch: refetchExams } = useExaminations(
    selectedModality === 'ALL' ? undefined : selectedModality
  );

  const activeModalityForSlots = selectedExam?.modality || 'CT';
  const { data: slotsData, isLoading: loadingSlots, refetch: refetchSlots } = useAvailableSlots(
    activeModalityForSlots,
    selectedDate
  );

  const bookMutation = useBookAppointment();

  const isProduction = isProductionTarget();

  const dateOptions = [0, 1, 2, 3].map((offset) => {
    const d = new Date();
    d.setDate(d.getDate() + offset);
    return {
      iso: d.toISOString().slice(0, 10),
      label:
        offset === 0
          ? 'Today'
          : offset === 1
          ? 'Tomorrow'
          : d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
    };
  });

  const handleSelectSlot = (slot: TimeSlot) => {
    if (!slot.isAvailable) {
      Alert.alert('Slot Unavailable', 'This time slot is already booked. Please choose another available slot.');
      return;
    }
    setSelectedSlot(slot);
    setReviewModalVisible(true);
  };

  const handleConfirmBooking = async () => {
    if (!selectedExam || !selectedSlot) return;

    try {
      const result = await bookMutation.mutateAsync({
        payload: {
          examDefinitionId: selectedExam.id,
          scheduledStart: selectedSlot.startTime,
          equipmentId: selectedSlot.equipmentId,
          clinicalNotes: clinicalNotes.trim() || undefined,
          priority: 'ROUTINE',
        },
        examDetails: selectedExam,
        equipmentName: selectedSlot.equipmentName,
      });

      setReviewModalVisible(false);
      setBookingSuccessResult(result);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unable to confirm booking. Please try again.';
      Alert.alert('Booking Notice', msg);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header with Back button */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Examination Catalog</Text>
        <View style={{ width: 60 }} />
      </View>

      {/* Modality Chips */}
      <View style={styles.modalityFilterRow}>
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
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.introBanner}>
          <Text style={styles.introTitle}>Radiology Examination & Slot Finder</Text>
          <Text style={styles.introSub}>
            Select an examination to view available equipment schedules, preparation guidelines, and book an appointment.
          </Text>
        </View>

        {loadingExams ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={Colors.brand.emerald} />
            <Text style={styles.loadingText}>Loading examination catalog...</Text>
          </View>
        ) : examError ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorTitle}>Unable to Load Examinations</Text>
            <TouchableOpacity style={styles.retryBtn} onPress={() => refetchExams()}>
              <Text style={styles.retryBtnText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : examinations && examinations.length > 0 ? (
          examinations.map((exam) => (
            <View key={exam.id || exam.code} style={styles.examCard}>
              <View style={styles.cardTopRow}>
                <View style={styles.codePill}>
                  <Text style={styles.codeText}>{exam.code}</Text>
                </View>
                <View style={styles.modalityBadge}>
                  <Text style={styles.modalityText}>{exam.modality}</Text>
                </View>
              </View>

              <Text style={styles.examName}>{exam.name}</Text>

              <View style={styles.metaRow}>
                <Text style={styles.metaItem}>Duration: ~{exam.defaultDurationMinutes || 30} mins</Text>
                <Text style={styles.bullet}>•</Text>
                <Text style={styles.metaItem}>Body Part: {exam.bodyPart || 'Standard'}</Text>
              </View>

              <View style={styles.priceRow}>
                <Text style={styles.priceLabel}>Estimated Fee:</Text>
                <Text style={styles.priceValue}>{formatCurrency(exam.estimatedFee)}</Text>
                {exam.advanceDepositRequired > 0 && (
                  <Text style={styles.depositLabel}>(Deposit: {formatCurrency(exam.advanceDepositRequired)})</Text>
                )}
              </View>

              {exam.preparation?.instructions && (
                <View style={styles.prepBox}>
                  <Text style={styles.prepLabel}>Preparation:</Text>
                  <Text style={styles.prepInstructions}>{exam.preparation.instructions}</Text>
                </View>
              )}

              <TouchableOpacity
                style={styles.checkSlotsBtn}
                onPress={() => setSelectedExam(exam)}
                activeOpacity={0.8}
              >
                <Text style={styles.checkSlotsBtnText}>Select & Check Available Slots →</Text>
              </TouchableOpacity>
            </View>
          ))
        ) : (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>No Examinations Found</Text>
            <Text style={styles.emptySub}>No imaging procedures match the selected modality.</Text>
          </View>
        )}
      </ScrollView>

      {/* Step 1: Available Slots Modal */}
      <Modal visible={!!selectedExam && !reviewModalVisible && !bookingSuccessResult} transparent animationType="slide" onRequestClose={() => setSelectedExam(null)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalSubhead}>{selectedExam?.modality} • Step 1: Choose Slot</Text>
                <Text style={styles.modalTitle} numberOfLines={2}>
                  {selectedExam?.name}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setSelectedExam(null)} style={styles.modalCloseBtn}>
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* Date Selector Row */}
            <View style={styles.dateSelectorRow}>
              {dateOptions.map((item) => (
                <TouchableOpacity
                  key={item.iso}
                  style={[styles.dateChip, selectedDate === item.iso && styles.dateChipActive]}
                  onPress={() => setSelectedDate(item.iso)}
                >
                  <Text style={[styles.dateChipText, selectedDate === item.iso && styles.dateChipTextActive]}>
                    {item.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Slots List */}
            <ScrollView style={styles.slotsScroll}>
              <View style={styles.slotsMetaBar}>
                <Text style={styles.slotsMetaText}>
                  {slotsData?.availableSlotsCount || 0} slots available on {selectedDate}
                </Text>
                {loadingSlots && <ActivityIndicator size="small" color={Colors.brand.emerald} />}
              </View>

              {loadingSlots ? (
                <View style={styles.centered}>
                  <ActivityIndicator color={Colors.brand.emerald} />
                  <Text style={styles.loadingText}>Querying equipment schedule...</Text>
                </View>
              ) : slotsData?.slots && slotsData.slots.length > 0 ? (
                <View style={styles.slotsGrid}>
                  {slotsData.slots.map((slot, index) => (
                    <TouchableOpacity
                      key={`${slot.equipmentId}-${slot.startTime}-${index}`}
                      style={[
                        styles.slotCard,
                        !slot.isAvailable && styles.slotCardUnavailable,
                        selectedSlot?.startTime === slot.startTime && styles.slotCardSelected,
                      ]}
                      onPress={() => handleSelectSlot(slot)}
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
                <View style={styles.emptyCard}>
                  <Text style={styles.emptyTitle}>No Slots for this Date</Text>
                  <Text style={styles.emptySub}>Please choose another date or modality.</Text>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Step 2: Review Booking Details Modal */}
      <Modal visible={reviewModalVisible} transparent animationType="slide" onRequestClose={() => setReviewModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalSubhead}>Step 2: Review & Confirm</Text>
                <Text style={styles.modalTitle}>Appointment Summary</Text>
              </View>
              <TouchableOpacity onPress={() => setReviewModalVisible(false)} style={styles.modalCloseBtn}>
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              {/* Exam summary card */}
              <View style={styles.summaryBox}>
                <Text style={styles.summaryExamTitle}>{selectedExam?.name}</Text>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Modality:</Text>
                  <Text style={styles.summaryValueBold}>{selectedExam?.modality}</Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Scheduled Time:</Text>
                  <Text style={styles.summaryValueBold}>
                    {selectedSlot?.displayTime} on {selectedDate}
                  </Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Equipment:</Text>
                  <Text style={styles.summaryValueBold}>{selectedSlot?.equipmentName}</Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Estimated Fee:</Text>
                  <Text style={styles.summaryValueGreen}>₹{selectedExam?.estimatedFee || 0}</Text>
                </View>
              </View>

              {/* Preparation instructions */}
              {selectedExam?.preparation?.instructions && (
                <View style={styles.prepNoticeBox}>
                  <Text style={styles.prepNoticeTitle}>⚠️ Preparation Instructions</Text>
                  <Text style={styles.prepNoticeBody}>{selectedExam.preparation.instructions}</Text>
                </View>
              )}

              {/* Clinical Notes Input */}
              <View style={styles.notesInputContainer}>
                <Text style={styles.notesInputLabel}>Clinical Notes / Symptoms (Optional):</Text>
                <TextInput
                  style={styles.notesInputField}
                  value={clinicalNotes}
                  onChangeText={setClinicalNotes}
                  placeholder="e.g. Chronic chest discomfort, referral from Dr. Smith"
                  multiline
                  numberOfLines={2}
                />
              </View>
            </ScrollView>

            <View style={[styles.modalFooter, { paddingBottom: Math.max(insets.bottom, 16) }]}>
              <TouchableOpacity
                style={[styles.confirmBookingBtn, bookMutation.isPending && { opacity: 0.6 }]}
                onPress={handleConfirmBooking}
                disabled={bookMutation.isPending}
                activeOpacity={0.8}
              >
                {bookMutation.isPending ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.confirmBookingBtnText}>Confirm & Book Appointment</Text>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.cancelReviewBtn}
                onPress={() => setReviewModalVisible(false)}
                disabled={bookMutation.isPending}
              >
                <Text style={styles.cancelReviewBtnText}>Cancel & Choose Different Slot</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Step 3: Booking Success Modal */}
      <Modal visible={!!bookingSuccessResult} transparent animationType="fade" onRequestClose={() => setBookingSuccessResult(null)}>
        <View style={styles.modalOverlay}>
          <View style={styles.successModalCard}>
            <View style={styles.successCheckCircle}>
              <Text style={styles.successCheckGlyph}>✓</Text>
            </View>

            <Text style={styles.successTitle}>Appointment Booked!</Text>
            <Text style={styles.successSubtitle}>
              Your imaging procedure has been scheduled successfully.
            </Text>

            <View style={styles.successDetailsBox}>
              <View style={styles.successRow}>
                <Text style={styles.successLabel}>Appointment #:</Text>
                <Text style={styles.successValueBold}>
                  {bookingSuccessResult?.appointment?.appointmentNumber}
                </Text>
              </View>
              <View style={styles.successRow}>
                <Text style={styles.successLabel}>Accession #:</Text>
                <Text style={styles.successValueBold}>{bookingSuccessResult?.accessionNumber}</Text>
              </View>
              <View style={styles.successRow}>
                <Text style={styles.successLabel}>Examination:</Text>
                <Text style={styles.successValue}>{bookingSuccessResult?.appointment?.examination}</Text>
              </View>
              <View style={styles.successRow}>
                <Text style={styles.successLabel}>Scheduled Time:</Text>
                <Text style={styles.successValue}>
                  {bookingSuccessResult?.appointment?.scheduledStart
                    ? new Date(bookingSuccessResult.appointment.scheduledStart).toLocaleDateString('en-US', {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      }) +
                      ' at ' +
                      new Date(bookingSuccessResult.appointment.scheduledStart).toLocaleTimeString('en-US', {
                        hour: 'numeric',
                        minute: '2-digit',
                      })
                    : ''}
                </Text>
              </View>
              <View style={styles.successRow}>
                <Text style={styles.successLabel}>Status:</Text>
                <Text style={styles.successValueGreen}>CONFIRMED</Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.goToAppointmentsBtn}
              onPress={() => {
                setBookingSuccessResult(null);
                setSelectedExam(null);
                setSelectedSlot(null);
                router.replace('/(patient)/(tabs)/appointments');
              }}
            >
              <Text style={styles.goToAppointmentsBtnText}>View in My Appointments →</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.bookAnotherBtn}
              onPress={() => {
                setBookingSuccessResult(null);
                setSelectedExam(null);
                setSelectedSlot(null);
              }}
            >
              <Text style={styles.bookAnotherBtnText}>Book Another Examination</Text>
            </TouchableOpacity>
          </View>
        </View>
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
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.brand.navy,
  },
  modalityFilterRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  modalityChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
  },
  modalityChipActive: {
    backgroundColor: Colors.brand.navy,
  },
  modalityChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
  },
  modalityChipTextActive: {
    color: '#FFFFFF',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 32,
  },
  introBanner: {
    backgroundColor: '#E0F2FE',
    borderRadius: 12,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#BAE6FD',
  },
  introTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0369A1',
    marginBottom: 3,
  },
  introSub: {
    fontSize: 11,
    color: '#0284C7',
    lineHeight: 16,
  },
  examCard: {
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
  codePill: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  codeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#475569',
    fontFamily: 'SpaceMono',
  },
  modalityBadge: {
    backgroundColor: '#E0F2FE',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  modalityText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#0369A1',
  },
  examName: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.brand.navy,
    marginBottom: 6,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  metaItem: {
    fontSize: 11,
    color: '#64748B',
  },
  bullet: {
    marginHorizontal: 6,
    color: '#CBD5E1',
    fontSize: 10,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  priceLabel: {
    fontSize: 11,
    color: '#64748B',
    marginRight: 4,
  },
  priceValue: {
    fontSize: 13,
    fontWeight: '800',
    color: Colors.brand.emeraldDark,
  },
  depositLabel: {
    fontSize: 11,
    color: '#94A3B8',
    marginLeft: 6,
  },
  prepBox: {
    backgroundColor: '#FFFBEB',
    borderRadius: 8,
    padding: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  prepLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#92400E',
    marginBottom: 2,
  },
  prepInstructions: {
    fontSize: 11,
    color: '#B45309',
    lineHeight: 15,
  },
  checkSlotsBtn: {
    backgroundColor: '#0F172A',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  checkSlotsBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  centered: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 8,
  },
  errorBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
  },
  errorTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#B91C1C',
    marginBottom: 8,
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
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.brand.navy,
  },
  emptySub: {
    fontSize: 12,
    color: '#64748B',
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
    maxHeight: 340,
  },
  slotsMetaBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  slotsMetaText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
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
  modalBody: {
    maxHeight: 380,
    marginBottom: 12,
  },
  summaryBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 12,
  },
  summaryExamTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: Colors.brand.navy,
    marginBottom: 8,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  summaryLabel: {
    fontSize: 12,
    color: '#64748B',
  },
  summaryValueBold: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.brand.navy,
  },
  summaryValueGreen: {
    fontSize: 13,
    fontWeight: '800',
    color: Colors.brand.emeraldDark,
  },
  prepNoticeBox: {
    backgroundColor: '#FFFBEB',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#FDE68A',
    marginBottom: 12,
  },
  prepNoticeTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#92400E',
    marginBottom: 4,
  },
  prepNoticeBody: {
    fontSize: 11,
    color: '#B45309',
    lineHeight: 16,
  },
  notesInputContainer: {
    marginBottom: 12,
  },
  notesInputLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
    marginBottom: 6,
  },
  notesInputField: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    paddingHorizontal: 12,
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
    marginBottom: 8,
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
    marginTop: 8,
    gap: 8,
  },
  confirmBookingBtn: {
    backgroundColor: Colors.brand.emeraldDark,
    borderRadius: 10,
    paddingVertical: 13,
    alignItems: 'center',
  },
  confirmBookingBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  cancelReviewBtn: {
    paddingVertical: 8,
    alignItems: 'center',
  },
  cancelReviewBtnText: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
  },
  successModalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    marginHorizontal: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 5,
  },
  successCheckCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.brand.emerald,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  successCheckGlyph: {
    fontSize: 28,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  successTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.brand.navy,
    marginBottom: 4,
  },
  successSubtitle: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 16,
  },
  successDetailsBox: {
    width: '100%',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 14,
  },
  successRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  successLabel: {
    fontSize: 11,
    color: '#64748B',
  },
  successValue: {
    fontSize: 11,
    color: '#334155',
    maxWidth: '60%',
    textAlign: 'right',
  },
  successValueBold: {
    fontSize: 11,
    fontWeight: '800',
    color: Colors.brand.navy,
  },
  successValueGreen: {
    fontSize: 11,
    fontWeight: '800',
    color: Colors.brand.emeraldDark,
  },
  successValueAmber: {
    fontSize: 11,
    fontWeight: '800',
    color: '#D97706',
  },
  demoModePill: {
    backgroundColor: '#E0F2FE',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    marginBottom: 16,
  },
  demoModePillText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#0369A1',
  },
  goToAppointmentsBtn: {
    width: '100%',
    backgroundColor: Colors.brand.navy,
    borderRadius: 10,
    paddingVertical: 13,
    alignItems: 'center',
    marginBottom: 8,
  },
  goToAppointmentsBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  bookAnotherBtn: {
    paddingVertical: 8,
  },
  bookAnotherBtnText: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
  },
});
