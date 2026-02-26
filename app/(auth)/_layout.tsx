import { Redirect, Stack } from 'expo-router';

import { useAuth } from '@/context/auth';

export default function AuthLayout() {
  const { user, isLoading } = useAuth();

  if (!isLoading && user) {
    return <Redirect href="/(tabs)" />;
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="login" />
      <Stack.Screen name="verify" />
      <Stack.Screen name="register" />
    </Stack>
  );
}
