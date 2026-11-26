import React from 'react';
import { StyleSheet, View, ViewStyle, StyleProp } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

export type ModuleKey =
  | 'patients'
  | 'technologist'
  | 'radiologist'
  | 'alerts'
  | 'reception'
  | 'scheduling'
  | 'billing'
  | 'equipment'
  | 'inventory'
  | 'pacs'
  | 'reports'
  | 'admin'
  | 'portal'
  | 'audit'
  | 'shares'
  | 'worklist';

export interface ModuleConfig {
  family: 'ionicons' | 'material';
  name: string;
  label: string;
  color: string;
  bgColor: string;
  borderColor: string;
}

export const MODULE_ICONS: Record<ModuleKey, ModuleConfig> = {
  patients: {
    family: 'ionicons',
    name: 'people-outline',
    label: 'Patients',
    color: '#1D4ED8',
    bgColor: '#EFF6FF',
    borderColor: '#BFDBFE',
  },
  technologist: {
    family: 'material',
    name: 'radiology-box-outline',
    label: 'Technologist',
    color: '#047857',
    bgColor: '#ECFDF5',
    borderColor: '#A7F3D0',
  },
  radiologist: {
    family: 'material',
    name: 'microscope',
    label: 'Radiologist',
    color: '#86198F',
    bgColor: '#FDF4FF',
    borderColor: '#F5D0FE',
  },
  alerts: {
    family: 'ionicons',
    name: 'alert-circle-outline',
    label: 'Critical Alerts',
    color: '#B91C1C',
    bgColor: '#FEF2F2',
    borderColor: '#FECACA',
  },
  reception: {
    family: 'ionicons',
    name: 'clipboard-outline',
    label: 'Reception',
    color: '#B45309',
    bgColor: '#FFFBEB',
    borderColor: '#FDE68A',
  },
  scheduling: {
    family: 'ionicons',
    name: 'calendar-outline',
    label: 'Scheduling',
    color: '#0369A1',
    bgColor: '#F0F9FF',
    borderColor: '#BAE6FD',
  },
  billing: {
    family: 'ionicons',
    name: 'receipt-outline',
    label: 'Billing',
    color: '#B45309',
    bgColor: '#FEF3C7',
    borderColor: '#FDE68A',
  },
  equipment: {
    family: 'material',
    name: 'cog-transfer-outline',
    label: 'Equipment',
    color: '#1E40AF',
    bgColor: '#DBEAFE',
    borderColor: '#BFDBFE',
  },
  inventory: {
    family: 'material',
    name: 'package-variant-closed',
    label: 'Inventory',
    color: '#065F46',
    bgColor: '#DCFCE7',
    borderColor: '#BBF7D0',
  },
  pacs: {
    family: 'ionicons',
    name: 'images-outline',
    label: 'PACS Viewer',
    color: '#0E7490',
    bgColor: '#E0F2FE',
    borderColor: '#BAE6FD',
  },
  reports: {
    family: 'ionicons',
    name: 'document-text-outline',
    label: 'Reports',
    color: '#0F766E',
    bgColor: '#F0FDFA',
    borderColor: '#99F6E4',
  },
  admin: {
    family: 'ionicons',
    name: 'shield-checkmark-outline',
    label: 'Administration',
    color: '#475569',
    bgColor: '#F1F5F9',
    borderColor: '#CBD5E1',
  },
  portal: {
    family: 'ionicons',
    name: 'phone-portrait-outline',
    label: 'Patient Portal',
    color: '#047857',
    bgColor: '#ECFDF5',
    borderColor: '#A7F3D0',
  },
  audit: {
    family: 'material',
    name: 'history',
    label: 'Audit Logs',
    color: '#334155',
    bgColor: '#F1F5F9',
    borderColor: '#CBD5E1',
  },
  shares: {
    family: 'ionicons',
    name: 'share-social-outline',
    label: 'External Shares',
    color: '#7E22CE',
    bgColor: '#FAF5FF',
    borderColor: '#E9D5FF',
  },
  worklist: {
    family: 'ionicons',
    name: 'list-outline',
    label: 'Clinical Worklist',
    color: '#0F766E',
    bgColor: '#F0FDFA',
    borderColor: '#99F6E4',
  },
};

export interface ModuleIconProps {
  name: ModuleKey;
  size?: number;
  color?: string;
  variant?: 'tinted' | 'bare';
  containerSize?: number;
  style?: StyleProp<ViewStyle>;
}

export function ModuleIcon({
  name,
  size = 20,
  color,
  variant = 'tinted',
  containerSize,
  style,
}: ModuleIconProps) {
  const config = MODULE_ICONS[name] || MODULE_ICONS.admin;
  const iconColor = color || config.color;

  const resolvedContainerSize = containerSize || (size >= 24 ? 44 : size >= 20 ? 38 : 32);

  const iconElement =
    config.family === 'ionicons' ? (
      <Ionicons name={config.name as any} size={size} color={iconColor} />
    ) : (
      <MaterialCommunityIcons name={config.name as any} size={size} color={iconColor} />
    );

  if (variant === 'bare') {
    return <View style={style}>{iconElement}</View>;
  }

  return (
    <View
      style={[
        styles.container,
        {
          width: resolvedContainerSize,
          height: resolvedContainerSize,
          borderRadius: Math.round(resolvedContainerSize * 0.28),
          backgroundColor: config.bgColor,
          borderColor: config.borderColor,
        },
        style,
      ]}
      accessibilityRole="image"
      accessibilityLabel={`${config.label} icon`}
    >
      {iconElement}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
});
