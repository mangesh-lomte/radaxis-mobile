import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  TouchableOpacity,
  View,
} from 'react-native';
import { Colors } from '@/src/theme/colors';

interface AppInputProps extends TextInputProps {
  label?: string;
  error?: string | null;
  rightActionText?: string;
  onRightAction?: () => void;
}

export function AppInput({
  label,
  error,
  rightActionText,
  onRightAction,
  style,
  ...props
}: AppInputProps) {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <View style={styles.container}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <View
        style={[
          styles.inputWrapper,
          isFocused && styles.inputFocused,
          error ? styles.inputError : null,
        ]}
      >
        <TextInput
          style={[styles.input, style]}
          placeholderTextColor="#94A3B8"
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          {...props}
        />
        {rightActionText && onRightAction ? (
          <TouchableOpacity onPress={onRightAction} style={styles.rightAction}>
            <Text style={styles.rightActionText}>{rightActionText}</Text>
          </TouchableOpacity>
        ) : null}
      </View>
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 6,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 12,
    minHeight: 48,
  },
  inputFocused: {
    borderColor: Colors.brand.navy,
  },
  inputError: {
    borderColor: '#EF4444',
  },
  input: {
    flex: 1,
    height: 48,
    paddingHorizontal: 14,
    fontSize: 15,
    color: '#0F172A',
    minWidth: 0,
  },
  rightAction: {
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  rightActionText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0891B2',
  },
  errorText: {
    fontSize: 12,
    color: '#DC2626',
    marginTop: 4,
    fontWeight: '500',
  },
});
