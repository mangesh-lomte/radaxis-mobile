import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Colors } from '@/src/theme/colors';

interface MetricCardProps {
  label: string;
  value: number | string;
  subtext?: string;
  color?: string;
}

export function MetricCard({ label, value, subtext, color = '#0F172A' }: MetricCardProps) {
  return (
    <View style={styles.card}>
      <Text style={styles.label}>{label}</Text>
      <Text style={[styles.value, { color }]}>{value}</Text>
      {subtext ? <Text style={styles.subtext}>{subtext}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    minWidth: '45%',
    maxWidth: '49%',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.border.subtle,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  label: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
  },
  value: {
    fontSize: 26,
    fontWeight: '800',
    marginVertical: 4,
    letterSpacing: -0.5,
  },
  subtext: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '500',
  },
});
