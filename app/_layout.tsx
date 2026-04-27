import React from 'react';
import { Stack } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StatusBar, View, useColorScheme } from 'react-native';
import { useAuthListener } from '@/hooks/useAuth';
import { useInAppUpdate } from '@/hooks/useInAppUpdate';
import { useBrandFonts } from '@/theme/fonts';
import { ThemeProvider } from '@/theme/ThemeContext';
import { LIGHT_THEME, DARK_THEME } from '@/theme/tokens';

export default function RootLayout() {
  useAuthListener();
  useInAppUpdate();
  const fontsLoaded = useBrandFonts();
  const scheme = useColorScheme() ?? 'light';
  const palette = scheme === 'dark' ? DARK_THEME : LIGHT_THEME;

  // Hold render until brand fonts load — the whole UI leans on them.
  if (!fontsLoaded) {
    return <View style={{ flex: 1, backgroundColor: palette.bg }} />;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider>
        <StatusBar
          barStyle={scheme === 'dark' ? 'light-content' : 'dark-content'}
        />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: palette.bg },
            animation: 'slide_from_right',
          }}
        >
          <Stack.Screen name="index" />
          <Stack.Screen name="auth" />
          <Stack.Screen name="(tabs)" />
          <Stack.Screen
            name="party/create"
            options={{
              presentation: 'modal',
              animation: 'slide_from_bottom',
            }}
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
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
