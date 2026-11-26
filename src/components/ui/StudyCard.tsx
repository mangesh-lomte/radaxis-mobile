import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Priority } from '@/src/types';
import { PriorityBadge } from './PriorityBadge';
import { StatusBadge } from './StatusBadge';
import { ClinicalIdentifier } from './ClinicalIdentifier';
import { Colors } from '@/src/theme/colors';

interface StudyCardProps {
  patientName: string;
  demographicsShort?: string;
  patientId: string;
  accessionNumber: string;
  examinationName: string;
  modality: string;
  priority: Priority;
  status: string;
  waitingTime?: string;
  scheduledTime?: string;
  referringClinician?: string;
  primaryActionLabel?: string;
  onPrimaryAction?: () => void;
}

export function StudyCard({
  patientName,
  demographicsShort,
  patientId,
  accessionNumber,
  examinationName,
  modality,
  priority,
  status,
  waitingTime,
  scheduledTime,
  referringClinician,
  primaryActionLabel = 'Open Study →',
  onPrimaryAction,
}: StudyCardProps) {
  const isStat = priority === 'STAT';

  return (
    <View style={[styles.card, isStat && styles.cardStat]}>
      {/* 1. Patient Name & Demographics + Priority Badge */}
      <View style={styles.topRow}>
        <View style={styles.patientGroup}>
          <Text style={styles.patientName} numberOfLines={1}>
            {patientName}
          </Text>
          {demographicsShort && (
            <View style={styles.demographicBadge}>
              <Text style={styles.demographicText}>{demographicsShort}</Text>
            </View>
          )}
        </View>
        <PriorityBadge priority={priority} />
      </View>

      {/* 2. Examination Name */}
      <Text style={styles.examName} numberOfLines={2}>
        {examinationName}
      </Text>

      {/* 3 & 4. Clinical Identifiers (MRN & Accession Number in SpaceMono) */}
      <View style={styles.identifierRow}>
        <ClinicalIdentifier type="MRN" value={patientId} />
        <View style={styles.identifierDivider} />
        <ClinicalIdentifier type="ACC" value={accessionNumber} />
      </View>

      {/* 5, 6, 7. Modality Pill, Canonical Status Badge, Waiting/Scheduled Time */}
      <View style={styles.statusRow}>
        <View style={styles.statusLeft}>
          <View style={styles.modalityPill}>
            <Text style={styles.modalityText}>{modality}</Text>
          </View>
          <StatusBadge status={status} />
        </View>

        {(waitingTime || scheduledTime) && (
          <View style={styles.timeBadge}>
            <Ionicons name="time-outline" size={12} color="#94A3B8" style={{ marginRight: 4 }} />
            <Text
              style={[
                styles.timeText,
                isStat && styles.timeTextStat,
              ]}
            >
              {waitingTime ? `Wait: ${waitingTime}` : scheduledTime}
            </Text>
          </View>
        )}
      </View>

      {/* Hairline Divider */}
      <View style={styles.divider} />

      {/* 8. Referring Clinician & 9. Primary Action Button */}
      <View style={styles.footerRow}>
        <View style={styles.clinicianBlock}>
          <Text style={styles.clinicianLabel}>Referring</Text>
          <Text style={styles.clinicianName} numberOfLines={1}>
            {referringClinician || 'Emergency Dept'}
          </Text>
        </View>

        {onPrimaryAction && (
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={onPrimaryAction}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel={`Open study for ${patientName}`}
          >
            <Text style={styles.actionBtnText}>{primaryActionLabel}</Text>
          </TouchableOpacity>
        )}
      </View>
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
  cardStat: {
    borderColor: '#FECACA',
    backgroundColor: '#FFFFFF',
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    flexWrap: 'wrap',
    gap: 6,
  },
  patientGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    minWidth: 150,
    flexWrap: 'wrap',
    gap: 4,
    marginRight: 8,
  },
  patientName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  demographicBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
    marginLeft: 2,
  },
  demographicText: {
    fontSize: 11,
    color: '#475569',
    fontWeight: '600',
  },
  examName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E293B',
    lineHeight: 19,
    marginBottom: 8,
  },
  identifierRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginBottom: 10,
    alignSelf: 'flex-start',
    flexWrap: 'wrap',
  },
  identifierDivider: {
    width: 1,
    height: 12,
    backgroundColor: '#E2E8F0',
    marginHorizontal: 8,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    flexWrap: 'wrap',
    gap: 6,
  },
  statusLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  modalityPill: {
    backgroundColor: '#E0F2FE',
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    borderRadius: 6,
  },
  modalityText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#0369A1',
    letterSpacing: 0.5,
  },
  timeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timeIcon: {
    fontSize: 11,
    marginRight: 3,
  },
  timeText: {
    fontSize: 11,
    color: '#64748B',
    fontFamily: 'SpaceMono',
    fontWeight: '600',
  },
  timeTextStat: {
    color: '#DC2626',
    fontWeight: '700',
  },
  divider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginBottom: 8,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  clinicianBlock: {
    flex: 1,
    minWidth: 120,
    marginRight: 8,
  },
  clinicianLabel: {
    fontSize: 10,
    color: '#94A3B8',
    textTransform: 'uppercase',
  },
  clinicianName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
  },
  actionBtn: {
    backgroundColor: Colors.brand.navy,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    minHeight: 38,
    minWidth: 105,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  actionBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
});
