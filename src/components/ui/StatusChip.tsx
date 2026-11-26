import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

export type ChipVariant =
  | 'stat'
  | 'urgent'
  | 'routine'
  | 'success'
  | 'inProgress'
  | 'cancelled'
  | 'info'
  | 'active'
  | 'maintenance';

interface StatusChipProps {
  label: string;
  variant: ChipVariant;
}

type ColorConfig = { bg: string; text: string };

const COLOR_MAP: Record<ChipVariant, ColorConfig> = {
  stat:        { bg: '#FEF2F2', text: '#B91C1C' },
  urgent:      { bg: '#FFFBEB', text: '#B45309' },
  routine:     { bg: '#F1F5F9', text: '#334155' },
  success:     { bg: '#ECFDF5', text: '#047857' },
  inProgress:  { bg: '#EFF6FF', text: '#1D4ED8' },
  cancelled:   { bg: '#FFF1F2', text: '#BE123C' },
  info:        { bg: '#EFF6FF', text: '#1D4ED8' },
  active:      { bg: '#ECFDF5', text: '#047857' },
  maintenance: { bg: '#FFFBEB', text: '#B45309' },
};

export function StatusChip({ label, variant }: StatusChipProps) {
  const colors = COLOR_MAP[variant];
  return (
    <View style={[styles.chip, { backgroundColor: colors.bg }]}>
      <Text style={[styles.label, { color: colors.text }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
  },
});
