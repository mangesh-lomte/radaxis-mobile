import { Stack, Redirect } from 'expo-router';
import { usePatientAuth } from '@/src/auth/PatientAuthContext';

export default function PatientLayout() {
  const { isPatientAuthenticated, isPatientLoading } = usePatientAuth();

  // Route isolation: Unauthenticated users or non-patients cannot access patient portal
  if (!isPatientLoading && !isPatientAuthenticated) {
    return <Redirect href="/(auth)/login" />;
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}
