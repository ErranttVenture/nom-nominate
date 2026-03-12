import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, PARTY } from '@/constants';
import { useAuthStore } from '@/stores/authStore';
import { PartyService } from '@/lib/services';

export default function CreatePartyScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);

  const [name, setName] = useState('');
  const [zipCode, setZipCode] = useState('');
  const [radius, setRadius] = useState<5 | 10 | 15 | 25>(PARTY.DEFAULT_RADIUS_MILES as 10);
  const [dateText, setDateText] = useState('');
  const [loading, setLoading] = useState(false);

  const handleCreate = async () => {
    if (!name.trim()) {
      Alert.alert('Missing Name', 'Give your party a name!');
      return;
    }
    if (!/^\d{5}$/.test(zipCode)) {
      Alert.alert('Invalid Zip Code', 'Please enter a valid 5-digit zip code.');
      return;
    }
    if (!user) return;

    setLoading(true);
    try {
      const partyId = await PartyService.createParty({
        name: name.trim(),
        zipCode,
        radiusMiles: radius,
        date: dateText.trim() || undefined,
        creatorId: user.id,
      });
      router.replace(`/party/${partyId}`);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to create party.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backBtnText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>New Party</Text>
      </View>

      <ScrollView style={styles.form} keyboardShouldPersistTaps="handled">
        {/* Party Name */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>PARTY NAME</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Friday Night Dinner 🌮"
            placeholderTextColor="#b2bec3"
            value={name}
            onChangeText={setName}
            autoFocus
            maxLength={40}
          />
        </View>

        {/* Zip Code */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>ZIP CODE</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter zip code"
            placeholderTextColor="#b2bec3"
            value={zipCode}
            onChangeText={setZipCode}
            keyboardType="number-pad"
            maxLength={5}
          />
        </View>

        {/* Date (optional) */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>DATE (OPTIONAL)</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Sat, Mar 14"
            placeholderTextColor="#b2bec3"
            value={dateText}
            onChangeText={setDateText}
            maxLength={20}
          />
        </View>

        {/* Search Radius */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>SEARCH RADIUS</Text>
          <View style={styles.radiusOptions}>
            {PARTY.RADIUS_OPTIONS.map((r) => (
              <TouchableOpacity
                key={r}
                style={[styles.radiusOption, radius === r && styles.radiusSelected]}
                onPress={() => setRadius(r as typeof radius)}
              >
                <Text
                  style={[styles.radiusText, radius === r && styles.radiusTextSelected]}
                >
                  {r} mi
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Create Button */}
        <TouchableOpacity
          style={[styles.createBtn, loading && styles.createBtnDisabled]}
          onPress={handleCreate}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.createBtnText}>Create Party 🎉</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 24,
    paddingBottom: 16,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  backBtnText: { fontSize: 18 },
  headerTitle: { fontSize: 22, fontWeight: '800', color: COLORS.text },
  form: { flex: 1, paddingHorizontal: 24 },
  formGroup: { marginBottom: 20 },
  label: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.5,
    color: COLORS.textLight,
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    fontSize: 16,
    color: COLORS.text,
    borderWidth: 2,
    borderColor: COLORS.border,
  },
  radiusOptions: { flexDirection: 'row', gap: 8 },
  radiusOption: {
    flex: 1,
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: COLORS.border,
    alignItems: 'center',
  },
  radiusSelected: {
    borderColor: COLORS.primary,
    backgroundColor: 'rgba(255,107,53,0.08)',
  },
  radiusText: { fontSize: 14, fontWeight: '600', color: COLORS.text },
  radiusTextSelected: { color: COLORS.primary },
  createBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 16,
    padding: 18,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 40,
  },
  createBtnDisabled: { opacity: 0.7 },
  createBtnText: { color: '#fff', fontSize: 17, fontWeight: '700' },
});
