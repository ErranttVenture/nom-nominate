import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, PARTY } from '@/constants';

export default function SoloSetupScreen() {
  const router = useRouter();
  const [zipCode, setZipCode] = useState('');
  const [radius, setRadius] = useState<5 | 10 | 15 | 25>(PARTY.DEFAULT_RADIUS_MILES as 10);

  const handleStart = () => {
    if (!/^\d{5}$/.test(zipCode)) {
      Alert.alert('Invalid Zip Code', 'Please enter a valid 5-digit zip code.');
      return;
    }

    router.push({
      pathname: '/solo/browse',
      params: { zipCode, radius: String(radius) },
    });
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.replace('/')}>
          <Text style={styles.backBtnText}>🏠</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Solo Browse</Text>
      </View>

      <ScrollView style={styles.form} keyboardShouldPersistTaps="handled">
        <Text style={styles.description}>
          Browse restaurants on your own — no party needed! Just enter your zip code and start swiping.
        </Text>

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
            autoFocus
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

        {/* Start Button */}
        <TouchableOpacity
          style={styles.startBtn}
          onPress={handleStart}
        >
          <Text style={styles.startBtnText}>Start Browsing</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 24, paddingBottom: 16,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 12,
    backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
  },
  backBtnText: { fontSize: 18 },
  headerTitle: { fontSize: 22, fontWeight: '800', color: COLORS.text },
  description: {
    fontSize: 15, color: COLORS.textLight, lineHeight: 22,
    marginBottom: 24,
  },
  form: { flex: 1, paddingHorizontal: 24 },
  formGroup: { marginBottom: 20 },
  label: {
    fontSize: 13, fontWeight: '700', letterSpacing: 0.5,
    color: COLORS.textLight, marginBottom: 8,
  },
  input: {
    backgroundColor: '#fff', borderRadius: 14, padding: 16,
    fontSize: 16, color: COLORS.text,
    borderWidth: 2, borderColor: COLORS.border,
  },
  radiusOptions: { flexDirection: 'row', gap: 8 },
  radiusOption: {
    flex: 1, padding: 12, borderRadius: 12,
    backgroundColor: '#fff', borderWidth: 2,
    borderColor: COLORS.border, alignItems: 'center',
  },
  radiusSelected: {
    borderColor: COLORS.primary,
    backgroundColor: 'rgba(255,107,53,0.08)',
  },
  radiusText: { fontSize: 14, fontWeight: '600', color: COLORS.text },
  radiusTextSelected: { color: COLORS.primary },
  startBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 16, padding: 18,
    alignItems: 'center', marginTop: 8, marginBottom: 40,
  },
  startBtnText: { color: '#fff', fontSize: 17, fontWeight: '700' },
});
