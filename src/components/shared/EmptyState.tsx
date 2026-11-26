import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface EmptyStateAction {
  label: string;
  onPress: () => void;
}

interface EmptyStateProps {
  icon?: string | React.ReactNode;
  title?: string;
  message?: string;
  action?: EmptyStateAction;
}

export function EmptyState({ icon, title, message, action }: EmptyStateProps) {
  return (
    <View style={styles.container}>
      {React.isValidElement(icon) ? (
        <View style={styles.iconContainer}>{icon}</View>
      ) : typeof icon === 'string' ? (
        <Text style={styles.icon}>{icon}</Text>
      ) : (
        <Ionicons name="file-tray-outline" size={40} color="#94A3B8" style={styles.icon} />
      )}
      {title ? <Text style={styles.title}>{title}</Text> : null}
      {message ? <Text style={styles.message}>{message}</Text> : null}
      {action ? (
        <TouchableOpacity style={styles.actionButton} onPress={action.onPress} activeOpacity={0.8}>
          <Text style={styles.actionText}>{action.label}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 48,
  },
  iconContainer: {
    marginBottom: 16,
  },
  icon: {
    fontSize: 40,
    marginBottom: 16,
    opacity: 0.6,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#334155',
    textAlign: 'center',
    marginBottom: 8,
  },
  message: {
    fontSize: 14,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  actionButton: {
    backgroundColor: '#0891B2',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
  },
  actionText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
});
