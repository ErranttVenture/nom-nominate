import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { COLORS } from '@/constants';
import { AuthService } from '@/lib/services';

type AuthStep = 'phone' | 'verify' | 'name';

export default function AuthScreen() {
  const router = useRouter();
  const [step, setStep] = useState<AuthStep>('phone');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);
  const [confirmationResult, setConfirmationResult] = useState<any>(null);

  const codeInputRef = useRef<TextInput>(null);

  const handleSendCode = async () => {
    if (phone.length < 10) {
      Alert.alert('Invalid Phone', 'Please enter a valid phone number.');
      return;
    }

    setLoading(true);
    try {
      const formattedPhone = phone.startsWith('+') ? phone : `+1${phone}`;
      const result = await AuthService.signInWithPhone(formattedPhone);
      setConfirmationResult(result);
      setStep('verify');
      setTimeout(() => codeInputRef.current?.focus(), 300);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to send verification code.');
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    setLoading(true);
    setCode('');
    try {
      const formattedPhone = phone.startsWith('+') ? phone : `+1${phone}`;
      const result = await AuthService.signInWithPhone(formattedPhone);
      setConfirmationResult(result);
      Alert.alert('Code Sent', 'A new verification code has been sent.');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to resend verification code.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    if (code.length !== 6) {
      Alert.alert('Invalid Code', 'Please enter the 6-digit verification code.');
      return;
    }

    setLoading(true);
    try {
      const { isNewUser } = await AuthService.confirmVerificationCode(confirmationResult, code);
      if (isNewUser) {
        setStep('name');
      } else {
        router.replace('/(tabs)');
      }
    } catch (error: any) {
      const errorCode = error.code || error.message || '';
      if (errorCode.includes('session-expired') || errorCode.includes('code-expired')) {
        Alert.alert(
          'Code Expired',
          'Your verification code has expired. Would you like us to send a new one?',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Resend Code', onPress: handleResendCode },
          ]
        );
      } else {
        Alert.alert('Error', error.message || 'Invalid verification code.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSetName = async () => {
    if (displayName.trim().length < 2) {
      Alert.alert('Invalid Name', 'Please enter your name.');
      return;
    }

    setLoading(true);
    try {
      await AuthService.updateUserProfile(displayName.trim());
      router.replace('/(tabs)');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to save name.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.content}>
        {/* Logo */}
        <Text style={styles.logo}>🍽️</Text>
        <Text style={styles.title}>Nom Nominate</Text>
        <Text style={styles.tagline}>Swipe together. Eat together.</Text>

        {/* Phone Step */}
        {step === 'phone' && (
          <View style={styles.formContainer}>
            <Text style={styles.label}>PHONE NUMBER</Text>
            <View style={styles.phoneRow}>
              <View style={styles.countryCode}>
                <Text style={styles.countryCodeText}>+1</Text>
              </View>
              <TextInput
                style={[styles.input, styles.phoneInput]}
                placeholder="(555) 123-4567"
                placeholderTextColor={COLORS.textLight}
                keyboardType="phone-pad"
                value={phone}
                onChangeText={setPhone}
                autoFocus
                maxLength={15}
              />
            </View>
            <TouchableOpacity
              style={[styles.primaryButton, loading && styles.buttonDisabled]}
              onPress={handleSendCode}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.primaryButtonText}>Send Verification Code</Text>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* Verify Step */}
        {step === 'verify' && (
          <View style={styles.formContainer}>
            <Text style={styles.label}>VERIFICATION CODE</Text>
            <Text style={styles.hint}>We sent a 6-digit code to {phone}</Text>
            <TextInput
              ref={codeInputRef}
              style={styles.input}
              placeholder="000000"
              placeholderTextColor={COLORS.textLight}
              keyboardType="number-pad"
              value={code}
              onChangeText={setCode}
              maxLength={6}
              textAlign="center"
              letterSpacing={8}
            />
            <TouchableOpacity
              style={[styles.primaryButton, loading && styles.buttonDisabled]}
              onPress={handleVerifyCode}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.primaryButtonText}>Verify</Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={handleResendCode}
              disabled={loading}
            >
              <Text style={styles.secondaryButtonText}>Resend Code</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={() => { setStep('phone'); setCode(''); }}
            >
              <Text style={styles.secondaryButtonText}>Change Phone Number</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Name Step */}
        {step === 'name' && (
          <View style={styles.formContainer}>
            <Text style={styles.label}>WHAT SHOULD WE CALL YOU?</Text>
            <TextInput
              style={styles.input}
              placeholder="Your name"
              placeholderTextColor={COLORS.textLight}
              value={displayName}
              onChangeText={setDisplayName}
              autoFocus
              autoCapitalize="words"
              maxLength={30}
            />
            <TouchableOpacity
              style={[styles.primaryButton, loading && styles.buttonDisabled]}
              onPress={handleSetName}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.primaryButtonText}>Let's Go! 🎉</Text>
              )}
            </TouchableOpacity>
          </View>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.dark,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  logo: {
    fontSize: 56,
    marginBottom: 8,
  },
  title: {
    fontSize: 36,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: -1,
    marginBottom: 4,
  },
  tagline: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.6)',
    marginBottom: 48,
  },
  formContainer: {
    width: '100%',
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 1,
    color: 'rgba(255,255,255,0.5)',
    marginBottom: 8,
  },
  hint: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.5)',
    marginBottom: 16,
  },
  phoneRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 20,
  },
  countryCode: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 14,
    paddingHorizontal: 16,
    justifyContent: 'center',
  },
  countryCodeText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '600',
  },
  phoneInput: {
    flex: 1,
    marginBottom: 0,
  },
  input: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 14,
    padding: 16,
    fontSize: 18,
    color: '#fff',
    marginBottom: 20,
    fontWeight: '600',
  },
  primaryButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 16,
    padding: 18,
    alignItems: 'center',
    marginBottom: 12,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  secondaryButton: {
    padding: 16,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 15,
    fontWeight: '600',
  },
});
