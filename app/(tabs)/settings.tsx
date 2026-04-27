/**
 * Settings — profile card, settings list, sign-out.
 * Uses the paper-card + chunky-shadow language.
 */

import React from 'react';
import { View, Pressable, Alert, Linking, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuthStore } from '@/stores/authStore';
import { AuthService } from '@/lib/services';
import { NomText } from '@/theme/NomText';
import { useTheme } from '@/theme/ThemeContext';
import { RADIUS, SPACE, STROKE } from '@/theme/tokens';
import { Avatar, NomButton, Icon } from '@/components/nom';
import type { IconName } from '@/components/nom';

interface SettingsRow {
  icon: IconName;
  label: string;
  onPress: () => void;
}

export default function SettingsScreen() {
  const router = useRouter();
  const theme = useTheme();
  const user = useAuthStore((s) => s.user);

  const handleSignOut = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          await AuthService.signOut();
          router.replace('/auth');
        },
      },
    ]);
  };

  const rows: SettingsRow[] = [
    {
      icon: 'users',
      label: 'Notifications',
      onPress: () =>
        Alert.alert('Notifications', 'Push notifications coming soon'),
    },
    {
      icon: 'settings',
      label: 'Appearance',
      onPress: () =>
        Alert.alert(
          'Appearance',
          'Auto-switches with system light / dark mode.'
        ),
    },
    {
      icon: 'share',
      label: 'Privacy Policy',
      onPress: () => Linking.openURL('https://nom-nominate.web.app/privacy'),
    },
    {
      icon: 'forkknife',
      label: 'Help & Support',
      onPress: () => Linking.openURL('mailto:support@nomnominate.app'),
    },
  ];

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: theme.bg }}
      edges={['top']}
    >
      <View style={{ paddingHorizontal: SPACE[5], paddingBottom: SPACE[4] }}>
        <NomText variant="displayXL" color={theme.text}>
          settings
        </NomText>
      </View>

      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: SPACE[5],
          paddingBottom: SPACE[8],
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile card */}
        <Card>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: SPACE[4],
              padding: SPACE[4],
            }}
          >
            <Avatar
              name={user?.displayName ?? '?'}
              size={56}
              rotation={-4}
            />
            <View style={{ flex: 1 }}>
              <NomText variant="displayMd" color={theme.text}>
                {user?.displayName ?? 'user'}
              </NomText>
              <NomText variant="bodyMd" soft>
                {user?.phone ?? ''}
              </NomText>
            </View>
          </View>
        </Card>

        <View style={{ height: SPACE[5] }} />

        {/* Settings rows */}
        <Card>
          {rows.map((row, i) => (
            <Pressable
              key={row.label}
              onPress={row.onPress}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                padding: SPACE[4],
                borderBottomWidth: i < rows.length - 1 ? STROKE.std : 0,
                borderBottomColor: theme.border,
                gap: SPACE[3],
              }}
            >
              <Icon name={row.icon} size={20} color={theme.text} />
              <NomText variant="headingMd" color={theme.text} style={{ flex: 1 }}>
                {row.label}
              </NomText>
              <NomText variant="displayMd" faint>
                ›
              </NomText>
            </Pressable>
          ))}
        </Card>

        <View style={{ height: SPACE[6] }} />

        <NomButton
          label="SIGN OUT"
          variant="destruct"
          stretch
          onPress={handleSignOut}
        />

        <NomText
          variant="monoSm"
          faint
          center
          uppercase
          style={{ marginTop: SPACE[6], letterSpacing: 1.5 }}
        >
          NOM NOMINATE · V1.0.0
        </NomText>
      </ScrollView>
    </SafeAreaView>
  );
}

/** Reusable paper-card w/ chunky shadow backer. */
function Card({ children }: { children: React.ReactNode }) {
  const theme = useTheme();
  return (
    <View>
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          top: 3,
          left: 3,
          right: -3,
          bottom: -3,
          backgroundColor: theme.borderStrong,
          borderRadius: RADIUS.lg,
        }}
      />
      <View
        style={{
          backgroundColor: theme.surface,
          borderWidth: STROKE.std,
          borderColor: theme.borderStrong,
          borderRadius: RADIUS.lg,
          overflow: 'hidden',
        }}
      >
        {children}
      </View>
    </View>
  );
}
