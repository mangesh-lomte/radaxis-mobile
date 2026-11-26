import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScreenHeader } from '@/src/components/ui/ScreenHeader';
import { SearchField } from '@/src/components/ui/SearchField';
import { FilterChip } from '@/src/components/ui/FilterChip';
import { PatientCard } from '@/src/components/ui/PatientCard';
import { LoadingState } from '@/src/components/shared/LoadingState';
import { ErrorState } from '@/src/components/shared/ErrorState';
import { EmptyState } from '@/src/components/shared/EmptyState';
import { usePatients } from '@/src/hooks/usePatients';
import { PatientListItem } from '@/src/types';
import { formatDemographics } from '@/src/utils/demographics';
import { Colors } from '@/src/theme/colors';

export default function PatientsScreen() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<'ALL' | 'ACTIVE' | 'ORDERS'>('ALL');

  const {
    data: patientData,
    isLoading,
    isError,
    error,
    refetch,
    isRefetching,
  } = usePatients({ search: search.trim() });

  const rawPatients: PatientListItem[] = patientData?.items || [];

  const filteredPatients = rawPatients.filter((patient) => {
    if (selectedFilter === 'ACTIVE') {
      return patient.isActive;
    }
    if (selectedFilter === 'ORDERS') {
      return (patient._count?.imagingOrders || 0) > 0 || (patient._count?.appointments || 0) > 0;
    }
    return true;
  });

  const activeCount = rawPatients.filter((p) => p.isActive).length;
  const ordersCount = rawPatients.filter(
    (p) => (p._count?.imagingOrders || 0) > 0 || (p._count?.appointments || 0) > 0
  ).length;

  const handleOpenJacket = (patient: PatientListItem) => {
    const fullName = `${patient.firstName} ${patient.middleName ? patient.middleName + ' ' : ''}${patient.lastName}`;
    const demo = formatDemographics(patient.dateOfBirth, patient.gender);
    const dobFormatted = patient.dateOfBirth ? patient.dateOfBirth.slice(0, 10) : 'Not recorded';
    const location = [patient.addressLine1, patient.city, patient.state].filter(Boolean).join(', ') || 'Not recorded';
    const emergency = patient.emergencyContact || (patient.emergencyContactName
      ? `${patient.emergencyContactName} (${patient.emergencyContactRelation || 'Contact'}) · ${patient.emergencyContactPhone || ''}`
      : 'None on file');

    const hasOrders = (patient._count?.imagingOrders || 0) > 0;
    const hasAppointments = (patient._count?.appointments || 0) > 0;

    const dialogButtons: Array<{ text: string; style?: 'default' | 'cancel' | 'destructive'; onPress?: () => void }> = [
      { text: 'Close', style: 'cancel' },
    ];

    if (hasAppointments) {
      dialogButtons.push({
        text: 'View Scheduling',
        onPress: () => {
          router.push({
            pathname: '/(app)/scheduling',
            params: { search: patient.patientId, patientId: patient.patientId },
          });
        },
      });
    }

    dialogButtons.push({
      text: 'Search Worklist',
      onPress: () => {
        router.navigate({
          pathname: '/(app)/(tabs)/worklist',
          params: { search: patient.patientId, t: Date.now().toString() },
        });
      },
    });

    Alert.alert(
      `Patient Jacket · ${fullName}`,
      `MRN: ${patient.patientId}\n` +
      `Demographics: ${demo.demographicsShort} (DOB: ${dobFormatted})\n` +
      `Phone: ${patient.phone || 'None'}\n` +
      `Email: ${patient.email || 'None'}\n` +
      `Address: ${location}\n` +
      `Emergency: ${emergency}\n\n` +
      `Clinical History:\n` +
      `• Imaging Orders: ${patient._count?.imagingOrders || 0}\n` +
      `• Appointments: ${patient._count?.appointments || 0}\n` +
      `• Record Status: ${patient.isActive ? 'Active' : 'Inactive'}`,
      dialogButtons
    );
  };

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
          title="Master Patient Index"
          subtitle="Privacy-safe clinical demographics & patient registry"
          module="patients"
        />

        {/* Search Field */}
        <SearchField
          value={search}
          onChangeText={setSearch}
          placeholder="Search patient name, MRN, phone..."
          onClear={() => setSearch('')}
        />

        {/* Filter Chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}
        >
          <FilterChip
            label="All Records"
            selected={selectedFilter === 'ALL'}
            count={patientData?.total ?? rawPatients.length}
            onPress={() => setSelectedFilter('ALL')}
          />
          <FilterChip
            label="Active"
            selected={selectedFilter === 'ACTIVE'}
            count={activeCount}
            onPress={() => setSelectedFilter('ACTIVE')}
          />
          <FilterChip
            label="With Orders"
            selected={selectedFilter === 'ORDERS'}
            count={ordersCount}
            onPress={() => setSelectedFilter('ORDERS')}
          />
        </ScrollView>

        {/* Real Status Strip */}
        <View style={styles.privacyStrip}>
          <View style={styles.privacyLeft}>
            <View style={[styles.statusDot, isError && styles.statusDotError]} />
            <Text style={styles.privacyText}>
              {isLoading
                ? 'Connecting to RIS backend...'
                : isError
                ? 'Backend error occurred'
                : `Found ${filteredPatients.length} verified records`}
            </Text>
          </View>
          <Text style={styles.privacyBadge}>Registry Verified</Text>
        </View>

        {/* Screen State Handling */}
        {isLoading && !isRefetching ? (
          <LoadingState
            message="Loading Master Patient Index..."
            subtitle="Fetching verified records from RadAxis RIS"
          />
        ) : isError ? (
          <ErrorState
            title="Unable to Load Patients"
            message={error?.message || 'Failed to communicate with RadAxis RIS backend.'}
            onRetry={() => refetch()}
          />
        ) : filteredPatients.length === 0 ? (
          <EmptyState
            title="No Patient Records Found"
            message={
              search
                ? `No patient records matched "${search}". Try searching by MRN or last name.`
                : 'The master patient index is currently empty.'
            }
          />
        ) : (
          <View style={styles.list}>
            {filteredPatients.map((patient) => {
              const fullName = `${patient.firstName} ${patient.lastName}`;
              const demo = formatDemographics(patient.dateOfBirth, patient.gender);
              const dobFormatted = patient.dateOfBirth ? patient.dateOfBirth.slice(0, 10) : undefined;
              const location = [patient.city, patient.state].filter(Boolean).join(', ') || undefined;

              return (
                <PatientCard
                  key={patient.id}
                  name={fullName}
                  patientId={patient.patientId}
                  demographicsShort={demo.demographicsShort}
                  dateOfBirth={dobFormatted}
                  location={location}
                  category={patient.isActive ? 'INPATIENT' : 'OUTPATIENT'}
                  activeProcedure={
                    (patient._count?.imagingOrders || 0) > 0
                      ? `${patient._count?.imagingOrders} active imaging order(s)`
                      : undefined
                  }
                  actionLabel="Open Patient Jacket →"
                  onPress={() => handleOpenJacket(patient)}
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
  privacyStrip: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    marginTop: 4,
    paddingHorizontal: 2,
    flexWrap: 'wrap',
    gap: 6,
  },
  privacyLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    minWidth: 150,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
    marginRight: 6,
  },
  statusDotError: {
    backgroundColor: '#EF4444',
  },
  privacyText: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '500',
  },
  privacyBadge: {
    fontSize: 9,
    fontWeight: '700',
    color: '#059669',
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    flexShrink: 0,
    alignSelf: 'flex-start',
  },
  list: {
    marginTop: 2,
  },
});
