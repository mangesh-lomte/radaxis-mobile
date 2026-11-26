import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

interface LoadingStateProps {
  message?: string;
  subtitle?: string;
}

export function LoadingState({ message, subtitle }: LoadingStateProps) {
  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={BRAND} />
      {message ? <Text style={styles.message}>{message}</Text> : null}
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
  );
}

const BRAND = '#0891B2';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAFC',
  },
  message: {
    marginTop: 16,
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
  },
  subtitle: {
    marginTop: 6,
    fontSize: 12,
    color: '#94A3B8',
    textAlign: 'center',
  },
});
