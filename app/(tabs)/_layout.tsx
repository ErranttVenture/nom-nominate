/**
 * Tab layout — themed tab bar matching app palette.
 * Uses the same Icon set as the rest of the app.
 */

import React from 'react';
import { Tabs } from 'expo-router';
import { Icon } from '@/components/nom';
import { useTheme } from '@/theme/ThemeContext';
import { FONT, STROKE } from '@/theme/tokens';

export default function TabLayout() {
  const theme = useTheme();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.action,
        tabBarInactiveTintColor: theme.textSoft,
        tabBarStyle: {
          backgroundColor: theme.surface,
          borderTopColor: theme.borderStrong,
          borderTopWidth: STROKE.std,
          height: 84,
          paddingTop: 8,
          paddingBottom: 28,
        },
        tabBarLabelStyle: {
          fontFamily: FONT.mono,
          fontSize: 10,
          letterSpacing: 1.5,
          textTransform: 'uppercase',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'parties',
          tabBarIcon: ({ color }) => <Icon name="users" size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: 'history',
          tabBarIcon: ({ color }) => <Icon name="star" size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'settings',
          tabBarIcon: ({ color }) => <Icon name="settings" size={24} color={color} />,
        }}
      />
    </Tabs>
  );
}
