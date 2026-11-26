import React, { useState } from 'react';
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuth } from '@/src/auth/AuthContext';
import { usePatientAuth } from '@/src/auth/PatientAuthContext';
import { AppButton } from '@/src/components/ui/AppButton';
import { AppInput } from '@/src/components/ui/AppInput';
import { API_BASE_URL } from '@/src/constants/config';
import { isProductionHost } from '@/src/constants/environment';
import { Colors } from '@/src/theme/colors';

type LoginMode = 'STAFF' | 'PATIENT';

export default function LoginScreen() {
  const router = useRouter();
  const { login: staffLogin, sessionExpiredMessage: staffSessionExpired } = useAuth();
  const {
    requestOtp,
    verifyOtp,
    patientSessionExpiredMessage,
    clearPatientSessionExpiredMessage,
  } = usePatientAuth();

  const [mode, setMode] = useState<LoginMode>('STAFF');

  // Staff Login State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [staffSubmitting, setStaffSubmitting] = useState(false);

  // Patient Login State
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [isExistingPatient, setIsExistingPatient] = useState(true);
  const [patientSubmitting, setPatientSubmitting] = useState(false);

  // Errors
  const [validationError, setValidationError] = useState<string | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);

  const resetErrors = () => {
    setValidationError(null);
    setAuthError(null);
  };

  const isHttps = API_BASE_URL.startsWith('https://');
  const isProduction = isProductionHost(API_BASE_URL);
  const isStaging = !isProduction;

  const handleStaffSignIn = async () => {
    resetErrors();
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setValidationError('Please enter your Clinical Staff ID or Email.');
      return;
    }
    if (!password) {
      setValidationError('Please enter your password.');
      return;
    }

    try {
      setStaffSubmitting(true);
      await staffLogin(trimmedEmail, password);
      router.replace('/(app)/(tabs)/home');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Invalid credentials. Please try again.';
      setAuthError(msg);
    } finally {
      setStaffSubmitting(false);
    }
  };

  const handleRequestOtp = async () => {
    resetErrors();
    const trimmedPhone = phone.trim();
    if (!trimmedPhone || trimmedPhone.length < 7) {
      setValidationError('Please enter a valid mobile phone number.');
      return;
    }

    try {
      setPatientSubmitting(true);
      const res = await requestOtp(trimmedPhone);
      setOtpSent(true);
      setIsExistingPatient(res.isExistingPatient);
      // Controlled staging-only behavior: auto-fill demo OTP only in non-production environments
      if (isStaging && res.demoOtp) {
        setOtp(res.demoOtp);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unable to send OTP. Please verify phone number.';
      setAuthError(msg);
    } finally {
      setPatientSubmitting(false);
    }
  };

  const handleVerifyOtp = async () => {
    resetErrors();
    const trimmedOtp = otp.trim();
    if (!trimmedOtp || trimmedOtp.length < 4) {
      setValidationError('Please enter the 6-digit verification code.');
      return;
    }

    if (!isExistingPatient) {
      if (!firstName.trim() || !lastName.trim() || !dateOfBirth.trim()) {
        setValidationError('First name, last name, and date of birth (YYYY-MM-DD) are required for new registration.');
        return;
      }
    }

    try {
      setPatientSubmitting(true);
      await verifyOtp({
        phone: phone.trim(),
        otp: trimmedOtp,
        firstName: firstName.trim() || undefined,
        lastName: lastName.trim() || undefined,
        dateOfBirth: dateOfBirth.trim() || undefined,
      });
      router.replace('/(patient)/(tabs)/home');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Invalid or expired OTP code. Please try again.';
      setAuthError(msg);
    } finally {
      setPatientSubmitting(false);
    }
  };

  const activeSessionExpired = mode === 'STAFF' ? staffSessionExpired : patientSessionExpiredMessage;
  const errorMessage = validationError || authError;

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Top Status Bar Meta Indicator */}
          <View style={styles.statusBarRow}>
            <View style={styles.networkStatusPill}>
              <View style={[styles.statusDot, { backgroundColor: '#10B981' }]} />
              <Text style={styles.networkStatusText}>
                Connected
              </Text>
            </View>
          </View>

          {/* Centered Brand Header */}
          <View style={styles.brandHeader}>
            <View style={styles.logoContainer}>
              <View style={styles.logoBadge}>
                <Image
                  source={require('@/assets/images/radaxis-logo.png')}
                  style={styles.logoImage}
                  resizeMode="contain"
                  accessibilityLabel="RadAxis Official Logo"
                />
              </View>
              <View style={styles.pulseRing} />
            </View>

            <View style={styles.titleRow}>
              <Text style={styles.brandTitle}>RadAxis RIS</Text>
              <View style={styles.mobileBadge}>
                <Text style={styles.mobileBadgeText}>MOBILE</Text>
              </View>
            </View>
            <Text style={styles.brandSubtitle}>
              Enterprise Radiology Information System
            </Text>

            {/* Connection Node Pill */}
            <View style={styles.nodePill}>
              <Text style={styles.nodeLabel}>RIS Gateway</Text>
              <Text style={styles.nodeDot}>•</Text>
              <Text style={styles.nodeStatus}>
                HTTPS Secure Endpoint
              </Text>
            </View>
          </View>

          {/* Form Surface Card */}
          <View style={styles.formCard}>
            {/* Persona Switcher Tabs */}
            <View style={styles.modeTabs}>
              <TouchableOpacity
                style={[styles.modeTab, mode === 'STAFF' && styles.modeTabActive]}
                onPress={() => {
                  setMode('STAFF');
                  resetErrors();
                }}
                activeOpacity={0.7}
              >
                <Text style={[styles.modeTabText, mode === 'STAFF' && styles.modeTabTextActive]}>
                  Clinical Staff
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modeTab, mode === 'PATIENT' && styles.modeTabActive]}
                onPress={() => {
                  setMode('PATIENT');
                  resetErrors();
                }}
                activeOpacity={0.7}
              >
                <Text style={[styles.modeTabText, mode === 'PATIENT' && styles.modeTabTextActive]}>
                  Patient Portal
                </Text>
              </TouchableOpacity>
            </View>

            {/* Session Expired Banner */}
            {activeSessionExpired ? (
              <View style={styles.warningBanner}>
                <Text style={styles.warningText}>{activeSessionExpired}</Text>
              </View>
            ) : null}

            {/* Error Message */}
            {errorMessage ? (
              <View style={styles.errorBanner}>
                <Text style={styles.errorText}>{errorMessage}</Text>
              </View>
            ) : null}

            {/* STAFF LOGIN VIEW */}
            {mode === 'STAFF' ? (
              <>
                <Text style={styles.formCardHeader}>CLINICAL STAFF SIGN IN</Text>

                <AppInput
                  label="Clinical Staff ID / Email"
                  value={email}
                  onChangeText={(text) => {
                    setEmail(text);
                    resetErrors();
                  }}
                  placeholder="e.g. admin@ris.local"
                  autoCapitalize="none"
                  keyboardType="email-address"
                  autoCorrect={false}
                />

                <AppInput
                  label="Password"
                  value={password}
                  onChangeText={(text) => {
                    setPassword(text);
                    resetErrors();
                  }}
                  placeholder="Enter authorized password"
                  secureTextEntry
                  autoCapitalize="none"
                  autoCorrect={false}
                />

                <AppButton
                  title="Sign In to Clinical Console"
                  onPress={handleStaffSignIn}
                  loading={staffSubmitting}
                  style={styles.signInButton}
                />

                {__DEV__ && (
                  <View style={styles.demoHelperPill}>
                    <Text style={styles.demoHelperText}>
                      Authorized Demo: <Text style={styles.demoHelperBold}>admin@ris.local</Text>
                    </Text>
                  </View>
                )}
              </>
            ) : (
              /* PATIENT PORTAL LOGIN VIEW */
              <>
                <Text style={styles.formCardHeader}>PATIENT SELF-SERVICE ACCESS</Text>
                <Text style={styles.patientSubhead}>
                  Access your appointments, examination preparations, diagnostic reports, and DICOM imaging.
                </Text>

                {!otpSent ? (
                  <>
                    <AppInput
                      label="Mobile Phone Number"
                      value={phone}
                      onChangeText={(text) => {
                        setPhone(text);
                        resetErrors();
                      }}
                      placeholder="e.g. +1-555-019-2831 or 555-0199"
                      keyboardType="phone-pad"
                      autoCorrect={false}
                    />

                    <AppButton
                      title="Send Verification Code (OTP)"
                      onPress={handleRequestOtp}
                      loading={patientSubmitting}
                      style={styles.signInButton}
                    />

                    {__DEV__ && (
                      <View style={styles.demoHelperPill}>
                        <Text style={styles.demoHelperText}>
                          Demo Patient A: <Text style={styles.demoHelperBold}>+1-555-019-2831</Text> (Jonathan Miller)
                        </Text>
                        <Text style={[styles.demoHelperText, { marginTop: 2 }]}>
                          Demo Patient B: <Text style={styles.demoHelperBold}>+1-555-014-9920</Text> (Margaret Chen)
                        </Text>
                        <Text style={[styles.demoHelperText, { marginTop: 2 }]}>
                          Verification: <Text style={styles.demoHelperBold}>Dynamic 6-digit code (auto-filled)</Text>
                        </Text>
                      </View>
                    )}
                  </>
                ) : (
                  <>
                    <View style={styles.otpNoticeBox}>
                      <Text style={styles.otpNoticeText}>
                        Verification code sent to <Text style={styles.boldText}>{phone}</Text>
                      </Text>
                      <TouchableOpacity
                        style={styles.changePhoneBtn}
                        onPress={() => {
                          setOtpSent(false);
                          setOtp('');
                          resetErrors();
                        }}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        activeOpacity={0.7}
                        accessibilityRole="button"
                        accessibilityLabel="Change phone number"
                      >
                        <Text style={styles.changePhoneText}>Change</Text>
                      </TouchableOpacity>
                    </View>

                    <AppInput
                      label="6-Digit Verification Code"
                      value={otp}
                      onChangeText={(text) => {
                        setOtp(text);
                        resetErrors();
                      }}
                      placeholder="Enter 6-digit code"
                      keyboardType="number-pad"
                      maxLength={6}
                      autoFocus
                    />

                    {!isExistingPatient && (
                      <>
                        <AppInput
                          label="First Name"
                          value={firstName}
                          onChangeText={setFirstName}
                          placeholder="Your first name"
                        />
                        <AppInput
                          label="Last Name"
                          value={lastName}
                          onChangeText={setLastName}
                          placeholder="Your last name"
                        />
                        <AppInput
                          label="Date of Birth (YYYY-MM-DD)"
                          value={dateOfBirth}
                          onChangeText={setDateOfBirth}
                          placeholder="1985-06-15"
                        />
                      </>
                    )}

                    <AppButton
                      title="Verify & Access Records"
                      onPress={handleVerifyOtp}
                      loading={patientSubmitting}
                      style={styles.signInButton}
                    />
                  </>
                )}
              </>
            )}
          </View>

          {/* Security & Audit Footer */}
          <View style={styles.footer}>
            <View style={styles.securityRow}>
              <Text style={styles.securityText}>
                Encrypted Transport (TLS) · Authenticated Session
              </Text>
            </View>
            <Text style={styles.endpointText} numberOfLines={1}>
              API: {API_BASE_URL}
            </Text>
            <Text style={styles.copyrightText}>
              RadAxis RIS Mobile · Clinical Precision System
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 32,
    justifyContent: 'center',
  },
  statusBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  networkStatusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
    marginRight: 6,
  },
  networkStatusText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#065F46',
    letterSpacing: 0.5,
  },
  brandHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  logoContainer: {
    position: 'relative',
    marginBottom: 10,
  },
  logoBadge: {
    width: 60,
    height: 60,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  logoImage: {
    width: 44,
    height: 44,
  },
  pulseRing: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: Colors.brand.emerald,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  brandTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.5,
  },
  mobileBadge: {
    backgroundColor: '#E0F2FE',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  mobileBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#0369A1',
    letterSpacing: 0.8,
  },
  brandSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
    fontWeight: '500',
  },
  nodePill: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    justifyContent: 'center',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  nodeIcon: {
    fontSize: 11,
    marginRight: 5,
  },
  nodeLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#334155',
  },
  nodeDot: {
    marginHorizontal: 5,
    color: '#CBD5E1',
    fontSize: 10,
  },
  nodeStatus: {
    fontSize: 11,
    color: '#059669',
    fontWeight: '600',
  },
  formCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: Colors.border.subtle,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    marginBottom: 20,
    maxWidth: 440,
    width: '100%',
    alignSelf: 'center',
  },
  modeTabs: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 10,
    padding: 3,
    marginBottom: 16,
  },
  modeTab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8,
  },
  modeTabActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  modeTabText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  modeTabTextActive: {
    color: Colors.brand.navy,
    fontWeight: '700',
  },
  formCardHeader: {
    fontSize: 11,
    fontWeight: '800',
    color: '#94A3B8',
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  patientSubhead: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 14,
    lineHeight: 17,
  },
  warningBanner: {
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: 8,
    padding: 10,
    marginBottom: 14,
  },
  warningText: {
    color: '#B45309',
    fontSize: 12,
    fontWeight: '600',
  },
  errorBanner: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 8,
    padding: 10,
    marginBottom: 14,
  },
  errorText: {
    color: '#B91C1C',
    fontSize: 12,
    fontWeight: '600',
  },
  signInButton: {
    marginTop: 8,
  },
  demoHelperPill: {
    marginTop: 12,
    padding: 8,
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  demoHelperText: {
    fontSize: 11,
    color: '#64748B',
  },
  demoHelperBold: {
    fontWeight: '700',
    color: Colors.brand.navy,
  },
  otpNoticeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 12,
    paddingHorizontal: 2,
  },
  otpNoticeText: {
    flex: 1,
    flexShrink: 1,
    minWidth: 0,
    fontSize: 12,
    color: '#475569',
    lineHeight: 18,
  },
  boldText: {
    fontWeight: '700',
    color: Colors.brand.navy,
  },
  changePhoneBtn: {
    flexShrink: 0,
    marginLeft: 8,
    paddingVertical: 4,
    paddingHorizontal: 4,
  },
  changePhoneText: {
    fontSize: 12,
    color: Colors.brand.emeraldDark,
    fontWeight: '700',
  },
  footer: {
    alignItems: 'center',
  },
  securityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  securityIcon: {
    fontSize: 12,
    marginRight: 5,
  },
  securityText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#475569',
  },
  endpointText: {
    fontSize: 10,
    color: '#94A3B8',
    fontFamily: 'SpaceMono',
    marginBottom: 4,
  },
  copyrightText: {
    fontSize: 10,
    color: '#CBD5E1',
  },
});
