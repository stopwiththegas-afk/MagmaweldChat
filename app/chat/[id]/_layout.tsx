import { Stack } from 'expo-router';

export default function ChatIdLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="group-info" />
    </Stack>
  );
}
