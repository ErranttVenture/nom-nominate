/**
 * Create Party — modal with form inputs, party size / radius chips, optional date.
 *
 * Visual: paper background, ink-bordered inputs with "chunky" focus state,
 * sticker-style selection chips for party size and radius, primary CTA at bottom.
 */

import React, { useState } from 'react';
import {
  View,
  TextInput,
  ScrollView,
  Alert,
  Platform,
  Pressable,
  KeyboardAvoidingView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import DateTimePicker, {
  DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import { PARTY } from '@/constants';
import { useAuthStore } from '@/stores/authStore';
import { PartyService } from '@/lib/services';
import { NomText } from '@/theme/NomText';
import { useTheme } from '@/theme/ThemeContext';
import { RADIUS, SPACE, STROKE } from '@/theme/tokens';
import { NomButton, IconButton, Sticker, Icon } from '@/components/nom';

const PARTY_SIZE_OPTIONS: { label: string; value: number }[] = [
  { label: '2', value: 2 },
  { label: '3', value: 3 },
  { label: '4', value: 4 },
  { label: '5', value: 5 },
  { label: '6', value: 6 },
  { label: '6+', value: 0 },
];

// Alternating rotations for sticker chips — gives the hand-placed feel.
const CHIP_TILTS = [-3, 2, -2, 3, -3, 2];

export default function CreatePartyScreen() {
  const router = useRouter();
  const theme = useTheme();
  const user = useAuthStore((s) => s.user);

  const [name, setName] = useState('');
  const [zipCode, setZipCode] = useState('');
  const [expectedMembers, setExpectedMembers] = useState<number>(2);
  const [radius, setRadius] = useState<5 | 10 | 15 | 25>(
    PARTY.DEFAULT_RADIUS_MILES as 10
  );
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [loading, setLoading] = useState(false);
  const [focused, setFocused] = useState<'name' | 'zip' | null>(null);

  const handleDateChange = (_event: DateTimePickerEvent, date?: Date) => {
    // Android closes automatically.
    if (Platform.OS === 'android') setShowDatePicker(false);
    if (date) setSelectedDate(date);
  };

  const clearDate = () => setSelectedDate(null);

  /** Format Date as ISO string for Firestore/API: "2026-03-21" */
  const getDateISOString = (date: Date): string =>
    date.toISOString().split('T')[0];

  /** Format Date for display: "Sat, Mar 21" */
  const formatDateDisplay = (date: Date): string =>
    date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });

  const handleCreate = async () => {
    if (!name.trim()) {
      Alert.alert('Missing Name', 'Give your party a name!');
      return;
    }
    if (!/^\d{5}$/.test(zipCode)) {
      Alert.alert('Invalid Zip Code', 'enter a valid 5-digit zip code.');
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

  const inputStyle = (isFocused: boolean) => ({
    backgroundColor: theme.surface,
    borderRadius: RADIUS.lg,
    paddingHorizontal: SPACE[4],
    paddingVertical: SPACE[3] + 2,
    fontSize: 18,
    fontFamily: 'PatrickHand',
    color: theme.text,
    borderWidth: isFocused ? STROKE.chunky : STROKE.std,
    borderColor: isFocused ? theme.action : theme.borderStrong,
  });

  const SectionLabel = ({ children }: { children: string }) => (
    <NomText
      variant="monoSm"
      soft
      uppercase
      style={{ marginBottom: SPACE[2], letterSpacing: 1.5 }}
    >
      {children}
    </NomText>
  );

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: theme.bg }}
      edges={['top']}
    >
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Header */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: SPACE[3],
            paddingHorizontal: SPACE[5],
            paddingBottom: SPACE[3],
          }}
        >
          <IconButton name="back" size={44} onPress={() => router.back()} />
          <View style={{ flex: 1 }}>
            <NomText variant="displayLg" color={theme.text}>
              new party
            </NomText>
            <NomText variant="bodyLg" soft>
              throw together a dinner round in 30 seconds.
            </NomText>
          </View>
        </View>

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{
            paddingHorizontal: SPACE[5],
            paddingBottom: SPACE[8],
          }}
          keyboardShouldPersistTaps="handled"
        >
          {/* Party Name */}
          <View style={{ marginBottom: SPACE[5] }}>
            <SectionLabel>PARTY NAME</SectionLabel>
            <TextInput
              style={inputStyle(focused === 'name')}
              placeholder="Friday Night Dinner"
              placeholderTextColor={theme.textFaint}
              value={name}
              onChangeText={setName}
              onFocus={() => setFocused('name')}
              onBlur={() => setFocused(null)}
              autoFocus
              maxLength={40}
            />
          </View>

          {/* Zip Code */}
          <View style={{ marginBottom: SPACE[5] }}>
            <SectionLabel>ZIP CODE</SectionLabel>
            <TextInput
              style={inputStyle(focused === 'zip')}
              placeholder="10001"
              placeholderTextColor={theme.textFaint}
              value={zipCode}
              onChangeText={setZipCode}
              onFocus={() => setFocused('zip')}
              onBlur={() => setFocused(null)}
              keyboardType="number-pad"
              maxLength={5}
            />
          </View>

          {/* Party Size */}
          <View style={{ marginBottom: SPACE[5] }}>
            <SectionLabel>HOW MANY PEOPLE?</SectionLabel>
            <View
              style={{
                flexDirection: 'row',
                flexWrap: 'wrap',
                gap: SPACE[2],
                paddingTop: SPACE[2],
              }}
            >
              {PARTY_SIZE_OPTIONS.map((opt, i) => {
                const selected = expectedMembers === opt.value;
                return (
                  <Pressable
                    key={opt.label}
                    onPress={() => setExpectedMembers(opt.value)}
                    style={{ marginBottom: SPACE[2] }}
                  >
                    <Sticker
                      color={selected ? theme.action : theme.surfaceAlt}
                      textColor={theme.text}
                      rotation={CHIP_TILTS[i % CHIP_TILTS.length]}
                      paddingX={14}
                      paddingY={4}
                      variant="displayMd"
                    >
                      {opt.label}
                    </Sticker>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* Date (optional) */}
          <View style={{ marginBottom: SPACE[5] }}>
            <SectionLabel>DATE (OPTIONAL)</SectionLabel>
            {selectedDate ? (
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: SPACE[2],
                }}
              >
                <Pressable
                  onPress={() => setShowDatePicker(true)}
                  style={[inputStyle(false), {
                    flex: 1,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: SPACE[2],
                  }]}
                >
                  <Icon name="timer" size={18} color={theme.text} />
                  <NomText variant="headingMd" color={theme.text}>
                    {formatDateDisplay(selectedDate)}
                  </NomText>
                </Pressable>
                <IconButton name="close" size={44} onPress={clearDate} />
              </View>
            ) : (
              <Pressable
                onPress={() => setShowDatePicker(true)}
                style={[inputStyle(false), {
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: SPACE[2],
                  borderStyle: 'dashed',
                }]}
              >
                <Icon name="timer" size={18} color={theme.textSoft} />
                <NomText variant="headingMd" soft>
                  tonight, tomorrow, or pick →
                </NomText>
              </Pressable>
            )}

            {showDatePicker && (
              <DateTimePicker
                value={selectedDate || new Date()}
                mode="date"
                display={Platform.OS === 'ios' ? 'inline' : 'default'}
                minimumDate={new Date()}
                onChange={handleDateChange}
                themeVariant={theme.mode}
              />
            )}

            {/* iOS: show a Done button to dismiss the inline picker */}
            {Platform.OS === 'ios' && showDatePicker && (
              <View style={{ alignSelf: 'flex-end', marginTop: SPACE[2] }}>
                <NomButton
                  label="LOCK IT IN"
                  variant="ghost"
                  compact
                  onPress={() => setShowDatePicker(false)}
                />
              </View>
            )}
          </View>

          {/* Search Radius */}
          <View style={{ marginBottom: SPACE[6] }}>
            <SectionLabel>SEARCH RADIUS</SectionLabel>
            <View
              style={{
                flexDirection: 'row',
                flexWrap: 'wrap',
                gap: SPACE[2],
                paddingTop: SPACE[2],
              }}
            >
              {PARTY.RADIUS_OPTIONS.map((r, i) => {
                const selected = radius === r;
                return (
                  <Pressable
                    key={r}
                    onPress={() => setRadius(r as typeof radius)}
                    style={{ marginBottom: SPACE[2] }}
                  >
                    <Sticker
                      color={selected ? theme.action : theme.surfaceAlt}
                      textColor={theme.text}
                      rotation={CHIP_TILTS[i % CHIP_TILTS.length]}
                      paddingX={14}
                      paddingY={4}
                      variant="displayMd"
                    >
                      {`${r} mi`}
                    </Sticker>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* Create Button */}
          <NomButton
            label="START THE PARTY →"
            variant="primary"
            leadIcon="plus"
            stretch
            loading={loading}
            onPress={handleCreate}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
