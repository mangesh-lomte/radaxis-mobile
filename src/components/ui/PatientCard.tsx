import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ClinicalIdentifier } from './ClinicalIdentifier';
import { PriorityBadge } from './PriorityBadge';
import { Priority } from '@/src/types';
import { Colors } from '@/src/theme/colors';

interface PatientCardProps {
  name: string;
  patientId: string;
  demographicsShort?: string;
  dateOfBirth?: string;
  location?: string;
  category?: 'INPATIENT' | 'OUTPATIENT';
  activeProcedure?: string;
  priority?: Priority;
  hasAllergyAlert?: boolean;
  onPress?: () => void;
  actionLabel?: string;
}

export function PatientCard({
  name,
  patientId,
  demographicsShort,
  dateOfBirth,
  location,
  category,
  activeProcedure,
  priority,
  hasAllergyAlert = false,
  onPress,
  actionLabel = 'Open Patient Jacket →',
}: PatientCardProps) {
  // Initials for privacy-compliant neutral local avatar
  const initials = name
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase() || 'P';

  return (
    <View style={styles.card}>
      {/* Top Header: Initials Avatar + Name & Age/Sex + Priority */}
      <View style={styles.topRow}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initials}</Text>
        </View>

        <View style={styles.nameBlock}>
          <View style={styles.titleLine}>
            <Text style={styles.name} numberOfLines={1}>
              {name}
            </Text>
            <Ionicons name="checkmark-circle" size={14} color="#059669" style={{ marginLeft: 4 }} accessibilityLabel="Verified Record" />
          </View>
          <View style={styles.demographicRow}>
            {demographicsShort ? (
              <Text style={styles.demographicText}>{demographicsShort}</Text>
            ) : null}
            {demographicsShort && dateOfBirth ? <Text style={styles.dot}>•</Text> : null}
            {dateOfBirth ? (
              <Text style={styles.demographicText}>DOB: {dateOfBirth}</Text>
            ) : null}
          </View>
        </View>

        {priority && <PriorityBadge priority={priority} compact />}
      </View>

      {/* Monospace Identifiers Row */}
      <View style={styles.identifierBox}>
        <ClinicalIdentifier type="MRN" value={patientId} />
        {category && (
          <View style={styles.categoryPill}>
            <Text style={styles.categoryText}>{category}</Text>
          </View>
        )}
      </View>

      {/* Allergy Alert Indicator if present */}
      {hasAllergyAlert && (
        <View style={styles.allergyBanner}>
          <Text style={styles.allergyIcon}>⚠</Text>
          <Text style={styles.allergyText}>
            Clinical Caution: Contrast Allergy on file
          </Text>
        </View>
      )}

      {/* Active Encounter / Location */}
      {location && (
        <View style={styles.locationRow}>
          <Text style={styles.locationText} numberOfLines={1}>
            {location}
          </Text>
        </View>
      )}

      {/* Recent / Active Imaging Procedure */}
      {activeProcedure && (
        <View style={styles.procedureRow}>
          <Text style={styles.procedureLabel}>Active Exam:</Text>
          <Text style={styles.procedureText} numberOfLines={1}>
            {activeProcedure}
          </Text>
        </View>
      )}

      {/* Primary Action Button */}
      {onPress && (
        <TouchableOpacity
          style={styles.actionButton}
          onPress={onPress}
          activeOpacity={0.8}
        >
          <Text style={styles.actionButtonText}>{actionLabel}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '100%',
    minWidth: 0,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.border.subtle,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 5,
    elevation: 2,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 10,
    backgroundColor: '#E0F2FE',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0369A1',
    letterSpacing: 0.5,
  },
  nameBlock: {
    flex: 1,
  },
  titleLine: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  name: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  verifiedIcon: {
    fontSize: 13,
    color: '#059669',
    marginLeft: 5,
    fontWeight: '800',
  },
  demographicRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  demographicText: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
  },
  dot: {
    marginHorizontal: 4,
    color: '#CBD5E1',
    fontSize: 10,
  },
  identifierBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    padding: 8,
    borderRadius: 8,
    marginBottom: 8,
  },
  categoryPill: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  categoryText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#475569',
    letterSpacing: 0.5,
  },
  allergyBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginBottom: 8,
  },
  allergyIcon: {
    fontSize: 12,
    color: '#DC2626',
    marginRight: 6,
    fontWeight: '700',
  },
  allergyText: {
    fontSize: 11,
    color: '#991B1B',
    fontWeight: '600',
    flex: 1,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  locationIcon: {
    fontSize: 12,
    marginRight: 4,
  },
  locationText: {
    fontSize: 12,
    color: '#475569',
    fontWeight: '500',
  },
  procedureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
    marginBottom: 10,
  },
  procedureLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
    marginRight: 6,
  },
  procedureText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#0F172A',
    flex: 1,
  },
  actionButton: {
    backgroundColor: Colors.brand.navy,
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
});
