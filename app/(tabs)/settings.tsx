import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { COLORS } from '@/constants';
import { useAuthStore } from '@/stores/authStore';
import { AuthService } from '@/lib/services';

export default function SettingsScreen() {
  const router = useRouter();
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

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Settings</Text>
      </View>

      <View style={styles.content}>
        {/* Profile Section */}
        <View style={styles.profileSection}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {user?.displayName?.charAt(0).toUpperCase() ?? '?'}
            </Text>
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>{user?.displayName ?? 'User'}</Text>
            <Text style={styles.profilePhone}>{user?.phone ?? ''}</Text>
          </View>
        </View>

        {/* Settings Items */}
        <View style={styles.section}>
          <TouchableOpacity style={styles.settingsItem} onPress={() => Alert.alert('Notifications', 'Push notifications coming soon')}>
            <Text style={styles.settingsIcon}>🔔</Text>
            <Text style={styles.settingsLabel}>Notifications</Text>
            <Text style={styles.settingsChevron}>›</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.settingsItem} onPress={() => Alert.alert('Appearance', 'Dark mode coming soon')}>
            <Text style={styles.settingsIcon}>🎨</Text>
            <Text style={styles.settingsLabel}>Appearance</Text>
            <Text style={styles.settingsChevron}>›</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.settingsItem} onPress={() => Linking.openURL('https://nom-nominate.web.app/privacy')}>
            <Text style={styles.settingsIcon}>📄</Text>
            <Text style={styles.settingsLabel}>Privacy Policy</Text>
            <Text style={styles.settingsChevron}>›</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.settingsItem} onPress={() => Linking.openURL('mailto:support@nomnominate.app')}>
            <Text style={styles.settingsIcon}>❓</Text>
            <Text style={styles.settingsLabel}>Help & Support</Text>
            <Text style={styles.settingsChevron}>›</Text>
          </TouchableOpacity>
        </View>

        {/* Sign Out */}
        <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>

        <Text style={styles.version}>Nom Nominate v1.0.0</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { paddingHorizontal: 24, paddingBottom: 16 },
  headerTitle: { fontSize: 28, fontWeight: '800', color: COLORS.text },
  content: { flex: 1, paddingHorizontal: 24 },
  profileSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: { color: '#fff', fontWeight: '800', fontSize: 22 },
  profileInfo: { flex: 1 },
  profileName: { fontSize: 18, fontWeight: '700', color: COLORS.text },
  profilePhone: { fontSize: 14, color: COLORS.textLight, marginTop: 2 },
  section: {
    backgroundColor: '#fff',
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  settingsItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5',
  },
  settingsIcon: { fontSize: 20, marginRight: 12 },
  settingsLabel: { flex: 1, fontSize: 16, fontWeight: '500', color: COLORS.text },
  settingsChevron: { fontSize: 22, color: COLORS.textLight },
  signOutButton: {
    padding: 16,
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.danger,
  },
  signOutText: { fontSize: 16, fontWeight: '600', color: COLORS.danger },
  version: {
    textAlign: 'center',
    color: COLORS.textLight,
    fontSize: 12,
    marginTop: 24,
  },
});
