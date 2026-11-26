import { useGlobalSearchParams, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScreenHeader } from '@/src/components/ui/ScreenHeader';
import { SearchField } from '@/src/components/ui/SearchField';
import { FilterChip } from '@/src/components/ui/FilterChip';
import { StudyCard } from '@/src/components/ui/StudyCard';
import { LoadingState } from '@/src/components/shared/LoadingState';
import { ErrorState } from '@/src/components/shared/ErrorState';
import { EmptyState } from '@/src/components/shared/EmptyState';
import { useWorklist } from '@/src/hooks/useWorklist';
import { ImagingOrderItem, Priority } from '@/src/types';
import { formatDemographics } from '@/src/utils/demographics';
import { Colors } from '@/src/theme/colors';

export default function WorklistScreen() {
  const router = useRouter();
  const localParams = useLocalSearchParams<{ search?: string; t?: string }>();
  const globalParams = useGlobalSearchParams<{ search?: string; t?: string }>();
  const incomingSearch = (localParams.search || globalParams.search || '').trim();
  const incomingT = localParams.t || globalParams.t || '';
  const [search, setSearch] = useState(incomingSearch);
  const [selectedFilter, setSelectedFilter] = useState<string>('ALL');

  useEffect(() => {
    if (incomingSearch) {
      setSearch(incomingSearch);
      setSelectedFilter('ALL'); // Reset filter chips so the searched record is not hidden
    }
  }, [incomingSearch, incomingT]);

  // Determine query parameters for API call
  const queryParams = {
    search: search.trim() || undefined,
    modality: ['CT', 'MRI', 'XRAY', 'US'].includes(selectedFilter) ? selectedFilter : undefined,
    priority: ['STAT', 'URGENT'].includes(selectedFilter) ? (selectedFilter as Priority) : undefined,
    pageSize: 100, // Fetch up to 100 orders so genuine active studies are never cut off by pagination limits
  };

  const {
    data: worklistData,
    isLoading,
    isError,
    error,
    refetch,
    isRefetching,
  } = useWorklist(queryParams);

  const rawOrders: ImagingOrderItem[] = worklistData?.items || [];

  // Active status priority set
  const ACTIVE_ORDER_STATUSES = new Set([
    'STAT',
    'SAFETY_CLEARED',
    'READY_FOR_SCAN',
    'READY_FOR_TECH',
    'ARRIVED',
    'IN_PROGRESS',
    'SCAN_IN_PROGRESS',
    'SCAN_COMPLETED',
    'QA_ACCEPTED',
    'SCHEDULED',
    'CREATED',
  ]);

  // Sort orders: prioritize active clinical studies and higher priority (STAT/URGENT)
  const displayOrders = React.useMemo(() => {
    const priorityWeight: Record<string, number> = { STAT: 3, URGENT: 2, ROUTINE: 1 };

    return [...rawOrders].sort((a, b) => {
      // 1. Prioritize active clinical states over completed/cancelled
      const aActive = ACTIVE_ORDER_STATUSES.has(a.orderStatus);
      const bActive = ACTIVE_ORDER_STATUSES.has(b.orderStatus);
      if (aActive && !bActive) return -1;
      if (!aActive && bActive) return 1;

      // 2. Prioritize STAT and URGENT clinical urgency
      const aWeight = priorityWeight[a.priority] || 0;
      const bWeight = priorityWeight[b.priority] || 0;
      if (aWeight !== bWeight) return bWeight - aWeight;

      // 3. Chronological: newest orders first
      return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
    });
  }, [rawOrders]);

  const statCount = displayOrders.filter((s) => s.priority === 'STAT').length;
  const urgentCount = displayOrders.filter((s) => s.priority === 'URGENT').length;
  const ctCount = displayOrders.filter((s) => s.modality === 'CT').length;
  const mriCount = displayOrders.filter((s) => s.modality === 'MRI').length;
  const xrayCount = displayOrders.filter((s) => s.modality === 'XRAY').length;
  const usCount = displayOrders.filter((s) => s.modality === 'US').length;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
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
        <ScreenHeader
          title="Clinical Worklist"
          subtitle="Prioritized modality imaging & reporting queue"
          module="worklist"
        />

        {/* Search Field */}
        <SearchField
          value={search}
          onChangeText={setSearch}
          placeholder="Search patient, MRN or accession..."
          onClear={() => setSearch('')}
        />

        {/* Horizontal Touch-Scrollable Filter Chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}
        >
          <FilterChip
            label="All Studies"
            selected={selectedFilter === 'ALL'}
            count={worklistData?.total ?? rawOrders.length}
            onPress={() => setSelectedFilter('ALL')}
          />
          <FilterChip
            label="STAT"
            selected={selectedFilter === 'STAT'}
            count={statCount}
            onPress={() => setSelectedFilter('STAT')}
          />
          <FilterChip
            label="Urgent"
            selected={selectedFilter === 'URGENT'}
            count={urgentCount}
            onPress={() => setSelectedFilter('URGENT')}
          />
          <FilterChip
            label="CT Fleet"
            selected={selectedFilter === 'CT'}
            count={ctCount}
            onPress={() => setSelectedFilter('CT')}
          />
          <FilterChip
            label="MRI Suite"
            selected={selectedFilter === 'MRI'}
            count={mriCount}
            onPress={() => setSelectedFilter('MRI')}
          />
          <FilterChip
            label="X-Ray"
            selected={selectedFilter === 'XRAY'}
            count={xrayCount}
            onPress={() => setSelectedFilter('XRAY')}
          />
          <FilterChip
            label="Ultrasound"
            selected={selectedFilter === 'US'}
            count={usCount}
            onPress={() => setSelectedFilter('US')}
          />
        </ScrollView>

        {/* Worklist Metadata Summary & Sort Status */}
        <View style={styles.summaryBar}>
          <Text style={styles.summaryText}>
            {isLoading
              ? 'Connecting to RIS...'
              : isError
              ? 'Backend query failed'
              : `Showing ${displayOrders.length} active order(s) • Live Priority Queue`}
          </Text>
          <View style={styles.liveTag}>
            <View style={[styles.liveDot, isError && styles.liveDotError]} />
            <Text style={styles.liveText}>Queue Active</Text>
          </View>
        </View>

        {/* Screen State Handling */}
        {isLoading && !isRefetching ? (
          <LoadingState
            message="Loading Clinical Worklist..."
            subtitle="Retrieving real imaging orders from RadAxis RIS"
          />
        ) : isError ? (
          <ErrorState
            title="Unable to Load Worklist"
            message={error?.message || 'Failed to fetch imaging orders from RIS backend.'}
            onRetry={() => refetch()}
          />
        ) : displayOrders.length === 0 ? (
          <View style={styles.emptyContainer}>
            <EmptyState
              title="No Examinations Found"
              message={
                search
                  ? `No active imaging orders match "${search}". If an appointment was booked, check the Scheduling module to review bookings or authorize orders.`
                  : 'There are no active imaging examinations matching this filter.'
              }
            />
            {Boolean(search) && (
              <TouchableOpacity
                style={styles.schedulingNavBtn}
                onPress={() => router.push('/(app)/scheduling')}
              >
                <Text style={styles.schedulingNavBtnText}>Check Scheduling & Appointments →</Text>
              </TouchableOpacity>
            )}
            {(Boolean(search) || selectedFilter !== 'ALL') && (
              <TouchableOpacity
                style={styles.clearSearchBtn}
                onPress={() => {
                  setSearch('');
                  setSelectedFilter('ALL');
                }}
              >
                <Text style={styles.clearSearchBtnText}>Clear Search & Show All Orders</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <View style={styles.studiesFeed}>
            {displayOrders.map((order) => {
              const fullName = `${order.patient.firstName} ${order.patient.lastName}`;
              const demo = formatDemographics(order.patient.dateOfBirth, order.patient.gender);
              const scheduledOrCreated = order.appointment?.scheduledStart
                ? new Date(order.appointment.scheduledStart).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })
                : order.createdAt
                ? order.createdAt.slice(0, 10)
                : undefined;

              return (
                <StudyCard
                  key={order.id}
                  patientName={fullName}
                  demographicsShort={demo.demographicsShort}
                  patientId={order.patient.patientId}
                  accessionNumber={order.accessionNumber}
                  examinationName={order.examinationName}
                  modality={order.modality}
                  priority={order.priority}
                  status={order.orderStatus}
                  scheduledTime={scheduledOrCreated}
                  referringClinician={order.referringDoctor?.name || 'Staff Radiologist'}
                  primaryActionLabel="Open Study →"
                  onPrimaryAction={() =>
                    router.push({
                      pathname: '/(app)/study/[id]',
                      params: { id: order.accessionNumber },
                    })
                  }
                />
              );
            })}
          </View>
        )}
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
  filterRow: {
    flexDirection: 'row',
    paddingVertical: 10,
  },
  summaryBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    marginTop: 4,
    paddingHorizontal: 2,
    flexWrap: 'wrap',
    gap: 6,
  },
  summaryText: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '500',
    flex: 1,
    minWidth: 160,
  },
  liveTag: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 0,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
    marginRight: 4,
  },
  liveDotError: {
    backgroundColor: '#EF4444',
  },
  liveText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#059669',
    letterSpacing: 0.5,
  },
  studiesFeed: {
    marginTop: 2,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingBottom: 24,
  },
  schedulingNavBtn: {
    marginTop: 14,
    paddingVertical: 10,
    paddingHorizontal: 18,
    backgroundColor: '#ECFDF5',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  schedulingNavBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#047857',
  },
  clearSearchBtn: {
    marginTop: 12,
    paddingVertical: 10,
    paddingHorizontal: 18,
    backgroundColor: '#EFF6FF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  clearSearchBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1D4ED8',
  },
});
