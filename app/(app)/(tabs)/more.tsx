import { useRouter } from 'expo-router';
import React from 'react';
import {
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/src/auth/AuthContext';
import { useNetworkStatus } from '@/src/hooks/useNetworkStatus';
import { API_BASE_URL, APP_CONFIG } from '@/src/constants/config';
import { isProductionHost } from '@/src/constants/environment';
import { AppCard } from '@/src/components/ui/AppCard';
import { AppButton } from '@/src/components/ui/AppButton';
import { ScreenHeader } from '@/src/components/ui/ScreenHeader';
import { ModuleIcon } from '@/src/components/ui/ModuleIcon';
import { Colors } from '@/src/theme/colors';
import { UserRole } from '@/src/types';

const ROLE_BADGE_STYLE: Record<UserRole, { bg: string; text: string; border: string }> = {
  ADMIN: { bg: '#EFF6FF', text: '#1D4ED8', border: '#BFDBFE' },
  RADIOLOGIST: { bg: '#FDF4FF', text: '#A21CAF', border: '#F5D0FE' },
  TECHNOLOGIST: { bg: '#ECFDF5', text: '#047857', border: '#A7F3D0' },
  RECEPTION: { bg: '#FFFBEB', text: '#B45309', border: '#FDE68A' },
  ENGINEER: { bg: '#F1F5F9', text: '#475569', border: '#CBD5E1' },
};

export default function MoreScreen() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { isOffline } = useNetworkStatus();
  const insets = useSafeAreaInsets();
  const isProduction = isProductionHost(API_BASE_URL);

  const role: UserRole = user?.role || 'RECEPTION';
  const roleStyle = ROLE_BADGE_STYLE[role] || ROLE_BADGE_STYLE.RECEPTION;
  const fullName = user
    ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email
    : 'Clinical Staff';
  const emailDisplay = user?.email || 'Not signed in';
  const initials = user
    ? `${user.firstName?.[0] || ''}${user.lastName?.[0] || ''}`.toUpperCase() || 'U'
    : 'U';

  const handleSignOut = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out of RadAxis RIS?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          queryClient.clear();
          await logout();
          router.replace('/(auth)/login');
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: Math.max(insets.bottom + 20, 40) },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <ScreenHeader
          title="Account & System"
          subtitle="Clinician profile, live connectivity & verified settings"
          module="admin"
        />

        {/* User Profile Card */}
        <AppCard style={styles.cardSpacing}>
          <View style={styles.profileHeader}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{initials}</Text>
            </View>
            <View style={styles.profileInfo}>
              <Text style={styles.userName}>{fullName}</Text>
              <Text style={styles.userEmail}>{emailDisplay}</Text>
              <View
                style={[
                  styles.roleBadge,
                  { backgroundColor: roleStyle.bg, borderColor: roleStyle.border },
                ]}
              >
                <Text style={[styles.roleText, { color: roleStyle.text }]}>{role}</Text>
              </View>
            </View>
          </View>
        </AppCard>

        {/* Clinical Administration */}
        <Text style={styles.sectionHeader}>Clinical Workflows</Text>
        <AppCard style={styles.cardSpacing}>
          {(role === 'ADMIN' || role === 'TECHNOLOGIST') && (
            <>
              <TouchableOpacity
                style={styles.navRow}
                onPress={() => router.push('/(app)/technologist' as any)}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel="Open Technologist Workspace"
              >
                <View style={styles.navRowLeft}>
                  <ModuleIcon name="technologist" size={20} containerSize={40} style={styles.navIconBox} />
                  <View style={styles.navRowTextContainer}>
                    <Text style={styles.navRowTitle}>Technologist Workspace</Text>
                    <Text style={styles.navRowSubtitle}>
                      Scanning queue, safety screening & protocol checklists
                    </Text>
                  </View>
                </View>
                <Text style={styles.chevron}>›</Text>
              </TouchableOpacity>
              <View style={styles.navDivider} />
            </>
          )}

          {(role === 'ADMIN' || role === 'RADIOLOGIST') && (
            <>
              <TouchableOpacity
                style={styles.navRow}
                onPress={() => router.push('/(app)/radiologist' as any)}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel="Open Radiologist Workspace"
              >
                <View style={styles.navRowLeft}>
                  <ModuleIcon name="radiologist" size={20} containerSize={40} style={styles.navIconBox} />
                  <View style={styles.navRowTextContainer}>
                    <Text style={styles.navRowTitle}>Radiologist Workspace</Text>
                    <Text style={styles.navRowSubtitle}>
                      Diagnostic reading room, templates & report verification
                    </Text>
                  </View>
                </View>
                <Text style={styles.chevron}>›</Text>
              </TouchableOpacity>
              <View style={styles.navDivider} />
            </>
          )}

          {(role === 'ADMIN' || role === 'RECEPTION') && (
            <>
              <TouchableOpacity
                style={styles.navRow}
                onPress={() => router.push('/(app)/reception' as any)}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel="Open Reception & Queue"
              >
                <View style={styles.navRowLeft}>
                  <ModuleIcon name="reception" size={20} containerSize={40} style={styles.navIconBox} />
                  <View style={styles.navRowTextContainer}>
                    <Text style={styles.navRowTitle}>Reception & Patient Queue</Text>
                    <Text style={styles.navRowSubtitle}>
                      Waiting queue, arrival check-in tokens & report handover
                    </Text>
                  </View>
                </View>
                <Text style={styles.chevron}>›</Text>
              </TouchableOpacity>
              <View style={styles.navDivider} />
            </>
          )}

          {(role === 'ADMIN' || role === 'RECEPTION' || role === 'TECHNOLOGIST') && (
            <>
              <TouchableOpacity
                style={styles.navRow}
                onPress={() => router.push('/(app)/scheduling' as any)}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel="Open Scheduling & Calendar"
              >
                <View style={styles.navRowLeft}>
                  <ModuleIcon name="scheduling" size={20} containerSize={40} style={styles.navIconBox} />
                  <View style={styles.navRowTextContainer}>
                    <Text style={styles.navRowTitle}>Scheduling & Calendar</Text>
                    <Text style={styles.navRowSubtitle}>
                      Modality schedules, booked exams & machine slot availability
                    </Text>
                  </View>
                </View>
                <Text style={styles.chevron}>›</Text>
              </TouchableOpacity>
            </>
          )}

          {(role === 'ADMIN' || role === 'RECEPTION') && (
            <>
              <View style={styles.navDivider} />
              <TouchableOpacity
                style={styles.navRow}
                onPress={() => router.push('/(app)/billing' as any)}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel="Open Billing, Invoices & Receipts"
              >
                <View style={styles.navRowLeft}>
                  <ModuleIcon name="billing" size={20} containerSize={40} style={styles.navIconBox} />
                  <View style={styles.navRowTextContainer}>
                    <Text style={styles.navRowTitle}>Billing, Invoices & Receipts</Text>
                    <Text style={styles.navRowSubtitle}>
                      View official invoices, payment status & itemized balances
                    </Text>
                  </View>
                </View>
                <Text style={styles.chevron}>›</Text>
              </TouchableOpacity>
            </>
          )}
        </AppCard>

        {/* Hospital Operations & Administration */}
        <Text style={styles.sectionHeader}>Hospital Operations & Administration</Text>
        <AppCard style={styles.cardSpacing}>
          <TouchableOpacity
            style={styles.navRow}
            onPress={() => router.push('/(app)/inventory' as any)}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Open Hospital Inventory & Pharmacy"
          >
            <View style={styles.navRowLeft}>
              <ModuleIcon name="inventory" size={20} containerSize={40} style={styles.navIconBox} />
              <View style={styles.navRowTextContainer}>
                <Text style={styles.navRowTitle}>Inventory & Pharmacy</Text>
                <Text style={styles.navRowSubtitle}>
                  Stock counts, emergency kits & reorder alerts
                </Text>
              </View>
            </View>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>

          <View style={styles.navDivider} />

          <TouchableOpacity
            style={styles.navRow}
            onPress={() => router.push('/(app)/equipment' as any)}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Open Equipment & Maintenance"
          >
            <View style={styles.navRowLeft}>
              <ModuleIcon name="equipment" size={20} containerSize={40} style={styles.navIconBox} />
              <View style={styles.navRowTextContainer}>
                <Text style={styles.navRowTitle}>Equipment & Maintenance</Text>
                <Text style={styles.navRowSubtitle}>
                  Scanner register, operational status & PM schedules
                </Text>
              </View>
            </View>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>

          <View style={styles.navDivider} />

          <TouchableOpacity
            style={styles.navRow}
            onPress={() => router.push('/(app)/shares' as any)}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Open External Study Shares"
          >
            <View style={styles.navRowLeft}>
              <ModuleIcon name="shares" size={20} containerSize={40} style={styles.navIconBox} />
              <View style={styles.navRowTextContainer}>
                <Text style={styles.navRowTitle}>External Study Shares</Text>
                <Text style={styles.navRowSubtitle}>
                  Outside referrals, secure tokens & patient consent
                </Text>
              </View>
            </View>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>

          {role === 'ADMIN' && (
            <>
              <View style={styles.navDivider} />
              <TouchableOpacity
                style={styles.navRow}
                onPress={() => router.push('/(app)/admin' as any)}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel="Open Hospital Administration & Audit"
              >
                <View style={styles.navRowLeft}>
                  <ModuleIcon name="admin" size={20} containerSize={40} style={styles.navIconBox} />
                  <View style={styles.navRowTextContainer}>
                    <Text style={styles.navRowTitle}>Administration & Audit</Text>
                    <Text style={styles.navRowSubtitle}>
                      Security audit logs, staff directory & RBAC posture
                    </Text>
                  </View>
                </View>
                <Text style={styles.chevron}>›</Text>
              </TouchableOpacity>
            </>
          )}

        </AppCard>

        {/* System & Connection Info */}
        <Text style={styles.sectionHeader}>System & Connectivity</Text>
        <AppCard style={styles.cardSpacing}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>RIS Gateway</Text>
            <Text style={[styles.infoValue, styles.monoValue]} numberOfLines={1} ellipsizeMode="middle">
              {API_BASE_URL}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>App Version</Text>
            <Text style={styles.infoValue}>v{APP_CONFIG.version}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Infrastructure</Text>
            <Text style={styles.infoValue}>
              Enterprise Radiology Information System
            </Text>
          </View>
          <View style={[styles.infoRow, styles.lastRow]}>
            <Text style={styles.infoLabel}>Network State</Text>
            <View style={styles.networkStatusRow}>
              <View
                style={[
                  styles.statusDot,
                  { backgroundColor: !isOffline ? '#10B981' : '#EF4444' },
                ]}
              />
              <Text
                style={[
                  styles.networkStatusText,
                  { color: !isOffline ? '#047857' : '#B91C1C' },
                ]}
                numberOfLines={1}
              >
                {!isOffline ? 'Connected (Live)' : 'Offline (No Connection)'}
              </Text>
            </View>
          </View>
        </AppCard>

        {/* Sign Out Action */}
        <AppButton
          title="Sign Out"
          onPress={handleSignOut}
          variant="danger"
          size="lg"
          style={styles.signOutButton}
        />

        {/* Footer */}
        <View style={styles.footer}>
          <Image
            source={require('@/assets/images/radaxis-logo.png')}
            style={styles.footerLogo}
            resizeMode="contain"
            accessibilityLabel="RadAxis Official Logo"
          />
          <Text style={styles.footerText}>
            RadAxis RIS Mobile · Serene Mint Clinical Design System
          </Text>
          <Text style={styles.footerSubtext}>
            Connected to RIS Gateway
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 40,
  },
  cardSpacing: {
    marginBottom: 16,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: Colors.brand.emerald,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
  },
  profileInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
  },
  userEmail: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 2,
    marginBottom: 6,
  },
  roleBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
  },
  roleText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  sectionHeader: {
    fontSize: 12,
    fontWeight: '800',
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 8,
    marginLeft: 4,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
    minWidth: 0,
  },
  lastRow: {
    borderBottomWidth: 0,
    paddingBottom: 0,
  },
  infoLabel: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '500',
    flexShrink: 0,
    marginRight: 8,
  },
  infoValue: {
    fontSize: 13,
    color: '#0F172A',
    fontWeight: '600',
    flex: 1,
    textAlign: 'right',
    minWidth: 0,
  },
  monoValue: {
    fontFamily: 'SpaceMono',
    fontSize: 11,
  },
  networkStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    minWidth: 0,
    justifyContent: 'flex-end',
  },
  networkStatusText: {
    fontSize: 13,
    fontWeight: '600',
    flexShrink: 1,
    textAlign: 'right',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
    flexShrink: 0,
  },
  signOutButton: {
    marginTop: 8,
    marginBottom: 20,
  },
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  navDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 10,
  },
  navRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 12,
  },
  navIconBox: {
    marginRight: 12,
  },
  navRowTextContainer: {
    flex: 1,
  },
  navRowTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  navRowSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
    lineHeight: 16,
  },
  chevron: {
    fontSize: 22,
    color: '#94A3B8',
    fontWeight: '400',
  },
  footer: {
    alignItems: 'center',
    paddingBottom: 16,
  },
  footerLogo: {
    width: 28,
    height: 28,
    marginBottom: 8,
    opacity: 0.85,
  },
  footerText: {
    fontSize: 11,
    color: '#94A3B8',
    textAlign: 'center',
  },
  footerSubtext: {
    fontSize: 10,
    color: '#CBD5E1',
    textAlign: 'center',
    marginTop: 2,
  },
});
