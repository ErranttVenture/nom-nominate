import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS } from '@/constants';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface TutorialStep {
  emoji: string;
  title: string;
  description: string;
}

const STEPS: TutorialStep[] = [
  {
    emoji: '🎉',
    title: 'Create a Party',
    description: 'Start by creating a party. Give it a name, enter your zip code, and choose how far you want to search for restaurants.',
  },
  {
    emoji: '👥',
    title: 'Invite Friends',
    description: 'Share your party code with friends so they can join. Or use Solo Browse to find restaurants on your own!',
  },
  {
    emoji: '👆',
    title: 'Swipe to Vote',
    description: 'Swipe right on restaurants you love, left on ones you\'re not feeling. Each card shows the restaurant\'s name, cuisine, rating, and price range.',
  },
  {
    emoji: '🏆',
    title: 'See Results',
    description: 'Once everyone has swiped, see which restaurants your group agreed on! The top pick is your nomination.',
  },
  {
    emoji: '🍽️',
    title: 'Enjoy Your Meal!',
    description: 'Head to your winning restaurant and enjoy! Look for special offers on some venues for extra savings.',
  },
];

export default function TutorialScreen() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);

  const isLast = currentStep === STEPS.length - 1;
  const step = STEPS[currentStep];

  const handleNext = () => {
    if (isLast) {
      router.replace('/(tabs)');
    } else {
      setCurrentStep((prev) => prev + 1);
    }
  };

  const handleSkip = () => {
    router.replace('/(tabs)');
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Skip button */}
      <View style={styles.topBar}>
        <TouchableOpacity onPress={handleSkip}>
          <Text style={styles.skipText}>Skip</Text>
        </TouchableOpacity>
      </View>

      {/* Step content */}
      <View style={styles.content}>
        <Text style={styles.stepEmoji}>{step.emoji}</Text>
        <Text style={styles.stepTitle}>{step.title}</Text>
        <Text style={styles.stepDescription}>{step.description}</Text>
      </View>

      {/* Progress dots */}
      <View style={styles.dots}>
        {STEPS.map((_, i) => (
          <View
            key={i}
            style={[styles.dot, i === currentStep && styles.dotActive]}
          />
        ))}
      </View>

      {/* Next / Get Started button */}
      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={styles.nextBtn}
          onPress={handleNext}
          activeOpacity={0.7}
        >
          <Text style={styles.nextBtnText}>
            {isLast ? 'Get Started' : 'Next'}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: 24,
    paddingTop: 8,
  },
  skipText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.textLight,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  stepEmoji: {
    fontSize: 72,
    marginBottom: 24,
  },
  stepTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: 16,
  },
  stepDescription: {
    fontSize: 16,
    color: COLORS.textLight,
    textAlign: 'center',
    lineHeight: 24,
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 24,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.border,
  },
  dotActive: {
    backgroundColor: COLORS.primary,
    width: 24,
  },
  bottomBar: {
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  nextBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 16,
    padding: 18,
    alignItems: 'center',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 5,
  },
  nextBtnText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
  },
});
