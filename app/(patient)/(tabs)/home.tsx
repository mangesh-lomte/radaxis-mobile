import React from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { usePatientAuth } from '@/src/auth/PatientAuthContext';
import { usePatientAppointments, usePatientReports } from '@/src/hooks/usePatientPortal';
import { portalService } from '@/src/services/portalService';
import { StatusBadge } from '@/src/components/ui/StatusBadge';
import { Colors } from '@/src/theme/colors';

export default function PatientHomeScreen() {
  const router = useRouter();
  const { patient, patientToken, patientLogout } = usePatientAuth();
  const {
    data: appointments,
    isLoading: loadingAppointments,
    refetch: refetchAppointments,
    isRefetching: refetchingAppointments,
  } = usePatientAppointments();

  const {
    data: reports,
    isLoading: loadingReports,
    refetch: refetchReports,
    isRefetching: refetchingReports,
  } = usePatientReports();

  const isRefreshing = refetchingAppointments || refetchingReports;

  const onRefresh = () => {
    refetchAppointments();
    refetchReports();
  };

  // Find most relevant upcoming appointment
  const upcomingAppointment = appointments?.find(
    (a) => a.status !== 'CANCELLED' && a.status !== 'COMPLETED'
  ) || appointments?.[0];

  // Find latest finalized report
  const latestReport = reports?.[0];

  const handleLaunchOhif = async (accessionNumber: string) => {
    try {
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
      const msg = err instanceof Error ? err.message : 'Unable to launch OHIF viewer.';
      Alert.alert('Imaging Viewer Notice', msg);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor={Colors.brand.emerald} />
        }
      >
        {/* Top Header Row */}
        <View style={styles.topHeader}>
          <View style={styles.topHeaderLeft}>
            <Image
              source={require('@/assets/images/radaxis-logo.png')}
              style={styles.patientBrandLogo}
              resizeMode="contain"
              accessibilityLabel="RadAxis Official Logo"
            />
            <View style={styles.topHeaderInfo}>
              <Text style={styles.greetingText}>RadAxis Patient Portal</Text>
              <Text style={styles.patientNameText} numberOfLines={1}>
                {patient?.firstName} {patient?.lastName}
              </Text>
            </View>
          </View>
          <View style={styles.mrnBadge}>
            <Text style={styles.mrnLabel}>MRN</Text>
            <Text style={styles.mrnValue}>{patient?.patientId || 'PAT-0000'}</Text>
          </View>
        </View>

        {/* Patient Care Card */}
        <View style={styles.careCard}>
          <View style={styles.careCardHeader}>
            <View style={styles.avatarCircle}>
              <Text style={styles.avatarText}>
                {patient?.firstName?.[0] || 'P'}
                {patient?.lastName?.[0] || 'T'}
              </Text>
            </View>
            <View style={styles.careCardInfo}>
              <Text style={styles.careCardTitle}>Digital Health Card</Text>
              <Text style={styles.careCardSub}>RadAxis Verified Patient</Text>
            </View>
            <View style={styles.activePill}>
              <View style={styles.activeDot} />
              <Text style={styles.activePillText}>ACTIVE</Text>
            </View>
          </View>

          <View style={styles.careDivider} />

          <View style={styles.demographicsGrid}>
            <View style={styles.demoItem}>
              <Text style={styles.demoLabel}>DATE OF BIRTH</Text>
              <Text style={styles.demoValue}>
                {patient?.dateOfBirth ? patient.dateOfBirth.slice(0, 10) : '—'}
              </Text>
            </View>
            <View style={styles.demoItem}>
              <Text style={styles.demoLabel}>GENDER</Text>
              <Text style={styles.demoValue}>{patient?.gender || '—'}</Text>
            </View>
            <View style={styles.demoItem}>
              <Text style={styles.demoLabel}>PHONE</Text>
              <Text style={styles.demoValue}>{patient?.phone || '—'}</Text>
            </View>
          </View>
        </View>

        {/* Quick Action Buttons */}
        <View style={styles.quickActionsRow}>
          <TouchableOpacity
            style={styles.actionBtnPrimary}
            onPress={() => router.push('/(patient)/catalog')}
            activeOpacity={0.8}
          >
            <Text style={styles.actionBtnTitle}>Browse Exams & Slots</Text>
            <Text style={styles.actionBtnSub}>View modalities & timings</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionBtnSecondary}
            onPress={() => router.push('/(patient)/(tabs)/appointments')}
            activeOpacity={0.8}
          >
            <Text style={styles.actionBtnTitle}>My Appointments</Text>
            <Text style={styles.actionBtnSub}>
              {appointments?.length || 0} scheduled
            </Text>
          </TouchableOpacity>
        </View>

        {/* Upcoming Appointment Section */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>UPCOMING APPOINTMENT</Text>
            {upcomingAppointment && (
              <TouchableOpacity onPress={() => router.push('/(patient)/(tabs)/appointments')}>
                <Text style={styles.viewAllText}>View All</Text>
              </TouchableOpacity>
            )}
          </View>

          {loadingAppointments ? (
            <View style={styles.loadingCard}>
              <ActivityIndicator color={Colors.brand.emerald} />
              <Text style={styles.loadingText}>Loading appointment details...</Text>
            </View>
          ) : upcomingAppointment ? (
            <View style={styles.appointmentCard}>
              <View style={styles.cardTopRow}>
                <View style={styles.modalityBadge}>
                  <Text style={styles.modalityText}>{upcomingAppointment.modality}</Text>
                </View>
                <StatusBadge status={upcomingAppointment.status} />
              </View>

              <Text style={styles.examTitle}>{upcomingAppointment.examination}</Text>

              <View style={styles.infoRow}>
                <Text style={styles.infoText}>
                  {new Date(upcomingAppointment.scheduledStart).toLocaleDateString('en-US', {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}{' '}
                  at{' '}
                  {new Date(upcomingAppointment.scheduledStart).toLocaleTimeString('en-US', {
                    hour: 'numeric',
                    minute: '2-digit',
                  })}
                </Text>
              </View>

              {upcomingAppointment.equipmentName && (
                <View style={styles.infoRow}>
                  <Text style={styles.infoText}>{upcomingAppointment.equipmentName}</Text>
                </View>
              )}

              {upcomingAppointment.notesData?.raw && (
                <View style={styles.prepNoticeBox}>
                  <Text style={styles.prepNoticeTitle}>Preparation Instruction:</Text>
                  <Text style={styles.prepNoticeText}>{upcomingAppointment.notesData.raw}</Text>
                </View>
              )}

              <TouchableOpacity
                style={styles.detailsBtn}
                onPress={() => router.push('/(patient)/(tabs)/appointments')}
                activeOpacity={0.7}
              >
                <Text style={styles.detailsBtnText}>View Full Appointment Details →</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyTitle}>No Upcoming Appointments</Text>
              <Text style={styles.emptySub}>
                You have no active imaging examinations scheduled.
              </Text>
              <TouchableOpacity
                style={styles.bookNowBtn}
                onPress={() => router.push('/(patient)/catalog')}
              >
                <Text style={styles.bookNowBtnText}>Browse Available Slots</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Latest Diagnostic Report Section */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>LATEST RADIOLOGY REPORT</Text>
            {latestReport && (
              <TouchableOpacity onPress={() => router.push('/(patient)/(tabs)/reports')}>
                <Text style={styles.viewAllText}>View All</Text>
              </TouchableOpacity>
            )}
          </View>

          {loadingReports ? (
            <View style={styles.loadingCard}>
              <ActivityIndicator color={Colors.brand.emerald} />
              <Text style={styles.loadingText}>Checking clinical report status...</Text>
            </View>
          ) : latestReport ? (
            <View style={styles.reportCard}>
              <View style={styles.cardTopRow}>
                <View style={styles.accessionBadge}>
                  <Text style={styles.accessionText}>{latestReport.accessionNumber}</Text>
                </View>
                <View style={styles.verifiedBadge}>
                  <Text style={styles.verifiedText}>FINAL VERIFIED</Text>
                </View>
              </View>

              <Text style={styles.reportExamTitle}>{latestReport.examinationName}</Text>

              <Text style={styles.reportSignerText}>
                Reporting Radiologist: <Text style={styles.boldDark}>Dr. {latestReport.signedBy}</Text>
              </Text>

              <Text style={styles.reportDateText}>
                Verified:{' '}
                {latestReport.finalizedAt
                  ? new Date(latestReport.finalizedAt).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })
                  : 'On file'}
              </Text>

              <View style={styles.reportActionsRow}>
                <TouchableOpacity
                  style={styles.reportActionBtn}
                  onPress={() => router.push('/(patient)/(tabs)/reports')}
                >
                  <Text style={styles.reportActionText}>View Report & PDF</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.reportActionBtn, styles.reportActionDicom]}
                  onPress={() => handleLaunchOhif(latestReport.accessionNumber)}
                >
                  <Text style={[styles.reportActionText, styles.reportActionDicomText]}>
                    Open OHIF Viewer
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyTitle}>No Diagnostic Reports Ready</Text>
              <Text style={styles.emptySub}>
                Reports are published automatically once finalized and signed by the radiologist.
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 32,
  },
  topHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  topHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 10,
    minWidth: 0,
  },
  patientBrandLogo: {
    width: 36,
    height: 36,
    marginRight: 10,
    flexShrink: 0,
  },
  topHeaderInfo: {
    flex: 1,
    minWidth: 0,
  },
  greetingText: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '500',
  },
  patientNameText: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.brand.navy,
    letterSpacing: -0.5,
  },
  mrnBadge: {
    backgroundColor: '#E0F2FE',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    alignItems: 'flex-end',
    borderWidth: 1,
    borderColor: '#BAE6FD',
  },
  mrnLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: '#0369A1',
    letterSpacing: 0.5,
  },
  mrnValue: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0369A1',
  },
  careCard: {
    backgroundColor: '#0F172A',
    borderRadius: 16,
    padding: 18,
    marginBottom: 18,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 4,
  },
  careCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: Colors.brand.emerald,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: {
    color: '#0F172A',
    fontSize: 16,
    fontWeight: '800',
  },
  careCardInfo: {
    flex: 1,
  },
  careCardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  careCardSub: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 1,
  },
  activePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  activeDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: Colors.brand.emerald,
    marginRight: 5,
  },
  activePillText: {
    fontSize: 9,
    fontWeight: '800',
    color: Colors.brand.emerald,
    letterSpacing: 0.5,
  },
  careDivider: {
    height: 1,
    backgroundColor: '#334155',
    marginVertical: 14,
  },
  demographicsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  demoItem: {
    flex: 1,
  },
  demoLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: '#94A3B8',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  demoValue: {
    fontSize: 12,
    fontWeight: '600',
    color: '#F8FAFC',
  },
  quickActionsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  actionBtnPrimary: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  actionBtnSecondary: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  actionBtnIcon: {
    fontSize: 22,
    marginBottom: 6,
  },
  actionBtnTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.brand.navy,
  },
  actionBtnSub: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  sectionContainer: {
    marginBottom: 22,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.8,
  },
  viewAllText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.brand.emeraldDark,
  },
  appointmentCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
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
  modalityBadge: {
    backgroundColor: '#E0F2FE',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  modalityText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#0369A1',
  },
  examTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.brand.navy,
    marginBottom: 10,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  infoIcon: {
    fontSize: 13,
    marginRight: 6,
  },
  infoText: {
    fontSize: 12,
    color: '#475569',
    fontWeight: '500',
  },
  prepNoticeBox: {
    backgroundColor: '#FFFBEB',
    borderRadius: 8,
    padding: 10,
    marginTop: 8,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  prepNoticeTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#92400E',
    marginBottom: 2,
  },
  prepNoticeText: {
    fontSize: 11,
    color: '#B45309',
    lineHeight: 16,
  },
  detailsBtn: {
    paddingVertical: 8,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    marginTop: 4,
  },
  detailsBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.brand.emeraldDark,
  },
  reportCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
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
  verifiedBadge: {
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  verifiedText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#065F46',
  },
  reportExamTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.brand.navy,
    marginBottom: 6,
  },
  reportSignerText: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 2,
  },
  boldDark: {
    color: Colors.brand.navy,
    fontWeight: '600',
  },
  reportDateText: {
    fontSize: 11,
    color: '#94A3B8',
    marginBottom: 12,
  },
  reportActionsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  reportActionBtn: {
    flex: 1,
    backgroundColor: '#F1F5F9',
    borderRadius: 8,
    paddingVertical: 9,
    alignItems: 'center',
  },
  reportActionText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
  },
  reportActionDicom: {
    backgroundColor: '#0F172A',
  },
  reportActionDicomText: {
    color: '#FFFFFF',
  },
  loadingCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  loadingText: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 8,
  },
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },

  emptyTitle: {
  fontSize: 14,
  fontWeight: '700',
  color: Colors.brand.navy,
},
  emptySub: {
  fontSize: 12,
  color: '#64748B',
  textAlign: 'center',
  marginTop: 4,
  marginBottom: 12,
},
  bookNowBtn: {
  backgroundColor: Colors.brand.navy,
  paddingHorizontal: 16,
  paddingVertical: 8,
  borderRadius: 8,
},
  bookNowBtnText: {
  color: '#FFFFFF',
  fontSize: 12,
  fontWeight: '700',
},
});
