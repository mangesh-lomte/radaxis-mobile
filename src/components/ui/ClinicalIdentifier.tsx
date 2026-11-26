import React, { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Colors } from '@/src/theme/colors';

interface ClinicalIdentifierProps {
  type: 'MRN' | 'ACC' | 'UID';
  value: string;
  onPress?: () => void;
}

export function ClinicalIdentifier({ type, value, onPress }: ClinicalIdentifierProps) {
  const [copied, setCopied] = useState(false);

  const config =
    type === 'MRN'
      ? Colors.identifier.patient
      : type === 'ACC'
      ? Colors.identifier.accession
      : Colors.identifier.study;

  const handlePress = () => {
    setCopied(true);
    if (onPress) onPress();
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <TouchableOpacity
      style={[styles.container, { backgroundColor: config.bg, borderColor: config.border }]}
      onPress={handlePress}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={`Identifier ${type}: ${value}`}
    >
      <Text style={[styles.tag, { color: config.label }]}>{type}</Text>
      <Text style={[styles.value, { color: config.text }]} numberOfLines={1}>
        {value}
      </Text>
      <Text style={styles.copyIcon}>{copied ? '✓' : '⧉'}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    alignSelf: 'flex-start',
    maxWidth: '100%',
    minWidth: 0,
  },
  tag: {
    fontSize: 9,
    fontWeight: '800',
    marginRight: 5,
    letterSpacing: 0.5,
    flexShrink: 0,
  },
  value: {
    fontSize: 11,
    fontFamily: 'SpaceMono',
    fontWeight: '600',
    letterSpacing: 0.2,
    flexShrink: 1,
  },
  copyIcon: {
    fontSize: 10,
    marginLeft: 6,
    color: '#94A3B8',
    flexShrink: 0,
  },
});
