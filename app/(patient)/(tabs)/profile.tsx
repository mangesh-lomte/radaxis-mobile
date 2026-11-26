import React from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { usePatientAuth } from '@/src/auth/PatientAuthContext';
import { Colors } from '@/src/theme/colors';
import { API_BASE_URL } from '@/src/constants/config';
import { isProductionHost } from '@/src/constants/environment';

export default function PatientProfileScreen() {
  const router = useRouter();
  const { patient, patientLogout } = usePatientAuth();
  const isHttps = API_BASE_URL.startsWith('https://');
  const isProduction = isProductionHost(API_BASE_URL);

  const handleLogout = () => {
    Alert.alert(
      'Sign Out of Patient Portal',
      'Are you sure you want to end your patient portal session? You can sign back in anytime with your mobile number.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            await patientLogout();
            router.replace('/(auth)/login');
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Patient Profile</Text>
        <Text style={styles.headerSubtitle}>Verified Patient Demographics & Security</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Digital Identity Card */}
        <View style={styles.identityCard}>
          <View style={styles.identityCardTop}>
            <View style={styles.avatarCircle}>
              <Text style={styles.avatarText}>
                {patient?.firstName?.[0] || 'P'}
                {patient?.lastName?.[0] || 'T'}
              </Text>
            </View>
            <View style={styles.identityInfo}>
              <Text style={styles.patientName}>
                {patient?.firstName} {patient?.lastName}
              </Text>
              <Text style={styles.patientSub}>RadAxis Verified Health Identity</Text>
            </View>
            <View style={styles.verifiedBadge}>
              <Text style={styles.verifiedBadgeText}>VERIFIED</Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.metaRow}>
            <View style={styles.metaCol}>
              <Text style={styles.metaLabel}>MEDICAL RECORD NUMBER (MRN)</Text>
              <Text style={styles.metaValueHighlight}>{patient?.patientId || 'PAT-0000'}</Text>
            </View>
            <View style={styles.metaCol}>
              <Text style={styles.metaLabel}>DATE OF BIRTH</Text>
              <Text style={styles.metaValue}>
                {patient?.dateOfBirth ? patient.dateOfBirth.slice(0, 10) : '—'}
              </Text>
            </View>
          </View>

          <View style={[styles.metaRow, { marginTop: 12 }]}>
            <View style={styles.metaCol}>
              <Text style={styles.metaLabel}>GENDER</Text>
              <Text style={styles.metaValue}>{patient?.gender || '—'}</Text>
            </View>
            <View style={styles.metaCol}>
              <Text style={styles.metaLabel}>REGISTERED MOBILE PHONE</Text>
              <Text style={styles.metaValue}>{patient?.phone || '—'}</Text>
            </View>
          </View>
        </View>

        {/* Radiology Network Section */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionHeader}>RADIOLOGY NETWORK</Text>
          <View style={styles.facilityRow}>
            <View style={styles.facilityInfo}>
              <Text style={styles.facilityName}>RadAxis Imaging Network</Text>
              <Text style={styles.facilityAddress}>Connected Radiology Information System</Text>
              <Text style={styles.facilityHours}>Digital Patient Access • Diagnostic Records Portal</Text>
            </View>
          </View>
        </View>

        {/* Security & Data Privacy Section */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionHeader}>DATA PRIVACY & SECURITY</Text>
          <View style={styles.securityRow}>
            <View style={styles.securityInfo}>
              <Text style={styles.securityTitle}>
                Encrypted Transport & Token Security
              </Text>
              <Text style={styles.securityBody}>
                Patient access tokens are cryptographically signed and securely stored in device SecureStore.
              </Text>
            </View>
          </View>

          <View style={styles.securityRow}>
            <View style={styles.securityInfo}>
              <Text style={styles.securityTitle}>Role-Based Route Isolation</Text>
              <Text style={styles.securityBody}>
                Patient session tokens are strictly restricted to public portal endpoints. Staff-only routes and clinical
                worklists cannot be accessed.
              </Text>
            </View>
          </View>
        </View>

        {/* Logout Button */}
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.8}>
          <Text style={styles.logoutBtnText}>Sign Out of Patient Portal</Text>
        </TouchableOpacity>

        <View style={styles.footerInfo}>
          <Text style={styles.footerText}>RadAxis RIS Mobile • Patient Edition v1.0.0</Text>
          <Text style={styles.footerSubText}>
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
  header: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.brand.navy,
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 32,
  },
  identityCard: {
    backgroundColor: '#0F172A',
    borderRadius: 16,
    padding: 18,
    marginBottom: 16,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 4,
  },
  identityCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.brand.emerald,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: {
    color: '#0F172A',
    fontSize: 18,
    fontWeight: '800',
  },
  identityInfo: {
    flex: 1,
  },
  patientName: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  patientSub: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 1,
  },
  verifiedBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  verifiedBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: Colors.brand.emerald,
    letterSpacing: 0.5,
  },
  divider: {
    height: 1,
    backgroundColor: '#334155',
    marginVertical: 14,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  metaCol: {
    flex: 1,
  },
  metaLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: '#94A3B8',
    letterSpacing: 0.5,
    marginBottom: 3,
  },
  metaValue: {
    fontSize: 12,
    fontWeight: '600',
    color: '#F8FAFC',
  },
  metaValueHighlight: {
    fontSize: 13,
    fontWeight: '700',
    color: '#38BDF8',
  },
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  sectionHeader: {
    fontSize: 10,
    fontWeight: '800',
    color: '#94A3B8',
    letterSpacing: 0.8,
    marginBottom: 12,
  },
  facilityRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  facilityIcon: {
    fontSize: 20,
    marginRight: 10,
    marginTop: 2,
  },
  facilityInfo: {
    flex: 1,
  },
  facilityName: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.brand.navy,
  },
  facilityAddress: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  facilityHours: {
    fontSize: 11,
    color: '#059669',
    marginTop: 4,
    fontWeight: '500',
  },
  securityRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  securityIcon: {
    fontSize: 16,
    marginRight: 10,
    marginTop: 1,
  },
  securityInfo: {
    flex: 1,
  },
  securityTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.brand.navy,
  },
  securityBody: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
    lineHeight: 15,
  },
  logoutBtn: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 20,
  },
  logoutBtnText: {
    color: '#DC2626',
    fontSize: 13,
    fontWeight: '700',
  },
  footerInfo: {
    alignItems: 'center',
    paddingBottom: 16,
  },
  footerText: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '600',
  },
  footerSubText: {
    fontSize: 10,
    color: '#CBD5E1',
    marginTop: 2,
  },
});
