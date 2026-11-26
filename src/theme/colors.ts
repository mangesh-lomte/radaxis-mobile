/**
 * RadAxis RIS Mobile — Color Design Tokens
 * Harmonized with RadAxis 'Serene Mint Health' Web Palette
 */

export const Colors = {
  brand: {
    navy: '#0F172A',         // Primary dark neutral / typography / deep canvas
    navySurface: '#1E293B',  // Elevated dark surfaces
    emerald: '#10B981',      // Core RadAxis primary brand accent
    emeraldDark: '#059669',  // Primary interactive hover / active
    emeraldLight: '#D1FAE5', // Soft brand badge / container
    mintBg: '#E9F1ED',       // Signature brand canvas tint
    cyan: '#0891B2',         // Clinical secondary accent
    cyanLight: '#E0F2FE',    // Modality pill background
  },

  background: {
    canvas: '#F8FAFC',       // Primary mobile screen background
    canvasAlt: '#F1F5F9',    // Secondary background / grouping
    surface: '#FFFFFF',      // Cards, inputs, sheets
    surfaceElevated: '#FFFFFF',
    surfaceSubtle: '#F8FAFC',
  },

  border: {
    subtle: '#F1F5F9',       // Ultra-light card separators
    default: '#E2E8F0',      // Standard card and field border
    strong: '#CBD5E1',       // High contrast border
    focus: '#10B981',        // Focused input border
  },

  text: {
    primary: '#0F172A',      // High emphasis / patient names / values
    secondary: '#334155',    // Medium emphasis / labels
    muted: '#64748B',        // Low emphasis / metadata / subtitles
    subtle: '#94A3B8',       // Placeholders / disabled text
    inverse: '#FFFFFF',      // Text on primary / dark buttons
    emerald: '#059669',      // Active clinical links
  },

  priority: {
    stat: {
      bg: '#FEF2F2',
      text: '#DC2626',
      border: '#FECACA',
      dot: '#EF4444',
    },
    urgent: {
      bg: '#FFFBEB',
      text: '#D97706',
      border: '#FDE68A',
      dot: '#F59E0B',
    },
    routine: {
      bg: '#F8FAFC',
      text: '#475569',
      border: '#E2E8F0',
      dot: '#94A3B8',
    },
  },

  status: {
    success: {
      bg: '#ECFDF5',
      text: '#047857',
      border: '#A7F3D0',
      icon: '#10B981',
    },
    inProgress: {
      bg: '#EFF6FF',
      text: '#1D4ED8',
      border: '#BFDBFE',
      icon: '#3B82F6',
    },
    warning: {
      bg: '#FFFBEB',
      text: '#B45309',
      border: '#FDE68A',
      icon: '#F59E0B',
    },
    critical: {
      bg: '#FEF2F2',
      text: '#B91C1C',
      border: '#FECACA',
      icon: '#EF4444',
    },
    neutral: {
      bg: '#F1F5F9',
      text: '#334155',
      border: '#CBD5E1',
      icon: '#64748B',
    },
  },

  identifier: {
    patient: {
      bg: '#F4F7F5',
      text: '#0F172A',
      label: '#475569',
      border: '#DCE6E0',
    },
    accession: {
      bg: '#F0F9FF',
      text: '#0369A1',
      label: '#0284C7',
      border: '#BAE6FD',
    },
    study: {
      bg: '#FAF5FF',
      text: '#7E22CE',
      label: '#9333EA',
      border: '#E9D5FF',
    },
  },

  ui: {
    tabBar: '#FFFFFF',
    tabBarBorder: '#E2E8F0',
    tabBarActive: '#0F172A',
    tabBarInactive: '#94A3B8',
    headerBg: '#FFFFFF',
    headerBorder: '#E2E8F0',
    inputBg: '#FFFFFF',
    inputBorder: '#E2E8F0',
    buttonPrimary: '#0F172A',
    buttonPrimaryText: '#FFFFFF',
    buttonSecondary: '#F1F5F9',
    buttonSecondaryText: '#0F172A',
    buttonSuccess: '#10B981',
    buttonSuccessText: '#FFFFFF',
    buttonDanger: '#FEE2E2',
    buttonDangerText: '#DC2626',
  },
} as const;
