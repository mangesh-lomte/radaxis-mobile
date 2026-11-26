import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { Redirect } from 'expo-router';

import { useAuth } from '@/src/auth/AuthContext';
import { usePatientAuth } from '@/src/auth/PatientAuthContext';

export default function Index() {
  const { isLoading: isStaffLoading, isAuthenticated: isStaffAuth } = useAuth();
  const { isPatientLoading, isPatientAuthenticated } = usePatientAuth();

  if (isStaffLoading || isPatientLoading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#0891B2" />
      </View>
    );
  }

  const isDevPreview = __DEV__ && process.env.EXPO_PUBLIC_DEV_PREVIEW_MODE === 'true';
  if (isStaffAuth || isDevPreview) {
    return <Redirect href="/(app)/(tabs)/home" />;
  }

  if (isPatientAuthenticated) {
    return <Redirect href="/(patient)/(tabs)/home" />;
  }

  return <Redirect href="/(auth)/login" />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAFC',
  },
});
