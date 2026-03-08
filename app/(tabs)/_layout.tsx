import { Redirect, Tabs } from 'expo-router';
import React from 'react';

import { useAuth } from '@/context/auth';

export default function TabLayout() {
  const { user, isLoading } = useAuth();

  if (!isLoading && !user) {
    return <Redirect href="/(auth)/login" />;
  }

  return (
    <Tabs screenOptions={{ headerShown: false, tabBarStyle: { display: 'none' } }}>
      <Tabs.Screen name="index" />
      <Tabs.Screen name="profile" />
      <Tabs.Screen name="contacts" />
      <Tabs.Screen name="create-group" />
      <Tabs.Screen name="settings" />
    </Tabs>
  );
}
