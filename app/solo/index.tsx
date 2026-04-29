/**
 * Solo Setup — zip + radius form, then into /solo/browse.
 * Same visual language as Create Party.
 */

import React, { useState } from 'react';
import {
  View,
  TextInput,
  ScrollView,
  Alert,
  Pressable,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PARTY } from '@/constants';
import { NomText } from '@/theme/NomText';
import { useTheme } from '@/theme/ThemeContext';
import { RADIUS, SPACE, STROKE } from '@/theme/tokens';
import { NomButton, IconButton, Sticker } from '@/components/nom';

const CHIP_TILTS = [-3, 2, -2, 3];

export default function SoloSetupScreen() {
  const router = useRouter();
  const theme = useTheme();
  const [zipCode, setZipCode] = useState('');
  const [radius, setRadius] = useState<5 | 10 | 15 | 25>(
    PARTY.DEFAULT_RADIUS_MILES as 10
  );
  const [focused, setFocused] = useState(false);

  const handleStart = () => {
    if (!/^\d{5}$/.test(zipCode)) {
      Alert.alert('Invalid Zip Code', 'enter a valid 5-digit zip code.');
      return;
    }
    router.push({
      pathname: '/solo/browse',
      params: { zipCode, radius: String(radius) },
    });
  };

  const inputStyle = {
    backgroundColor: theme.surface,
    borderRadius: RADIUS.lg,
    paddingHorizontal: SPACE[4],
    paddingVertical: SPACE[3] + 2,
    fontSize: 18,
    fontFamily: 'PatrickHand',
    color: theme.text,
    borderWidth: focused ? STROKE.chunky : STROKE.std,
    borderColor: focused ? theme.action : theme.borderStrong,
  };

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
          <NomText variant="displayLg">solo round</NomText>
        </View>

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{
            paddingHorizontal: SPACE[5],
            paddingBottom: SPACE[8],
          }}
          keyboardShouldPersistTaps="handled"
        >
          <NomText
            variant="bodyLg"
            soft
            style={{ marginBottom: SPACE[5] }}
          >
            no friends, no problem. find your spots, save your faves.
          </NomText>

          {/* Zip */}
          <View style={{ marginBottom: SPACE[5] }}>
            <NomText
              variant="monoSm"
              soft
              uppercase
              style={{ marginBottom: SPACE[2], letterSpacing: 1.5 }}
            >
              ZIP CODE
            </NomText>
            <TextInput
              style={inputStyle}
              placeholder="10001"
              placeholderTextColor={theme.textFaint}
              value={zipCode}
              onChangeText={setZipCode}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              keyboardType="number-pad"
              maxLength={5}
              autoFocus
            />
          </View>

          {/* Radius */}
          <View style={{ marginBottom: SPACE[6] }}>
            <NomText
              variant="monoSm"
              soft
              uppercase
              style={{ marginBottom: SPACE[2], letterSpacing: 1.5 }}
            >
              SEARCH RADIUS
            </NomText>
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

          <NomButton
            label="START SWIPING →"
            variant="primary"
            leadIcon="forkknife"
            stretch
            onPress={handleStart}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
