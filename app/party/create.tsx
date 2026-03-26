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
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import DateTimePicker, {
  DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import { COLORS, PARTY } from '@/constants';
import { useAuthStore } from '@/stores/authStore';
import { PartyService } from '@/lib/services';

export default function CreatePartyScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);

  const [name, setName] = useState('');
  const [zipCode, setZipCode] = useState('');
  const [expectedMembers, setExpectedMembers] = useState<number>(2);
  const [radius, setRadius] = useState<5 | 10 | 15 | 25>(PARTY.DEFAULT_RADIUS_MILES as 10);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [loading, setLoading] = useState(false);

  const PARTY_SIZE_OPTIONS = [
    { label: '2', value: 2 },
    { label: '3', value: 3 },
    { label: '4', value: 4 },
    { label: '5', value: 5 },
    { label: '6', value: 6 },
    { label: '6+', value: 0 },
  ];

  const handleDateChange = (_event: DateTimePickerEvent, date?: Date) => {
    // On Android the picker closes automatically on selection or cancel
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
    }
    if (date) {
      setSelectedDate(date);
    }
  };

  const clearDate = () => {
    setSelectedDate(null);
  };

  /** Format Date as ISO string for Firestore/API: "2026-03-21" */
  const getDateISOString = (date: Date): string => {
    return date.toISOString().split('T')[0];
  };

  /** Format Date for display: "Sat, Mar 21" */
  const formatDateDisplay = (date: Date): string => {
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  };

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
        expectedMembers,
        date: selectedDate ? getDateISOString(selectedDate) : undefined,
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

        {/* Party Size */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>HOW MANY PEOPLE?</Text>
          <View style={styles.radiusOptions}>
            {PARTY_SIZE_OPTIONS.map((opt) => (
              <TouchableOpacity
                key={opt.label}
                style={[styles.radiusOption, expectedMembers === opt.value && styles.radiusSelected]}
                onPress={() => setExpectedMembers(opt.value)}
              >
                <Text
                  style={[styles.radiusText, expectedMembers === opt.value && styles.radiusTextSelected]}
                >
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Date (optional) — native date picker */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>DATE (OPTIONAL)</Text>
          {selectedDate ? (
            <View style={styles.dateRow}>
              <TouchableOpacity
                style={[styles.input, styles.dateDisplay]}
                onPress={() => setShowDatePicker(true)}
              >
                <Text style={styles.dateText}>
                  📅 {formatDateDisplay(selectedDate)}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.dateClearBtn} onPress={clearDate}>
                <Text style={styles.dateClearText}>✕</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              style={[styles.input, styles.dateButton]}
              onPress={() => setShowDatePicker(true)}
            >
              <Text style={styles.datePlaceholder}>📅 Add Date (Optional)</Text>
            </TouchableOpacity>
          )}

          {showDatePicker && (
            <DateTimePicker
              value={selectedDate || new Date()}
              mode="date"
              display={Platform.OS === 'ios' ? 'inline' : 'default'}
              minimumDate={new Date()}
              onChange={handleDateChange}
            />
          )}

          {/* iOS: show a Done button to dismiss the inline picker */}
          {Platform.OS === 'ios' && showDatePicker && (
            <TouchableOpacity
              style={styles.datePickerDone}
              onPress={() => setShowDatePicker(false)}
            >
              <Text style={styles.datePickerDoneText}>Done</Text>
            </TouchableOpacity>
          )}
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
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dateDisplay: {
    flex: 1,
  },
  dateText: {
    fontSize: 16,
    color: COLORS.text,
    fontWeight: '600',
  },
  dateButton: {},
  datePlaceholder: {
    fontSize: 16,
    color: '#b2bec3',
  },
  dateClearBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: COLORS.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dateClearText: {
    fontSize: 16,
    color: COLORS.textLight,
    fontWeight: '700',
  },
  datePickerDone: {
    alignSelf: 'flex-end',
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginTop: 4,
  },
  datePickerDoneText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.primary,
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
