import { Redirect, Stack } from 'expo-router';
import { useAuth } from '@/src/auth/AuthContext';
import { usePatientAuth } from '@/src/auth/PatientAuthContext';

export default function AuthLayout() {
  const { isAuthenticated: isStaffAuth } = useAuth();
  const { isPatientAuthenticated } = usePatientAuth();

  if (isStaffAuth) {
    return <Redirect href="/(app)/(tabs)/home" />;
  }

  if (isPatientAuthenticated) {
    return <Redirect href="/(patient)/(tabs)/home" />;
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}
