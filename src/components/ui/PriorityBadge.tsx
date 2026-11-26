import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Priority } from '@/src/types';

interface PriorityBadgeProps {
  priority: Priority;
  compact?: boolean;
}

const PRIORITY_CONFIG: Record<Priority, { bg: string; text: string; border: string; icon: string }> = {
  STAT: {
    bg: '#FEF2F2',
    text: '#991B1B',
    border: '#FECACA',
    icon: '⚠',
  },
  URGENT: {
    bg: '#FFFBEB',
    text: '#B45309',
    border: '#FDE68A',
    icon: '▲',
  },
  ROUTINE: {
    bg: '#F1F5F9',
    text: '#475569',
    border: '#E2E8F0',
    icon: '●',
  },
};

export function PriorityBadge({ priority, compact = false }: PriorityBadgeProps) {
  const config = PRIORITY_CONFIG[priority] || PRIORITY_CONFIG.ROUTINE;

  return (
    <View
      style={[
        styles.badge,
        { backgroundColor: config.bg, borderColor: config.border },
        compact && styles.compactBadge,
      ]}
      accessibilityRole="text"
      accessibilityLabel={`Priority: ${priority}`}
    >
      <Text style={[styles.icon, { color: config.text }]}>{config.icon}</Text>
      <Text style={[styles.label, { color: config.text }, compact && styles.compactLabel]}>
        {priority}
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
    borderRadius: 999,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  compactBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1.5,
  },
  icon: {
    fontSize: 9,
    marginRight: 4,
    fontWeight: '800',
  },
  label: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  compactLabel: {
    fontSize: 9,
  },
});
