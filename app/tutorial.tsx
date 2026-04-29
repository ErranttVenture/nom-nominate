/**
 * Tutorial — 5-step intro. Each step has a big sticker-style icon tag and
 * a marker-set title/description.
 */

import React, { useState } from 'react';
import { View, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NomText } from '@/theme/NomText';
import { useTheme } from '@/theme/ThemeContext';
import { RADIUS, SPACE } from '@/theme/tokens';
import { NomButton, Splat, Icon } from '@/components/nom';
import type { IconName } from '@/components/nom';

interface TutorialStep {
  icon: IconName;
  splatSeed: 1 | 2 | 3 | 4;
  splatColor: 'action' | 'splatNo' | 'warn' | 'match';
  title: string;
  description: string;
}

const STEPS: TutorialStep[] = [
  {
    icon: 'plus',
    splatSeed: 1,
    splatColor: 'action',
    title: 'start a party',
    description:
      'Name it, drop your zip, pick a radius. A 5-char join code gets baked in.',
  },
  {
    icon: 'users',
    splatSeed: 2,
    splatColor: 'splatNo',
    title: 'invite your crew',
    description:
      "Share the code so friends can jump in. Or solo-browse if you're flying alone.",
  },
  {
    icon: 'heart',
    splatSeed: 3,
    splatColor: 'action',
    title: 'swipe to vote',
    description:
      "Right for YUM, left for NOPE. Name, cuisine, rating, price — all on the card.",
  },
  {
    icon: 'star',
    splatSeed: 4,
    splatColor: 'warn',
    title: 'see the lineup',
    description:
      'When everyone\'s swiped, the group pick gets nominated. Ties broken by votes.',
  },
  {
    icon: 'forkknife',
    splatSeed: 1,
    splatColor: 'match',
    title: 'go eat',
    description:
      'Tap the winner, map opens, dinner happens. Some spots have deals — watch for the flame.',
  },
];

export default function TutorialScreen() {
  const router = useRouter();
  const theme = useTheme();
  const [currentStep, setCurrentStep] = useState(0);

  const isLast = currentStep === STEPS.length - 1;
  const step = STEPS[currentStep];
  const splatColorResolved =
    step.splatColor === 'action'
      ? theme.action
      : step.splatColor === 'splatNo'
        ? theme.splatNo
        : step.splatColor === 'warn'
          ? theme.warn
          : theme.match;

  const handleNext = () => {
    if (isLast) {
      router.replace('/(tabs)');
    } else {
      setCurrentStep((prev) => prev + 1);
    }
  };

  const handleSkip = () => router.replace('/(tabs)');

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: theme.bg }}
      edges={['top', 'bottom']}
    >
      {/* Skip */}
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'flex-end',
          paddingHorizontal: SPACE[5],
          paddingTop: SPACE[2],
        }}
      >
        <Pressable onPress={handleSkip} hitSlop={10}>
          <NomText variant="bodyLg" soft uppercase>
            skip →
          </NomText>
        </Pressable>
      </View>

      {/* Step content */}
      <View
        style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          paddingHorizontal: SPACE[8],
        }}
      >
        {/* Splat + icon badge */}
        <View
          style={{
            width: 180,
            height: 180,
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: SPACE[6],
          }}
        >
          <Splat
            size={180}
            color={splatColorResolved}
            seed={step.splatSeed}
            rotation={-8}
            style={{ position: 'absolute', top: 0, left: 0 }}
          />
          <View
            style={{
              transform: [{ rotate: '-4deg' }],
              backgroundColor: theme.surface,
              borderWidth: 2.5,
              borderColor: theme.borderStrong,
              borderRadius: RADIUS.lg,
              padding: SPACE[4],
            }}
          >
            <Icon name={step.icon} size={48} color={theme.text} />
          </View>
        </View>

        <NomText
          variant="displayXL"
          color={theme.text}
          center
          style={{ marginBottom: SPACE[4] }}
        >
          {step.title}
        </NomText>
        <NomText variant="bodyLg" soft center style={{ maxWidth: 320 }}>
          {step.description}
        </NomText>
      </View>

      {/* Progress dots */}
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'center',
          gap: SPACE[2],
          marginBottom: SPACE[6],
        }}
      >
        {STEPS.map((_, i) => {
          const active = i === currentStep;
          return (
            <View
              key={i}
              style={{
                width: active ? 28 : 10,
                height: 10,
                borderRadius: 5,
                backgroundColor: active ? theme.action : theme.border,
                borderWidth: 1.5,
                borderColor: theme.borderStrong,
              }}
            />
          );
        })}
      </View>

      {/* Next / Get Started */}
      <View
        style={{
          paddingHorizontal: SPACE[5],
          paddingBottom: SPACE[6],
        }}
      >
        <NomButton
          label={isLast ? "LET'S GO" : 'KEEP GOING →'}
          variant="primary"
          stretch
          trailIcon={isLast ? 'bolt' : undefined}
          onPress={handleNext}
        />
      </View>
    </SafeAreaView>
  );
}
