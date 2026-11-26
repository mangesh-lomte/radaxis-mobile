import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { ModuleIcon, ModuleKey } from './ModuleIcon';

interface ScreenHeaderProps {
  title: string;
  subtitle?: string;
  rightElement?: React.ReactNode;
  module?: ModuleKey;
  icon?: React.ReactNode;
}

export function ScreenHeader({ title, subtitle, rightElement, module, icon }: ScreenHeaderProps) {
  return (
    <View style={styles.container}>
      <View style={styles.leftContainer}>
        {module ? (
          <ModuleIcon name={module} size={22} containerSize={42} style={styles.headerIcon} />
        ) : icon ? (
          <View style={styles.headerIcon}>{icon}</View>
        ) : null}
        <View style={styles.textColumn}>
          <Text style={styles.title}>{title}</Text>
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        </View>
      </View>
      {rightElement ? <View style={styles.right}>{rightElement}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  leftContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  headerIcon: {
    marginRight: 12,
  },
  textColumn: {
    flex: 1,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.4,
  },
  subtitle: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 2,
    fontWeight: '500',
  },
  right: {
    marginLeft: 12,
  },
});

