import React from 'react';
import { Stack } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StatusBar } from 'react-native';
import { useAuthListener } from '@/hooks/useAuth';
import { COLORS } from '@/constants';

export default function RootLayout() {
  useAuthListener();

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StatusBar barStyle="dark-content" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: COLORS.background },
          animation: 'slide_from_right',
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="auth" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen
          name="party/create"
          options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
        />
        <Stack.Screen name="party/[id]" />
        <Stack.Screen name="party/swipe" />
        <Stack.Screen
          name="party/success"
          options={{ presentation: 'fullScreenModal', gestureEnabled: false }}
        />
        <Stack.Screen name="party/results" />
        <Stack.Screen
          name="solo/index"
          options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
        />
        <Stack.Screen name="solo/browse" />
        <Stack.Screen name="tutorial" />
      </Stack>
    </GestureHandlerRootView>
  );
}
