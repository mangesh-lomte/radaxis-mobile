import React from 'react';
import { StyleSheet, Text, TouchableOpacity } from 'react-native';
import { Colors } from '@/src/theme/colors';

interface FilterChipProps {
  label: string;
  selected: boolean;
  count?: number;
  onPress: () => void;
}

export function FilterChip({ label, selected, count, onPress }: FilterChipProps) {
  return (
    <TouchableOpacity
      style={[styles.chip, selected ? styles.chipSelected : styles.chipUnselected]}
      onPress={onPress}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityState={{ selected }}
    >
      <Text style={[styles.label, selected ? styles.labelSelected : styles.labelUnselected]}>
        {label}
      </Text>
      {count !== undefined ? (
        <Text style={[styles.count, selected ? styles.countSelected : styles.countUnselected]}>
          {count}
        </Text>
      ) : null}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    marginRight: 8,
  },
  chipSelected: {
    backgroundColor: Colors.brand.navy,
    borderColor: Colors.brand.navy,
  },
  chipUnselected: {
    backgroundColor: '#FFFFFF',
    borderColor: Colors.border.default,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
  },
  labelSelected: {
    color: '#FFFFFF',
  },
  labelUnselected: {
    color: '#475569',
  },
  count: {
    fontSize: 11,
    fontWeight: '700',
    marginLeft: 5,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 10,
  },
  countSelected: {
    backgroundColor: '#1E293B',
    color: '#FFFFFF',
  },
  countUnselected: {
    backgroundColor: '#F1F5F9',
    color: '#64748B',
  },
});
