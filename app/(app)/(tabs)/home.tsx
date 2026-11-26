import { useRouter } from 'expo-router';
import React from 'react';
import {
  Image,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/src/auth/AuthContext';
import { useDashboardOverview } from '@/src/hooks/useDashboard';
import { useWorklist } from '@/src/hooks/useWorklist';
import { MetricCard } from '@/src/components/ui/MetricCard';
import { SectionHeader } from '@/src/components/ui/SectionHeader';
import { StudyCard } from '@/src/components/ui/StudyCard';
import { ModuleIcon } from '@/src/components/ui/ModuleIcon';
import { formatDemographics } from '@/src/utils/demographics';
import { Colors } from '@/src/theme/colors';

export default function HomeScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const { data: dashboardData, isLoading, isError: isDashboardError, refetch, isRefetching } = useDashboardOverview();
  const { data: worklistData, refetch: refetchWorklist, isRefetching: isWorklistRefetching } = useWorklist({ pageSize: 10 });

  const liveOrders = worklistData?.items || [];
  const liveStatOrder = liveOrders.find((o) => o.priority === 'STAT');

  // Dynamic metrics derived from authorized RIS backend overview
  const overview = {
    totalBookings: dashboardData?.todayOverview?.totalBookings ?? 0,
    pendingReports: dashboardData?.todayOverview?.pendingReports ?? 0,
    completedScans: dashboardData?.todayOverview?.completedScans ?? 0,
    finalizedReportsToday: dashboardData?.todayOverview?.finalizedReportsToday ?? 0,
  };

  const pipelineFlow = {
    booked: dashboardData?.livePatientStatus?.breakdown?.booked ?? 0,
    arrived: dashboardData?.livePatientStatus?.breakdown?.arrived ?? 0,
    scanning: dashboardData?.livePatientStatus?.breakdown?.scanning ?? 0,
    pacsReady: dashboardData?.livePatientStatus?.breakdown?.delivered ?? 0,
    reporting: dashboardData?.livePatientStatus?.breakdown?.reporting ?? 0,
  };

  const primaryStatStudy = liveStatOrder
    ? {
      accessionNumber: liveStatOrder.accessionNumber,
      patientName: `${liveStatOrder.patient?.firstName || ''} ${liveStatOrder.patient?.lastName || ''}`.trim() || 'Patient',
      procedure: liveStatOrder.examinationName,
      location: [liveStatOrder.patient?.city, liveStatOrder.patient?.state].filter(Boolean).join(', ') || 'Emergency Imaging',
    }
    : null;

  const priorityWeight: Record<string, number> = { STAT: 0, URGENT: 1, ROUTINE: 2 };
  const sortedLiveOrders = [...liveOrders].sort(
    (a, b) => (priorityWeight[a.priority] ?? 2) - (priorityWeight[b.priority] ?? 2)
  );
  const displayLiveOrders = sortedLiveOrders.slice(0, 3);

  const roleName = user?.role || 'STAFF';
  const displayFirstName = user?.firstName || user?.email.split('@')[0] || 'Clinician';
  const clinicianName = roleName === 'RADIOLOGIST' ? `Dr. ${displayFirstName}` : displayFirstName;

  const handleRefresh = () => {
    refetch();
    refetchWorklist();
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isLoading || isRefetching || isWorklistRefetching}
            onRefresh={handleRefresh}
            tintColor={Colors.brand.emerald}
          />
        }
      >
        {/* Clinician Header Bar */}
        <View style={styles.headerBar}>
          <Image
            source={require('@/assets/images/radaxis-logo.png')}
            style={styles.headerBrandLogo}
            resizeMode="contain"
            accessibilityLabel="RadAxis Official Logo"
          />
          <View style={styles.headerInfo}>
            <View style={styles.greetingRow}>
              <Text style={styles.greetingText}>Good morning, {clinicianName}</Text>
              <View style={styles.onlinePulseDot} />
            </View>
            <View style={styles.roleSubRow}>
              <View style={styles.rolePill}>
                <Text style={styles.rolePillText}>{roleName}</Text>
              </View>
              <Text style={styles.roleDot}>•</Text>
              <Text style={styles.shiftText}>RadAxis Clinical Suite</Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.avatarButton}
            onPress={() => router.push('/(app)/(tabs)/more')}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel="View profile"
          >
            <Text style={styles.avatarText}>
              {user?.firstName?.[0] || 'U'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Emergency STAT Broadcast Banner */}
        {primaryStatStudy && (
          <TouchableOpacity
            style={styles.statBanner}
            onPress={() =>
              router.push({
                pathname: '/(app)/study/[id]',
                params: { id: primaryStatStudy.accessionNumber },
              })
            }
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel={`STAT Alert: ${primaryStatStudy.patientName}`}
          >
            <View style={styles.statBannerLeft}>
              <ModuleIcon name="alerts" size={16} containerSize={32} style={{ marginRight: 10 }} />
              <View style={styles.statInfoCol}>
                <View style={styles.statTagRow}>
                  <Text style={styles.statTagText}>CRITICAL FINDING</Text>
                  <Text style={styles.statLocationTag}>
                    • {primaryStatStudy.location}
                  </Text>
                </View>
                <Text style={styles.statPatientText} numberOfLines={1}>
                  {primaryStatStudy.patientName}: {primaryStatStudy.procedure}
                </Text>
              </View>
            </View>
            <Text style={styles.statChevron}>→</Text>
          </TouchableOpacity>
        )}

        {/* 2x2 Metric Grid */}
        <SectionHeader
          title="Today's Overview"
        />
        <View style={styles.metricGrid}>
          <MetricCard
            label="Total Studies"
            value={overview.totalBookings ?? 0}
            subtext="Active in queue"
          />
          <MetricCard
            label="Pending Reports"
            value={overview.pendingReports ?? 0}
            subtext="Awaiting sign-off"
            color="#DC2626"
          />
          <MetricCard
            label="Completed Scans"
            value={overview.completedScans ?? 0}
            subtext="Acquisition finished"
            color="#059669"
          />
          <MetricCard
            label="Final Verified"
            value={overview.finalizedReportsToday ?? 0}
            subtext="Signed & finalized"
          />
        </View>

        {/* Role-Based Operational Shortcuts */}
        {(roleName === 'ADMIN' || roleName === 'TECHNOLOGIST') && (
          <View style={styles.opsShortcutRow}>
            <TouchableOpacity
              style={[styles.opsCard, { backgroundColor: '#F0FDF4', borderColor: '#BBF7D0' }]}
              onPress={() => router.push('/(app)/technologist' as any)}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel="Open Technologist Workspace"
            >
              <View style={styles.opsIconRow}>
                <ModuleIcon name="technologist" size={20} containerSize={38} />
                <Text style={[styles.opsArrow, { color: '#047857' }]}>→</Text>
              </View>
              <Text style={styles.opsTitle}>Technologist</Text>
              <Text style={styles.opsSub}>Scanning queue & safety checks</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.opsCard, { backgroundColor: '#EFF6FF', borderColor: '#BFDBFE' }]}
              onPress={() => router.push('/(app)/equipment' as any)}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel="Open Equipment & Maintenance"
            >
              <View style={styles.opsIconRow}>
                <ModuleIcon name="equipment" size={20} containerSize={38} />
                <Text style={[styles.opsArrow, { color: '#1D4ED8' }]}>→</Text>
              </View>
              <Text style={styles.opsTitle}>Equipment</Text>
              <Text style={styles.opsSub}>Machine status & PM schedules</Text>
            </TouchableOpacity>
          </View>
        )}

        {(roleName === 'ADMIN' || roleName === 'RADIOLOGIST') && (
          <View style={styles.opsShortcutRow}>
            <TouchableOpacity
              style={[styles.opsCard, { backgroundColor: '#FDF4FF', borderColor: '#F5D0FE' }]}
              onPress={() => router.push('/(app)/radiologist' as any)}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel="Open Radiologist Workspace"
            >
              <View style={styles.opsIconRow}>
                <ModuleIcon name="radiologist" size={20} containerSize={38} />
                <Text style={[styles.opsArrow, { color: '#A21CAF' }]}>→</Text>
              </View>
              <Text style={styles.opsTitle}>Radiologist</Text>
              <Text style={styles.opsSub}>Reading room & report templates</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.opsCard, { backgroundColor: '#FEF2F2', borderColor: '#FECACA' }]}
              onPress={() => router.push('/(app)/(tabs)/alerts' as any)}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel="Open Critical Alerts"
            >
              <View style={styles.opsIconRow}>
                <ModuleIcon name="alerts" size={20} containerSize={38} />
                <Text style={[styles.opsArrow, { color: '#DC2626' }]}>→</Text>
              </View>
              <Text style={styles.opsTitle}>Critical Alerts</Text>
              <Text style={styles.opsSub}>Urgent findings & read-backs</Text>
            </TouchableOpacity>
          </View>
        )}

        {(roleName === 'ADMIN' || roleName === 'RECEPTION') && (
          <>
            <View style={styles.opsShortcutRow}>
              <TouchableOpacity
                style={[styles.opsCard, { backgroundColor: '#F0FDF4', borderColor: '#BBF7D0' }]}
                onPress={() => router.push('/(app)/reception' as any)}
                activeOpacity={0.8}
                accessibilityRole="button"
                accessibilityLabel="Open Reception Desk"
              >
                <View style={styles.opsIconRow}>
                  <ModuleIcon name="reception" size={20} containerSize={38} />
                  <Text style={[styles.opsArrow, { color: '#047857' }]}>→</Text>
                </View>
                <Text style={styles.opsTitle}>Reception Desk</Text>
                <Text style={styles.opsSub}>Waiting queue, tokens & handover</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.opsCard, { backgroundColor: '#EFF6FF', borderColor: '#BFDBFE' }]}
                onPress={() => router.push('/(app)/scheduling' as any)}
                activeOpacity={0.8}
                accessibilityRole="button"
                accessibilityLabel="Open Scheduling & Calendar"
              >
                <View style={styles.opsIconRow}>
                  <ModuleIcon name="scheduling" size={20} containerSize={38} />
                  <Text style={[styles.opsArrow, { color: '#1D4ED8' }]}>→</Text>
                </View>
                <Text style={styles.opsTitle}>Scheduling</Text>
                <Text style={styles.opsSub}>Modality calendar & machine slots</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.billingShortcutCard}
              onPress={() => router.push('/(app)/billing')}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel="Open Staff Billing & Invoices"
            >
              <View style={styles.billingShortcutLeft}>
                <ModuleIcon name="billing" size={22} containerSize={42} style={{ marginRight: 12 }} />
                <View style={styles.billingInfoCol}>
                  <Text style={styles.billingShortcutTitle}>Billing & Invoices</Text>
                  <Text style={styles.billingShortcutSubtitle}>
                    View official invoices, payment status & itemized balances
                  </Text>
                </View>
              </View>
              <Text style={styles.billingShortcutArrow}>→</Text>
            </TouchableOpacity>
          </>
        )}


        {/* Stepped Clinical Pipeline Flow */}
        <SectionHeader
          title="Clinical Pipeline Flow"
          actionText="View Queue"
          onAction={() => router.push('/(app)/(tabs)/worklist')}
        />
        <View style={styles.pipelineCard}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.pipelineScroll}
          >
            <View style={styles.pipelineStep}>
              <View style={styles.stepBubble}>
                <Text style={styles.stepBubbleText}>
                  {pipelineFlow.booked}
                </Text>
              </View>
              <Text style={styles.stepLabel}>Booked</Text>
            </View>
            <Text style={styles.stepArrow}>→</Text>

            <View style={styles.pipelineStep}>
              <View style={styles.stepBubble}>
                <Text style={styles.stepBubbleText}>
                  {pipelineFlow.arrived}
                </Text>
              </View>
              <Text style={styles.stepLabel}>Arrived</Text>
            </View>
            <Text style={styles.stepArrow}>→</Text>

            <View style={styles.pipelineStep}>
              <View style={[styles.stepBubble, styles.stepBubbleActive]}>
                <Text style={[styles.stepBubbleText, styles.stepBubbleTextActive]}>
                  {pipelineFlow.scanning}
                </Text>
              </View>
              <Text style={[styles.stepLabel, styles.stepLabelActive]}>
                Scanning
              </Text>
            </View>
            <Text style={styles.stepArrow}>→</Text>

            <View style={styles.pipelineStep}>
              <View style={[styles.stepBubble, styles.stepBubbleHighlighted]}>
                <Text style={[styles.stepBubbleText, styles.stepBubbleTextHighlighted]}>
                  {pipelineFlow.pacsReady}
                </Text>
              </View>
              <Text style={[styles.stepLabel, styles.stepLabelHighlighted]}>
                PACS Ready
              </Text>
            </View>
            <Text style={styles.stepArrow}>→</Text>

            <View style={styles.pipelineStep}>
              <View style={styles.stepBubble}>
                <Text style={styles.stepBubbleText}>
                  {pipelineFlow.reporting}
                </Text>
              </View>
              <Text style={styles.stepLabel}>Reporting</Text>
            </View>
          </ScrollView>
        </View>

        {/* Scanner Fleet Quick Status (live from /dashboard/overview modalityTiles) */}
        <SectionHeader title="Modality Scanner Fleets" />
        <View style={styles.fleetCard}>
          {dashboardData?.modalityTiles && dashboardData.modalityTiles.length > 0 ? (
            dashboardData.modalityTiles.map((tile, idx) => {
              const isMri = tile.modality === 'MRI';
              const isOperational = tile.status === 'OPERATIONAL';
              return (
                <React.Fragment key={tile.modality}>
                  {idx > 0 && <View style={styles.fleetDivider} />}
                  <View style={styles.fleetRow}>
                    <View style={[styles.fleetModalityPill, isMri && styles.fleetModalityMri]}>
                      <Text style={[styles.fleetModalityText, isMri && styles.fleetTextMri]}>
                        {tile.modality}
                      </Text>
                    </View>
                    <View style={styles.fleetInfo}>
                      <Text style={styles.fleetName}>{tile.name}</Text>
                      <Text style={styles.fleetStatus}>
                        {tile.operationalScanners}/{tile.totalScanners} Scanners Online • {tile.todayScheduledCount} Scheduled Today
                      </Text>
                    </View>
                    <View style={isOperational ? styles.fleetBadgeActive : styles.fleetBadgeReady}>
                      <Text style={isOperational ? styles.fleetBadgeTextActive : styles.fleetBadgeTextReady}>
                        {tile.status}
                      </Text>
                    </View>
                  </View>
                </React.Fragment>
              );
            })
          ) : (
            <Text style={[styles.stepLabel, { textAlign: 'center', marginVertical: 10 }]}>
              {isDashboardError
                ? 'Unable to load modality fleet status from RIS server.'
                : 'Loading live modality status from RIS server...'}
            </Text>
          )}
        </View>

        {/* Priority Clinical Worklist Items */}
        <SectionHeader
          title="Active Priority Studies"
          actionText={worklistData ? `All Studies (${worklistData.total}) →` : 'All Studies →'}
          onAction={() => router.push('/(app)/(tabs)/worklist')}
        />
        <View style={styles.studiesFeed}>
          {displayLiveOrders.length > 0 ? (
            displayLiveOrders.map((order) => {
              const demo = formatDemographics(order.patient.dateOfBirth, order.patient.gender);
              return (
                <StudyCard
                  key={order.id}
                  patientName={`${order.patient.firstName} ${order.patient.lastName}`}
                  demographicsShort={demo.demographicsShort}
                  patientId={order.patient.patientId}
                  accessionNumber={order.accessionNumber}
                  examinationName={order.examinationName}
                  modality={order.modality}
                  priority={order.priority}
                  status={order.orderStatus}
                  scheduledTime={
                    order.appointment?.scheduledStart
                      ? new Date(order.appointment.scheduledStart).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })
                      : undefined
                  }
                  referringClinician={order.referringDoctor?.name}
                  primaryActionLabel="Open Study →"
                  onPrimaryAction={() =>
                    router.push({
                      pathname: '/(app)/study/[id]',
                      params: { id: order.accessionNumber },
                    })
                  }
                />
              );
            })
          ) : (
            <View style={styles.pipelineCard}>
              <Text style={[styles.stepLabel, { textAlign: 'center', marginVertical: 14 }]}>
                No priority studies currently waiting in the clinical queue.
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
    paddingTop: 12,
    paddingBottom: 40,
  },
  headerBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerBrandLogo: {
    width: 36,
    height: 36,
    marginRight: 10,
    flexShrink: 0,
  },
  headerInfo: {
    flex: 1,
  },
  greetingRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  greetingText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.3,
  },
  onlinePulseDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#10B981',
    marginLeft: 6,
  },
  roleSubRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  rolePill: {
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 7,
    paddingVertical: 1.5,
    borderRadius: 4,
  },
  rolePillText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#065F46',
    letterSpacing: 0.5,
  },
  roleDot: {
    marginHorizontal: 6,
    color: '#CBD5E1',
    fontSize: 10,
  },
  shiftText: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
  },
  avatarButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.brand.navy,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  statBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 14,
    padding: 12,
    marginBottom: 16,
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  statBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    minWidth: 0,
    marginRight: 8,
  },
  statIconBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    flexShrink: 0,
  },
  statIconText: {
    fontSize: 18,
  },
  statInfoCol: {
    flex: 1,
    minWidth: 0,
  },
  statTagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  statTagText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#DC2626',
    letterSpacing: 0.5,
  },
  statLocationTag: {
    fontSize: 10,
    color: '#991B1B',
    fontWeight: '600',
    marginLeft: 4,
  },
  statPatientText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#7F1D1D',
    marginTop: 2,
    flexShrink: 1,
  },
  statChevron: {
    fontSize: 16,
    color: '#DC2626',
    fontWeight: '700',
    flexShrink: 0,
  },
  metricGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 20,
    justifyContent: 'space-between',
  },
  pipelineCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: Colors.border.subtle,
    marginBottom: 20,
  },
  pipelineScroll: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    gap: 8,
  },
  pipelineStep: {
    alignItems: 'center',
    minWidth: 58,
  },
  stepBubble: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  stepBubbleActive: {
    backgroundColor: '#E0F2FE',
  },
  stepBubbleHighlighted: {
    backgroundColor: '#D1FAE5',
  },
  stepBubbleText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#475569',
    fontFamily: 'SpaceMono',
  },
  stepBubbleTextActive: {
    color: '#0369A1',
  },
  stepBubbleTextHighlighted: {
    color: '#065F46',
  },
  stepLabel: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
  },
  stepLabelActive: {
    color: '#0284C7',
    fontWeight: '700',
  },
  stepLabelHighlighted: {
    color: '#059669',
    fontWeight: '700',
  },
  stepArrow: {
    color: '#CBD5E1',
    fontSize: 12,
    marginBottom: 16,
  },
  fleetCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: Colors.border.subtle,
    marginBottom: 20,
  },
  fleetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
  },
  fleetModalityPill: {
    backgroundColor: '#E0F2FE',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginRight: 10,
  },
  fleetModalityMri: {
    backgroundColor: '#F3E8FF',
  },
  fleetModalityText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#0369A1',
  },
  fleetTextMri: {
    color: '#7E22CE',
  },
  fleetInfo: {
    flex: 1,
    minWidth: 0,
    marginRight: 8,
  },
  fleetName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  fleetStatus: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
  },
  fleetBadgeActive: {
    backgroundColor: '#ECFEFF',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    flexShrink: 0,
  },
  fleetBadgeTextActive: {
    fontSize: 10,
    fontWeight: '800',
    color: '#0E7490',
  },
  fleetBadgeReady: {
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    flexShrink: 0,
  },
  fleetBadgeTextReady: {
    fontSize: 10,
    fontWeight: '800',
    color: '#065F46',
  },
  fleetDivider: {
    height: 1,
    backgroundColor: '#F8FAFC',
    marginVertical: 8,
  },
  studiesFeed: {
    marginTop: 4,
  },
  billingShortcutCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 14,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  billingShortcutLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 12,
  },
  billingIconBox: {
    width: 42,
    height: 42,
    borderRadius: 10,
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  billingIconText: {
    fontSize: 20,
  },
  billingInfoCol: {
    flex: 1,
  },
  billingShortcutTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  billingShortcutSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
    lineHeight: 16,
  },
  billingShortcutArrow: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.brand.emerald,
  },
  opsShortcutRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  opsCard: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
  },
  opsIconRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  opsIcon: {
    fontSize: 20,
  },
  opsArrow: {
    fontSize: 14,
    fontWeight: '800',
  },
  opsTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  opsSub: {
    fontSize: 10,
    color: '#64748B',
    marginTop: 2,
    lineHeight: 14,
  },
  cleanIconBox: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cleanIconText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
});
