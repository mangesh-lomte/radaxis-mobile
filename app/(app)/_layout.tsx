import { Stack, Redirect } from 'expo-router';
import { useAuth } from '@/src/auth/AuthContext';
import { usePatientAuth } from '@/src/auth/PatientAuthContext';

export default function AppLayout() {
  const { isAuthenticated } = useAuth();
  const { isPatientAuthenticated } = usePatientAuth();

  // Route isolation: Patients cannot access staff-only routes
  if (isPatientAuthenticated && !isAuthenticated) {
    return <Redirect href="/(patient)/(tabs)/home" />;
  }

  // Production-safe preview bypass: strictly gated by __DEV__ AND EXPO_PUBLIC_DEV_PREVIEW_MODE
  const isDevPreview = __DEV__ && process.env.EXPO_PUBLIC_DEV_PREVIEW_MODE === 'true';
  if (!isAuthenticated && !isDevPreview) {
    return <Redirect href="/(auth)/login" />;
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}
