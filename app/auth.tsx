import React, { useState, useRef, useCallback, useEffect } from 'react';
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
import AsyncStorage from '@react-native-async-storage/async-storage';
import { COLORS } from '@/constants';
import { AuthService } from '@/lib/services';
import { useAuthStore } from '@/stores/authStore';

const TUTORIAL_SEEN_KEY = 'nom_tutorial_seen';

type AuthStep = 'phone' | 'verify' | 'name';

/** Strip everything except digits from a phone number string. */
function sanitizePhone(raw: string): string {
  return raw.replace(/[^0-9]/g, '');
}

const RESEND_COOLDOWN_SECONDS = 30;

export default function AuthScreen() {
  const router = useRouter();
  const setVerifying = useAuthStore((s) => s.setVerifying);
  const pendingPartyId = useAuthStore((s) => s.pendingPartyId);
  const setPendingPartyId = useAuthStore((s) => s.setPendingPartyId);

  /** Navigate after successful auth — tutorial (first time), pending party, or home. */
  const navigateAfterAuth = useCallback(async () => {
    setVerifying(false);

    // Check if this is the user's first time — show tutorial if so
    try {
      const seen = await AsyncStorage.getItem(TUTORIAL_SEEN_KEY);
      if (!seen) {
        await AsyncStorage.setItem(TUTORIAL_SEEN_KEY, 'true');
        router.replace('/tutorial');
        return;
      }
    } catch {
      // AsyncStorage not available — skip tutorial check
    }

    if (pendingPartyId) {
      const pid = pendingPartyId;
      setPendingPartyId(null);
      router.replace(`/party/${pid}`);
    } else {
      router.replace('/(tabs)');
    }
  }, [pendingPartyId, setPendingPartyId, setVerifying, router]);

  const [step, setStep] = useState<AuthStep>('phone');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  // Refs to avoid stale closures
  const verificationIdRef = useRef<string | null>(null);
  const codeInputRef = useRef<TextInput>(null);
  // Guard against double sign-in (auto-verify + manual verify racing)
  const signedInRef = useRef(false);

  // Tell the auth store we're verifying so index.tsx won't navigate away
  useEffect(() => {
    setVerifying(true);
    return () => {
      setVerifying(false);
    };
  }, [setVerifying]);

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setTimeout(() => setResendCooldown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  const getFormattedPhone = useCallback(() => {
    const digits = sanitizePhone(phone);
    return digits.startsWith('1') && digits.length === 11
      ? `+${digits}`
      : `+1${digits}`;
  }, [phone]);

  /**
   * Called when Android auto-verifies the SMS code in the background,
   * AFTER we've already moved to the code entry screen.
   */
  const handleAutoVerify = useCallback(
    (result: { isNewUser: boolean }) => {
      console.log('[Auth] Auto-verify callback fired, isNewUser:', result.isNewUser);
      if (signedInRef.current) return; // already handled
      signedInRef.current = true;
      setLoading(false);

      if (result.isNewUser) {
        setStep('name');
      } else {
        navigateAfterAuth();
      }
    },
    [navigateAfterAuth]
  );

  const handleSendCode = useCallback(
    async (isResend = false) => {
      const digits = sanitizePhone(phone);
      if (!isResend && digits.length < 10) {
        Alert.alert('Invalid Phone', 'Please enter a valid 10-digit phone number.');
        return;
      }

      setLoading(true);
      if (isResend) {
        setCode('');
        setResendCooldown(RESEND_COOLDOWN_SECONDS);
      }
      signedInRef.current = false;

      try {
        const formattedPhone = getFormattedPhone();
        console.log('[Auth] Sending code to:', formattedPhone, isResend ? '(resend)' : '(initial)');

        const result = await AuthService.sendVerificationCode(
          formattedPhone,
          handleAutoVerify, // callback for late auto-verification
        );

        console.log(
          '[Auth] Result — autoVerified:',
          result.autoVerified,
          'verificationId:',
          result.verificationId?.substring(0, 15)
        );

        // Always store the latest verificationId
        verificationIdRef.current = result.verificationId;

        // Handle immediate auto-verification (AUTO_VERIFIED before CODE_SENT)
        if (result.autoVerified) {
          if (signedInRef.current) return; // already handled by callback
          signedInRef.current = true;
          console.log('[Auth] Immediate auto-verify! isNewUser:', result.isNewUser);
          if (result.isNewUser) {
            setStep('name');
          } else {
            navigateAfterAuth();
          }
          return;
        }

        if (!isResend) {
          setStep('verify');
          setTimeout(() => codeInputRef.current?.focus(), 300);
        } else {
          Alert.alert('Code Sent', 'A new verification code has been sent.');
        }
      } catch (error: any) {
        console.error('[Auth] Send code error:', error);
        Alert.alert('Error', error.message || 'Failed to send verification code.');
      } finally {
        setLoading(false);
      }
    },
    [phone, getFormattedPhone, router, setVerifying, handleAutoVerify]
  );

  const handleResendCode = useCallback(() => {
    if (resendCooldown > 0) return;
    handleSendCode(true);
  }, [handleSendCode, resendCooldown]);

  const handleVerifyCode = useCallback(async () => {
    if (code.length !== 6) {
      Alert.alert('Invalid Code', 'Please enter the 6-digit verification code.');
      return;
    }
    if (signedInRef.current) {
      // Auto-verification already signed in — just navigate
      console.log('[Auth] Already signed in via auto-verify, navigating');
      navigateAfterAuth();
      return;
    }

    setLoading(true);
    try {
      const vid = verificationIdRef.current;
      console.log('[Auth] Verifying code with verificationId:', vid?.substring(0, 15));

      if (!vid) {
        Alert.alert(
          'Session Lost',
          'Your verification session was lost. Please request a new code.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Resend Code', onPress: handleResendCode },
          ]
        );
        return;
      }

      const { isNewUser } = await AuthService.confirmVerificationCode(vid, code);
      signedInRef.current = true;
      console.log('[Auth] Verification successful! isNewUser:', isNewUser);

      if (isNewUser) {
        setStep('name');
      } else {
        navigateAfterAuth();
      }
    } catch (error: any) {
      console.error('[Auth] Verify error:', error.code, error.message);
      const errorCode = error.code || error.message || '';

      if (
        errorCode.includes('session-expired') ||
        errorCode.includes('code-expired') ||
        errorCode.includes('invalid-verification-id')
      ) {
        Alert.alert(
          'Code Expired',
          'Your verification code has expired. Would you like us to send a new one?',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Resend Code', onPress: handleResendCode },
          ]
        );
      } else if (errorCode.includes('invalid-verification-code')) {
        Alert.alert(
          'Wrong Code',
          'The code you entered is incorrect. Please check and try again.'
        );
      } else {
        Alert.alert('Error', error.message || 'Invalid verification code.');
      }
    } finally {
      setLoading(false);
    }
  }, [code, router, handleResendCode, setVerifying]);

  const handleSetName = useCallback(async () => {
    if (displayName.trim().length < 2) {
      Alert.alert('Invalid Name', 'Please enter your name.');
      return;
    }

    setLoading(true);
    try {
      await AuthService.updateUserProfile(displayName.trim());
      navigateAfterAuth();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to save name.');
    } finally {
      setLoading(false);
    }
  }, [displayName, router, setVerifying]);

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
                placeholder="5551234567"
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
              onPress={() => handleSendCode(false)}
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
            <Text style={styles.hint}>
              We sent a 6-digit code to +1{sanitizePhone(phone)}
            </Text>
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
              style={[styles.secondaryButton, resendCooldown > 0 && styles.buttonDisabled]}
              onPress={handleResendCode}
              disabled={loading || resendCooldown > 0}
            >
              <Text style={styles.secondaryButtonText}>
                {resendCooldown > 0
                  ? `Resend Code (${resendCooldown}s)`
                  : 'Resend Code'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={() => {
                setStep('phone');
                setCode('');
                verificationIdRef.current = null;
                signedInRef.current = false;
              }}
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
