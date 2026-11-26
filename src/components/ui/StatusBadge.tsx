import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

export type CanonicalStatus =
  | 'SCHEDULED'
  | 'ARRIVED'
  | 'WAITING'
  | 'SCANNING'
  | 'PACS READY'
  | 'READY FOR REPORTING'
  | 'REPORTING'
  | 'FINAL VERIFIED'
  | 'CANCELLED';

interface StatusBadgeProps {
  status: string;
  compact?: boolean;
}

export interface StatusVisualConfig {
  isCanonical: boolean;
  canonicalCategory?: CanonicalStatus;
  displayLabel: string;
  symbol: string;
  bg: string;
  text: string;
  border: string;
  notes?: string;
}

/**
 * Safe Status Normalization Table
 *
 * Rules:
 * 1. Never map 'COMPLETED' (scanner acquisition done) to 'FINAL VERIFIED' (radiologist signed).
 * 2. Never map 'FAILED' (technical error) to 'CANCELLED' (order formally voided).
 * 3. Never guess advanced clinical states for unknown backend tokens.
 * 4. Fallback safely to normalized raw label with neutral presentation.
 */
export function resolveCanonicalStatus(rawStatus: string): StatusVisualConfig {
  if (!rawStatus) {
    return {
      isCanonical: false,
      displayLabel: 'UNKNOWN',
      symbol: '?',
      bg: '#F1F5F9',
      text: '#64748B',
      border: '#CBD5E1',
      notes: 'Missing status token from backend',
    };
  }

  const normalized = rawStatus.trim().toUpperCase().replace(/[\s-]+/g, '_');

  switch (normalized) {
    // 1. SCHEDULED / CREATED
    case 'CREATED':
    case 'ORDERED':
      return {
        isCanonical: true,
        canonicalCategory: 'SCHEDULED',
        displayLabel: 'ORDER CREATED',
        symbol: '•',
        bg: '#EFF6FF',
        text: '#1D4ED8',
        border: '#BFDBFE',
      };

    case 'SCHEDULED':
    case 'BOOKED':
    case 'CONFIRMED':
      return {
        isCanonical: true,
        canonicalCategory: 'SCHEDULED',
        displayLabel: 'SCHEDULED',
        symbol: '•',
        bg: '#EFF6FF',
        text: '#1D4ED8',
        border: '#BFDBFE',
      };

    // 2. ARRIVED
    case 'ARRIVED':
    case 'CHECKED_IN':
      return {
        isCanonical: true,
        canonicalCategory: 'ARRIVED',
        displayLabel: 'ARRIVED',
        symbol: '●',
        bg: '#F3E8FF',
        text: '#7E22CE',
        border: '#E9D5FF',
      };

    // 3. WAITING
    case 'WAITING':
    case 'IN_QUEUE':
    case 'READY_FOR_SCAN':
      return {
        isCanonical: true,
        canonicalCategory: 'WAITING',
        displayLabel: normalized === 'READY_FOR_SCAN' ? 'READY FOR SCAN' : 'WAITING',
        symbol: '●',
        bg: '#FFFBEB',
        text: '#B45309',
        border: '#FDE68A',
      };

    // 4. SCANNING
    case 'SCANNING':
    case 'SCAN_IN_PROGRESS':
    case 'ACQUIRING':
      return {
        isCanonical: true,
        canonicalCategory: 'SCANNING',
        displayLabel: 'SCANNING',
        symbol: '●',
        bg: '#ECFEFF',
        text: '#0E7490',
        border: '#A5F3FC',
      };

    // 5. PACS READY
    case 'PACS_READY':
    case 'PACS_SYNCED':
    case 'IMAGE_ACCEPTED':
      return {
        isCanonical: true,
        canonicalCategory: 'PACS READY',
        displayLabel: 'PACS READY',
        symbol: '✓',
        bg: '#D1FAE5',
        text: '#065F46',
        border: '#A7F3D0',
      };

    // 6. READY FOR REPORTING
    case 'READY_FOR_REPORTING':
    case 'READY_FOR_READ':
    case 'AWAITING_REPORT':
      return {
        isCanonical: true,
        canonicalCategory: 'READY FOR REPORTING',
        displayLabel: 'READY FOR REPORTING',
        symbol: '•',
        bg: '#FEF3C7',
        text: '#92400E',
        border: '#FDE68A',
      };

    // 7. REPORTING
    case 'REPORTING':
    case 'DRAFTED':
    case 'PRELIMINARY':
      return {
        isCanonical: true,
        canonicalCategory: 'REPORTING',
        displayLabel: 'REPORTING',
        symbol: '•',
        bg: '#EDE9FE',
        text: '#5B21B6',
        border: '#DDD6FE',
      };

    // 8. FINAL VERIFIED (Only for finalized, verified reports)
    case 'FINAL_VERIFIED':
    case 'FINAL':
    case 'VERIFIED':
    case 'SIGNED':
      return {
        isCanonical: true,
        canonicalCategory: 'FINAL VERIFIED',
        displayLabel: 'FINAL VERIFIED',
        symbol: '✓✓',
        bg: '#DCFCE7',
        text: '#166534',
        border: '#BBF7D0',
      };

    // 9. CANCELLED (Explicitly cancelled orders only)
    case 'CANCELLED':
    case 'VOIDED':
      return {
        isCanonical: true,
        canonicalCategory: 'CANCELLED',
        displayLabel: 'CANCELLED',
        symbol: '✕',
        bg: '#F1F5F9',
        text: '#64748B',
        border: '#CBD5E1',
      };

    // Distinct Non-Canonical Technical States (DO NOT CONFLATE):
    // COMPLETED / SCAN_COMPLETED != FINAL VERIFIED
    case 'COMPLETED':
    case 'SCAN_COMPLETED':
      return {
        isCanonical: false,
        displayLabel: 'SCAN COMPLETED',
        symbol: '✓',
        bg: '#ECFDF5',
        text: '#047857',
        border: '#A7F3D0',
        notes: 'Acquisition complete on scanner console. Awaiting radiologist reporting.',
      };

    // FAILED != CANCELLED
    case 'FAILED':
    case 'PACS_FAILED':
    case 'TRANSFER_FAILED':
      return {
        isCanonical: false,
        displayLabel: 'FAILED',
        symbol: '⚠',
        bg: '#FEF2F2',
        text: '#991B1B',
        border: '#FECACA',
        notes: 'Technical acquisition or DICOM transfer failure. Not an order cancellation.',
      };

    // Safe Unknown Fallback
    default:
      return {
        isCanonical: false,
        displayLabel: rawStatus.replace(/_/g, ' ').toUpperCase(),
        symbol: '•',
        bg: '#F1F5F9',
        text: '#475569',
        border: '#CBD5E1',
        notes: 'Non-canonical / unmapped status. Displayed verbatim without promotion.',
      };
  }
}

export function StatusBadge({ status, compact = false }: StatusBadgeProps) {
  const config = resolveCanonicalStatus(status);

  return (
    <View
      style={[
        styles.badge,
        { backgroundColor: config.bg, borderColor: config.border },
        compact && styles.compactBadge,
      ]}
      accessibilityRole="text"
      accessibilityLabel={`Clinical status: ${config.displayLabel}`}
    >
      <Text style={[styles.symbol, { color: config.text }]}>{config.symbol}</Text>
      <Text style={[styles.label, { color: config.text }, compact && styles.compactLabel]}>
        {config.displayLabel}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  compactBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1.5,
  },
  symbol: {
    fontSize: 9,
    marginRight: 4,
    fontWeight: '700',
  },
  label: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  compactLabel: {
    fontSize: 9,
  },
});
