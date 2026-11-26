import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuth } from '@/src/auth/AuthContext';
import {
  useAuditLogs,
  useSecurityOverview,
  useStaffUsers,
} from '@/src/hooks/useOperations';
import { API_BASE_URL } from '@/src/constants/config';
import { ModuleIcon } from '@/src/components/ui/ModuleIcon';

type AdminTab = 'AUDIT' | 'USERS' | 'SECURITY';

export default function AdminScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<AdminTab>('AUDIT');
  const [searchQuery, setSearchQuery] = useState('');
  const isHttps = API_BASE_URL.startsWith('https://');

  const isAdmin = user?.role === 'ADMIN';

  // Live Queries (only run if admin)
  const {
    data: auditLogs = [],
    isLoading: loadingLogs,
    isError: errorLogs,
    refetch: refetchLogs,
    isRefetching: refetchingLogs,
  } = useAuditLogs();

  const {
    data: staffUsers = [],
    isLoading: loadingUsers,
    isError: errorUsers,
    refetch: refetchUsers,
  } = useStaffUsers();

  const {
    data: securityData,
    isLoading: loadingSec,
    refetch: refetchSec,
  } = useSecurityOverview();

  const onRefreshAll = () => {
    refetchLogs();
    refetchUsers();
    refetchSec();
  };

  const filteredLogs = useMemo(() => {
    if (!searchQuery.trim()) return auditLogs;
    const q = searchQuery.toLowerCase().trim();
    return auditLogs.filter((log) => {
      const action = log.action?.toLowerCase() || '';
      const entity = log.entityType?.toLowerCase() || '';
      const actor = log.user?.email?.toLowerCase() || '';
      const ip = log.ipAddress?.toLowerCase() || '';
      return action.includes(q) || entity.includes(q) || actor.includes(q) || ip.includes(q);
    });
  }, [auditLogs, searchQuery]);

  const formatDate = (isoString?: string) => {
    if (!isoString) return '';
    try {
      const d = new Date(isoString);
      return `${d.toLocaleDateString()} ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    } catch {
      return isoString;
    }
  };

  // If not admin, render RBAC Gate
  if (!isAdmin) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Text style={styles.backText}>‹</Text>
          </TouchableOpacity>
          <View style={styles.headerTitleBlock}>
            <View style={styles.headerTitleRow}>
              <ModuleIcon name="admin" size={16} containerSize={28} style={{ marginRight: 6 }} />
              <Text style={styles.headerTitle}>Administration & Audit</Text>
            </View>
          </View>
        </View>

        <View style={styles.rbacGateContainer}>
          <ModuleIcon name="admin" size={32} containerSize={64} style={{ marginBottom: 16 }} />
          <Text style={styles.rbacTitle}>Administrator Role Required</Text>
          <Text style={styles.rbacSubtitle}>
            Hospital administration, user directories, and system audit trails are restricted to authorized ADMIN personnel.
          </Text>
          <TouchableOpacity
            style={styles.backHomeBtn}
            onPress={() => router.back()}
          >
            <Text style={styles.backHomeBtnText}>Return to Previous Screen</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {/* Top Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Text style={styles.backText}>‹</Text>
        </TouchableOpacity>
        <View style={styles.headerTitleBlock}>
          <View style={styles.headerTitleRow}>
            <ModuleIcon name="admin" size={16} containerSize={28} style={{ marginRight: 6 }} />
            <Text style={styles.headerTitle}>Hospital Administration & Audit</Text>
          </View>
          <Text style={styles.headerSubtitle}>
            Security logs, staff user directory & system posture
          </Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refetchingLogs}
            onRefresh={onRefreshAll}
            tintColor="#0F766E"
          />
        }
      >
        {/* Micro-KPI Grid */}
        <View style={styles.kpiGrid}>
          <View style={styles.kpiCard}>
            <Text style={styles.kpiLabel}>Audit Events</Text>
            <Text style={styles.kpiValue}>{auditLogs.length}</Text>
          </View>
          <View style={styles.kpiCard}>
            <Text style={styles.kpiLabel}>Staff Users</Text>
            <Text style={styles.kpiValue}>{staffUsers.length}</Text>
          </View>
          <View style={styles.kpiCard}>
            <Text style={styles.kpiLabel}>Security Status</Text>
            <Text style={[styles.kpiValue, styles.kpiSuccess, styles.kpiSmallFont]}>
              {securityData?.status === 'ACTIVE_ENFORCED' ? 'ENFORCED' : 'ACTIVE'}
            </Text>
          </View>
          <View style={styles.kpiCard}>
            <Text style={styles.kpiLabel}>Connection</Text>
            <Text style={[styles.kpiValue, styles.kpiSuccess, styles.kpiSmallFont]}>
              {isHttps ? 'HTTPS / TLS' : 'LAN / SECURE'}
            </Text>
          </View>
        </View>

        {/* View Tabs */}
        <View style={styles.tabsRow}>
          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'AUDIT' && styles.tabButtonActive]}
            onPress={() => setActiveTab('AUDIT')}
          >
            <Text
              style={[
                styles.tabButtonText,
                activeTab === 'AUDIT' && styles.tabButtonTextActive,
              ]}
            >
              Audit Trail ({auditLogs.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'USERS' && styles.tabButtonActive]}
            onPress={() => setActiveTab('USERS')}
          >
            <Text
              style={[
                styles.tabButtonText,
                activeTab === 'USERS' && styles.tabButtonTextActive,
              ]}
            >
              Staff Directory ({staffUsers.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'SECURITY' && styles.tabButtonActive]}
            onPress={() => setActiveTab('SECURITY')}
          >
            <Text
              style={[
                styles.tabButtonText,
                activeTab === 'SECURITY' && styles.tabButtonTextActive,
              ]}
            >
              Security Posture
            </Text>
          </TouchableOpacity>
        </View>

        {/* TAB 1: AUDIT TRAIL LOGS */}
        {activeTab === 'AUDIT' && (
          <View style={styles.auditList}>
            {/* Search Input */}
            <View style={styles.searchBox}>
              <TextInput
                style={styles.searchInput}
                placeholder="Search audit trail by action, user, or IP..."
                placeholderTextColor="#94A3B8"
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery('')}>
                  <Text style={styles.clearText}>Clear</Text>
                </TouchableOpacity>
              )}
            </View>

            {loadingLogs && (
              <View style={styles.loadingBox}>
                <ActivityIndicator size="large" color="#0F766E" />
                <Text style={styles.loadingText}>Fetching system audit trail...</Text>
              </View>
            )}

            {errorLogs && !loadingLogs && (
              <View style={styles.errorBox}>
                <Text style={styles.errorTitle}>Error Loading Audit Logs</Text>
                <Text style={styles.errorText}>Could not retrieve audit trail from server.</Text>
                <TouchableOpacity style={styles.retryBtn} onPress={() => refetchLogs()}>
                  <Text style={styles.retryBtnText}>Retry</Text>
                </TouchableOpacity>
              </View>
            )}

            {!loadingLogs && !errorLogs && filteredLogs.length === 0 && (
              <View style={styles.emptyBox}>
                <Text style={styles.emptyTitle}>No Matching Audit Logs</Text>
                <Text style={styles.emptySubtitle}>No recorded audit events match query.</Text>
              </View>
            )}

            {filteredLogs.map((log) => (
              <View key={log.id} style={styles.logCard}>
                <View style={styles.logCardHeader}>
                  <View style={styles.actionPill}>
                    <Text style={styles.actionText}>{log.action}</Text>
                  </View>
                  <Text style={styles.logTimestamp}>{formatDate(log.timestamp)}</Text>
                </View>

                <View style={styles.logActorRow}>
                  <Text style={styles.logActorLabel}>Actor:</Text>
                  <Text style={styles.logActorValue}>
                    {log.user
                      ? `${log.user.firstName} ${log.user.lastName} (${log.user.role})`
                      : 'System Internal'}
                  </Text>
                </View>

                <View style={styles.logEntityRow}>
                  <Text style={styles.logMetaText}>
                    Target: <Text style={styles.mono}>{log.entityType}</Text>
                  </Text>
                  {log.ipAddress && (
                    <Text style={styles.logMetaText}>
                      IP: <Text style={styles.mono}>{log.ipAddress}</Text>
                    </Text>
                  )}
                </View>

                {log.details && (
                  <View style={styles.detailsBox}>
                    <Text style={styles.detailsText} numberOfLines={2}>
                      {JSON.stringify(log.details)}
                    </Text>
                  </View>
                )}
              </View>
            ))}
          </View>
        )}

        {/* TAB 2: STAFF DIRECTORY */}
        {activeTab === 'USERS' && (
          <View style={styles.usersList}>
            {loadingUsers && (
              <View style={styles.loadingBox}>
                <ActivityIndicator size="large" color="#0F766E" />
                <Text style={styles.loadingText}>Fetching staff directory...</Text>
              </View>
            )}

            {errorUsers && !loadingUsers && (
              <View style={styles.errorBox}>
                <Text style={styles.errorTitle}>Error Loading Users</Text>
                <Text style={styles.errorText}>Could not retrieve staff directory.</Text>
                <TouchableOpacity style={styles.retryBtn} onPress={() => refetchUsers()}>
                  <Text style={styles.retryBtnText}>Retry</Text>
                </TouchableOpacity>
              </View>
            )}

            {staffUsers.map((u) => (
              <View key={u.id} style={styles.userCard}>
                <View style={styles.userCardHeader}>
                  <View style={styles.userRolePill}>
                    <Text style={styles.userRoleText}>{u.role}</Text>
                  </View>
                  <View
                    style={[
                      styles.activePill,
                      u.isActive ? styles.activePillYes : styles.activePillNo,
                    ]}
                  >
                    <Text
                      style={[
                        styles.activeText,
                        u.isActive ? styles.activeTextYes : styles.activeTextNo,
                      ]}
                    >
                      {u.isActive ? 'Active' : 'Suspended'}
                    </Text>
                  </View>
                </View>

                <Text style={styles.userFullName}>
                  {u.firstName} {u.lastName}
                </Text>
                <Text style={styles.userEmailText}>{u.email}</Text>

                <View style={styles.userMetaRow}>
                  <Text style={styles.userMetaText}>
                    Enrolled: {formatDate(u.createdAt)}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* TAB 3: SECURITY POSTURE */}
        {activeTab === 'SECURITY' && (
          <View style={styles.securitySection}>
            <View style={styles.securityHeaderCard}>
              <Text style={styles.securityStatusHeading}>
                Active Hospital Security Posture
              </Text>
              <Text style={styles.securityStatusSub}>
                Enforced by RadAxis RIS Enterprise Core Architecture
              </Text>
            </View>

            <View style={styles.securityControlCard}>
              <Text style={styles.controlHeading}>AUTHENTICATION & SESSIONS</Text>
              <View style={styles.controlRow}>
                <Text style={styles.controlLabel}>Token Standard:</Text>
                <Text style={styles.controlValue}>JWT with Signed Secret Key</Text>
              </View>
              <View style={styles.controlRow}>
                <Text style={styles.controlLabel}>Session Expiry:</Text>
                <Text style={styles.controlValue}>8 Hours with Inactive Revocation</Text>
              </View>
              <View style={styles.controlRow}>
                <Text style={styles.controlLabel}>Patient Portal:</Text>
                <Text style={styles.controlValue}>Isolated OTP Verification Route</Text>
              </View>
            </View>

            <View style={styles.securityControlCard}>
              <Text style={styles.controlHeading}>ROLE-BASED ACCESS CONTROL (RBAC)</Text>
              <View style={styles.controlRow}>
                <Text style={styles.controlLabel}>Enforced Roles:</Text>
                <Text style={styles.controlValue}>
                  ADMIN, RADIOLOGIST, TECHNOLOGIST, RECEPTION
                </Text>
              </View>
              <View style={styles.controlRow}>
                <Text style={styles.controlLabel}>Data Isolation:</Text>
                <Text style={styles.controlValue}>
                  Strict barrier between Staff and Patient routes
                </Text>
              </View>
            </View>

            <View style={styles.securityControlCard}>
              <Text style={styles.controlHeading}>AUDIT TRAIL & LOG RETENTION</Text>
              <View style={styles.controlRow}>
                <Text style={styles.controlLabel}>Audit Trail:</Text>
                <Text style={styles.controlValue}>Permanent Immutability in Database</Text>
              </View>
              <View style={styles.controlRow}>
                <Text style={styles.controlLabel}>Log Integrity:</Text>
                <Text style={styles.controlValue}>
                  Actor IP Address & User-Agent capture
                </Text>
              </View>
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  backText: {
    fontSize: 24,
    color: '#0F172A',
    lineHeight: 26,
  },
  headerTitleBlock: {
    flex: 1,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  headerSubtitle: {
    fontSize: 11,
    color: '#64748B',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  rbacGateContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  rbacShieldBox: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  rbacShieldIcon: {
    fontSize: 36,
  },
  rbacTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 8,
    textAlign: 'center',
  },
  rbacSubtitle: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  backHomeBtn: {
    backgroundColor: '#0F766E',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 8,
  },
  backHomeBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  kpiGrid: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  kpiCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  kpiLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: '#64748B',
    textTransform: 'uppercase',
  },
  kpiValue: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
    fontFamily: 'SpaceMono',
    marginTop: 4,
  },
  kpiSmallFont: {
    fontSize: 11,
  },
  kpiSuccess: {
    color: '#059669',
  },
  tabsRow: {
    flexDirection: 'row',
    backgroundColor: '#E2E8F0',
    borderRadius: 10,
    padding: 3,
    marginBottom: 12,
    gap: 4,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8,
  },
  tabButtonActive: {
    backgroundColor: '#0F766E',
  },
  tabButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
  },
  tabButtonTextActive: {
    color: '#FFFFFF',
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 10,
  },
  searchIcon: {
    fontSize: 14,
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: '#0F172A',
    paddingVertical: 0,
  },
  clearText: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
  },
  auditList: {
    gap: 10,
  },
  loadingBox: {
    paddingVertical: 32,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 8,
    fontSize: 12,
    color: '#64748B',
  },
  errorBox: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
    borderWidth: 1,
    borderRadius: 10,
    padding: 16,
    alignItems: 'center',
    marginVertical: 12,
  },
  errorTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#991B1B',
    marginBottom: 4,
  },
  errorText: {
    fontSize: 11,
    color: '#7F1D1D',
    marginBottom: 8,
  },
  retryBtn: {
    backgroundColor: '#DC2626',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  retryBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  emptyBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginVertical: 12,
  },

  emptyTitle: {
  fontSize: 14,
  fontWeight: '800',
  color: '#0F172A',
  marginBottom: 4,
},
  emptySubtitle: {
  fontSize: 11,
  color: '#64748B',
  textAlign: 'center',
},
  logCard: {
  backgroundColor: '#FFFFFF',
  borderRadius: 12,
  padding: 12,
  borderWidth: 1,
  borderColor: '#E2E8F0',
},
  logCardHeader: {
  flexDirection: 'row',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: 6,
  flexWrap: 'wrap',
  gap: 4,
},
  actionPill: {
  backgroundColor: '#F1F5F9',
  paddingHorizontal: 8,
  paddingVertical: 3,
  borderRadius: 4,
  maxWidth: '65%',
},
  actionText: {
  fontSize: 10,
  fontWeight: '800',
  color: '#0F766E',
  fontFamily: 'SpaceMono',
},
  logTimestamp: {
  fontSize: 10,
  color: '#64748B',
  fontFamily: 'SpaceMono',
},
  logActorRow: {
  flexDirection: 'row',
  alignItems: 'center',
  marginBottom: 4,
  flexWrap: 'wrap',
},
  logActorLabel: {
  fontSize: 11,
  color: '#64748B',
  marginRight: 6,
},
  logActorValue: {
  fontSize: 11,
  fontWeight: '700',
  color: '#0F172A',
  flexShrink: 1,
},
  logEntityRow: {
  flexDirection: 'row',
  justifyContent: 'space-between',
  marginBottom: 6,
  flexWrap: 'wrap',
  gap: 4,
},
  logMetaText: {
  fontSize: 10,
  color: '#64748B',
},
  mono: {
  fontFamily: 'SpaceMono',
  color: '#334155',
},
  detailsBox: {
  backgroundColor: '#F8FAFC',
  borderRadius: 6,
  padding: 6,
},
  detailsText: {
  fontSize: 10,
  color: '#475569',
  fontFamily: 'SpaceMono',
},
  usersList: {
  gap: 10,
},
  userCard: {
  backgroundColor: '#FFFFFF',
  borderRadius: 12,
  padding: 14,
  borderWidth: 1,
  borderColor: '#E2E8F0',
},
  userCardHeader: {
  flexDirection: 'row',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: 6,
},
  userRolePill: {
  backgroundColor: '#EFF6FF',
  paddingHorizontal: 8,
  paddingVertical: 3,
  borderRadius: 4,
},
  userRoleText: {
  fontSize: 10,
  fontWeight: '800',
  color: '#1D4ED8',
},
  activePill: {
  paddingHorizontal: 8,
  paddingVertical: 2,
  borderRadius: 999,
},
  activePillYes: {
  backgroundColor: '#F0FDF4',
},
  activePillNo: {
  backgroundColor: '#FEF2F2',
},
  activeText: {
  fontSize: 10,
  fontWeight: '700',
},
  activeTextYes: {
  color: '#166534',
},
  activeTextNo: {
  color: '#991B1B',
},
  userFullName: {
  fontSize: 14,
  fontWeight: '800',
  color: '#0F172A',
  marginBottom: 2,
},
  userEmailText: {
  fontSize: 12,
  color: '#64748B',
  marginBottom: 6,
},
  userMetaRow: {
  borderTopWidth: 1,
  borderTopColor: '#F1F5F9',
  paddingTop: 6,
},
  userMetaText: {
  fontSize: 10,
  color: '#94A3B8',
},
  securitySection: {
  gap: 12,
},
  securityHeaderCard: {
  backgroundColor: '#FFFFFF',
  borderRadius: 12,
  padding: 20,
  alignItems: 'center',
  borderWidth: 1,
  borderColor: '#E2E8F0',
},
  securityShieldCircle: {
  width: 60,
  height: 60,
  borderRadius: 30,
  backgroundColor: '#F0FDF4',
  alignItems: 'center',
  justifyContent: 'center',
  marginBottom: 10,
},
  securityShieldIcon: {
  fontSize: 32,
},
  securityStatusHeading: {
  fontSize: 16,
  fontWeight: '800',
  color: '#0F172A',
  marginBottom: 4,
},
  securityStatusSub: {
  fontSize: 12,
  color: '#64748B',
  textAlign: 'center',
},
  securityControlCard: {
  backgroundColor: '#FFFFFF',
  borderRadius: 12,
  padding: 14,
  borderWidth: 1,
  borderColor: '#E2E8F0',
  gap: 8,
},
  controlHeading: {
  fontSize: 10,
  fontWeight: '800',
  color: '#0F766E',
  letterSpacing: 0.5,
  marginBottom: 4,
},
  controlRow: {
  flexDirection: 'row',
  justifyContent: 'space-between',
  alignItems: 'center',
},
  controlLabel: {
  fontSize: 11,
  color: '#64748B',
},
  controlValue: {
  fontSize: 11,
  fontWeight: '700',
  color: '#0F172A',
},
});
