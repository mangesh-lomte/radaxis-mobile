import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/src/theme/colors';

interface AlertCardProps {
  id: string;
  severity: 'CRITICAL' | 'WARNING' | 'INFO';
  title: string;
  description: string;
  timestamp: string;
  patientName: string;
  demographicsShort: string;
  patientId: string;
  accessionNumber: string;
  location?: string;
  procedureName?: string;
  orderingClinician?: string;
  pager?: string;
  escalationTime?: string;
  acknowledged?: boolean;
  readBackRecorded?: boolean;
  onAcknowledge?: () => void;
  onRecordReadBack?: () => void;
  onPress?: () => void;
}

export function AlertCard({
  severity,
  title,
  description,
  timestamp,
  patientName,
  demographicsShort,
  patientId,
  accessionNumber,
  location,
  procedureName,
  orderingClinician,
  pager,
  escalationTime,
  acknowledged = false,
  readBackRecorded = false,
  onAcknowledge,
  onRecordReadBack,
  onPress,
}: AlertCardProps) {
  const isCritical = severity === 'CRITICAL';
  const isWarning = severity === 'WARNING';

  const accentColor = isCritical ? '#EF4444' : isWarning ? '#F59E0B' : '#0891B2';
  const badgeBg = isCritical ? '#FEF2F2' : isWarning ? '#FFFBEB' : '#EFF6FF';
  const badgeText = isCritical ? '#991B1B' : isWarning ? '#B45309' : '#1D4ED8';
  const badgeBorder = isCritical ? '#FECACA' : isWarning ? '#FDE68A' : '#BFDBFE';

  return (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={onPress ? 0.88 : 1}
      onPress={onPress}
      disabled={!onPress}
    >
      {/* Left Accent Bar */}
      <View style={[styles.accentBar, { backgroundColor: accentColor }]} />

      <View style={styles.cardBody}>
        {/* Severity Pill & Timestamp Row */}
        <View style={styles.headerRow}>
          <View
            style={[
              styles.severityPill,
              { backgroundColor: badgeBg, borderColor: badgeBorder },
            ]}
          >
            <Ionicons name="alert-circle" size={12} color={accentColor} style={{ marginRight: 4 }} />
            <Text style={[styles.severityText, { color: badgeText }]}>
              {isCritical ? 'CRITICAL VALUE ALERT' : isWarning ? 'URGENT FINDING' : 'INFO ALERT'}
            </Text>
          </View>
          <View style={styles.timeGroup}>
            <Ionicons name="time-outline" size={13} color="#94A3B8" style={{ marginRight: 4 }} />
            <Text style={styles.timestampText}>{timestamp}</Text>
          </View>
        </View>

        {/* Patient Meta Row */}
        <View style={styles.patientMetaRow}>
          <View style={styles.nameBlock}>
            <Text style={styles.patientName}>{patientName}</Text>
            <View style={styles.demographicBadge}>
              <Text style={styles.demographicText}>{demographicsShort}</Text>
            </View>
          </View>
          {location && (
            <Text style={styles.locationText} numberOfLines={1}>
              {location}
            </Text>
          )}
        </View>

        {/* Monospace Identifiers */}
        <View style={styles.identifierBox}>
          <Text style={styles.identifierText}>
            MRN: <Text style={styles.idValue}>{patientId}</Text>
          </Text>
          <Text style={styles.idDivider}>•</Text>
          <Text style={styles.identifierText}>
            ACC: <Text style={styles.idValue}>{accessionNumber}</Text>
          </Text>
        </View>

        {/* Procedure Badge */}
        {procedureName && (
          <View style={styles.procedurePill}>
            <Text style={styles.procedureText} numberOfLines={1}>
              {procedureName}
            </Text>
          </View>
        )}

        {/* Finding Highlight Box */}
        <View
          style={[
            styles.findingBox,
            { backgroundColor: isCritical ? '#FEF2F2' : '#F8FAFC' },
          ]}
        >
          <Text style={[styles.findingTitle, { color: isCritical ? '#991B1B' : '#0F172A' }]}>
            {title}
          </Text>
          <Text style={styles.findingDescription}>{description}</Text>
        </View>

        {/* Ordering Clinician Details */}
        {orderingClinician && (
          <View style={styles.clinicianRow}>
            <View style={styles.clinicianInfo}>
              <Text style={styles.clinicianLabel}>Ordering Clinician</Text>
              <Text style={styles.clinicianName} numberOfLines={1}>
                {orderingClinician}
              </Text>
            </View>
            {pager && (
              <View style={styles.pagerPill}>
                <Text style={styles.pagerText}>Pager {pager}</Text>
              </View>
            )}
          </View>
        )}

        {/* SEPARATED ACTIONS SECTION */}
        <View style={styles.actionsDivider} />
        <View style={styles.actionsContainer}>
          {/* Action 1: Acknowledge Finding */}
          {onAcknowledge && (
            <TouchableOpacity
              style={[
                styles.ackButton,
                isCritical && styles.ackButtonCritical,
                acknowledged && styles.ackButtonDone,
              ]}
              onPress={onAcknowledge}
              disabled={acknowledged}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.ackButtonText,
                  acknowledged && styles.ackButtonTextDone,
                ]}
              >
                {acknowledged ? '✓ Acknowledged' : 'Acknowledge Finding'}
              </Text>
            </TouchableOpacity>
          )}

          {/* Action 2: Record Read-Back Communication */}
          <View style={styles.subActionRow}>
            {onRecordReadBack && (
              <TouchableOpacity
                style={styles.readBackButton}
                onPress={onRecordReadBack}
                activeOpacity={0.7}
              >
                <Text style={styles.readBackText}>
                  {readBackRecorded ? '✓ Read-Back Recorded' : 'Record Read-Back'}
                </Text>
              </TouchableOpacity>
            )}

            {escalationTime && (
              <Text style={styles.escalationText}>Escalation: {escalationTime}</Text>
            )}
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: Colors.border.subtle,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 5,
    elevation: 2,
    flexDirection: 'row',
    overflow: 'hidden',
    width: '100%',
    minWidth: 0,
  },
  accentBar: {
    width: 5,
    flexShrink: 0,
  },
  cardBody: {
    flex: 1,
    minWidth: 0,
    padding: 14,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    flexWrap: 'wrap',
    gap: 4,
  },
  severityPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    borderWidth: 1,
  },
  pulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  severityText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  timeGroup: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timeIcon: {
    fontSize: 11,
    marginRight: 3,
  },
  timestampText: {
    fontSize: 11,
    color: '#64748B',
    fontFamily: 'SpaceMono',
    fontWeight: '600',
  },
  patientMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
    flexWrap: 'wrap',
    gap: 4,
  },
  nameBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    minWidth: 120,
    flexWrap: 'wrap',
  },
  patientName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    marginRight: 8,
  },
  demographicBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  demographicText: {
    fontSize: 11,
    color: '#475569',
    fontWeight: '600',
  },
  locationText: {
    fontSize: 11,
    color: '#EF4444',
    fontWeight: '600',
    maxWidth: '100%',
    flexShrink: 1,
  },
  identifierBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginBottom: 8,
    alignSelf: 'flex-start',
    flexWrap: 'wrap',
    maxWidth: '100%',
  },
  identifierText: {
    fontSize: 11,
    color: '#64748B',
    fontFamily: 'SpaceMono',
    flexShrink: 1,
  },
  idValue: {
    color: '#0F172A',
    fontWeight: '600',
  },
  idDivider: {
    marginHorizontal: 6,
    color: '#CBD5E1',
    fontSize: 10,
  },
  procedurePill: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginBottom: 8,
    maxWidth: '100%',
  },
  procedureText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
    flexShrink: 1,
  },
  findingBox: {
    padding: 10,
    borderRadius: 8,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#FEE2E2',
    minWidth: 0,
  },
  findingTitle: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 4,
  },
  findingDescription: {
    fontSize: 12,
    color: '#334155',
    lineHeight: 17,
  },
  clinicianRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    padding: 8,
    borderRadius: 8,
    marginBottom: 10,
    flexWrap: 'wrap',
    gap: 6,
    minWidth: 0,
  },
  clinicianInfo: {
    flex: 1,
    minWidth: 120,
  },
  clinicianLabel: {
    fontSize: 10,
    color: '#94A3B8',
    textTransform: 'uppercase',
  },
  clinicianName: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
    marginTop: 1,
  },
  pagerPill: {
    backgroundColor: '#E0F2FE',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  pagerText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0369A1',
    fontFamily: 'SpaceMono',
  },
  actionsDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginBottom: 10,
  },
  actionsContainer: {
    gap: 8,
  },
  callButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    paddingVertical: 9,
    minHeight: 44,
  },
  callIcon: {
    fontSize: 14,
    marginRight: 6,
  },
  callButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  ackButton: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.brand.navy,
    borderRadius: 8,
    paddingVertical: 10,
    minHeight: 44,
  },
  ackButtonCritical: {
    backgroundColor: '#DC2626',
  },
  ackButtonDone: {
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  ackButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  ackButtonTextDone: {
    color: '#64748B',
  },
  subActionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 4,
  },
  readBackButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
  },
  readBackIcon: {
    fontSize: 13,
    marginRight: 4,
  },
  readBackText: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
  },
  escalationText: {
    fontSize: 11,
    color: '#DC2626',
    fontWeight: '700',
    fontFamily: 'SpaceMono',
  },
});
