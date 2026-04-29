/**
 * Auth — phone → SMS verify → name.
 *
 * Visual: brand lockup + tagline up top, halftone decor, themed inputs with
 * focus state, NomButton CTAs. Business logic (auto-verify, resend cooldown,
 * session-expired handling) is preserved from the prior implementation.
 */

import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Pressable,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AuthService } from '@/lib/services';
import { useAuthStore } from '@/stores/authStore';
import { NomText } from '@/theme/NomText';
import { useTheme } from '@/theme/ThemeContext';
import { RADIUS, SPACE, STROKE } from '@/theme/tokens';
import { NomButton, Lockup, Halftone } from '@/components/nom';

const TUTORIAL_SEEN_KEY = 'nom_tutorial_seen';
const RESEND_COOLDOWN_SECONDS = 30;

type AuthStep = 'phone' | 'verify' | 'name';

/** Strip everything except digits from a phone number string. */
function sanitizePhone(raw: string): string {
  return raw.replace(/[^0-9]/g, '');
}

export default function AuthScreen() {
  const router = useRouter();
  const theme = useTheme();
  const setVerifying = useAuthStore((s) => s.setVerifying);
  const pendingPartyId = useAuthStore((s) => s.pendingPartyId);
  const setPendingPartyId = useAuthStore((s) => s.setPendingPartyId);

  /** Navigate after successful auth — tutorial (first time), pending party, or home. */
  const navigateAfterAuth = useCallback(async () => {
    setVerifying(false);

    try {
      const seen = await AsyncStorage.getItem(TUTORIAL_SEEN_KEY);
      if (!seen) {
        await AsyncStorage.setItem(TUTORIAL_SEEN_KEY, 'true');
        router.replace('/tutorial');
        return;
      }
    } catch {
      // AsyncStorage unavailable — skip tutorial check
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
  const [focused, setFocused] = useState(false);

  const verificationIdRef = useRef<string | null>(null);
  const codeInputRef = useRef<TextInput>(null);
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

  const handleSendCode = useCallback(
    async (isResend = false) => {
      const digits = sanitizePhone(phone);
      if (!isResend && digits.length < 10) {
        Alert.alert(
          'hold up',
          "that doesn't look like a 10-digit phone number. try again?"
        );
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

        // On Android this awaits the full auto-verify window
        // (~10s) before resolving. The user stays on the phone-entry
        // screen with the button spinner the whole time.
        const result = await AuthService.sendVerificationCode(formattedPhone);

        console.log(
          '[Auth] Result — autoVerified:',
          result.autoVerified,
          'verificationId:',
          result.verificationId?.substring(0, 15)
        );

        verificationIdRef.current = result.verificationId;

        if (result.autoVerified) {
          if (signedInRef.current) return;
          signedInRef.current = true;
          console.log('[Auth] Auto-verify succeeded! isNewUser:', result.isNewUser);
          if (result.isNewUser) {
            setStep('name');
          } else {
            navigateAfterAuth();
          }
          return;
        }

        // Auto-verify timed out (or iOS) — show the manual code entry screen.
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
    [phone, getFormattedPhone, navigateAfterAuth]
  );

  const handleResendCode = useCallback(() => {
    if (resendCooldown > 0) return;
    handleSendCode(true);
  }, [handleSendCode, resendCooldown]);

  const handleVerifyCode = useCallback(async () => {
    if (code.length !== 6) {
      Alert.alert(
        'missing digits',
        'the code is 6 digits. fill in the rest and try again.'
      );
      return;
    }
    if (signedInRef.current) {
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
          'lost the thread',
          "we lost track of your verification. let's start over.",
          [
            { text: 'cancel', style: 'cancel' },
            { text: 'send a new code', onPress: handleResendCode },
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
          'the last code timed out. want a fresh one?',
          [
            { text: 'cancel', style: 'cancel' },
            { text: 'send a new code', onPress: handleResendCode },
          ]
        );
      } else if (errorCode.includes('invalid-verification-code')) {
        Alert.alert(
          'not quite',
          "that code didn't match. double-check your texts and try once more."
        );
      } else {
        Alert.alert('Error', error.message || 'Invalid verification code.');
      }
    } finally {
      setLoading(false);
    }
  }, [code, handleResendCode, navigateAfterAuth]);

  const handleSetName = useCallback(async () => {
    if (displayName.trim().length < 2) {
      Alert.alert(
        "what's your name?",
        'give us at least two characters so we know what to call you.'
      );
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
  }, [displayName, navigateAfterAuth]);

  // Shared themed input style
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
      edges={['top', 'bottom']}
      style={{ flex: 1, backgroundColor: theme.bg }}
    >
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Halftone top decor */}
        <View
          pointerEvents="none"
          style={{ position: 'absolute', top: 0, left: 0 }}
        >
          <Halftone
            width={420}
            height={160}
            color={theme.text}
            opacity={0.12}
          />
        </View>

        <View
          style={{
            flex: 1,
            paddingHorizontal: SPACE[6],
            justifyContent: 'center',
          }}
        >
          {/* Brand */}
          <View style={{ alignItems: 'center', marginBottom: SPACE[8] }}>
            <Lockup size={1.05} />
            <NomText
              variant="scriptCap"
              soft
              center
              style={{ marginTop: -SPACE[2] }}
            >
              swipe together. eat together.
            </NomText>
          </View>

          {/* Phone Step */}
          {step === 'phone' && (
            <View>
              <SectionLabel>PHONE NUMBER</SectionLabel>
              <View
                style={{
                  flexDirection: 'row',
                  gap: SPACE[2],
                  marginBottom: SPACE[5],
                }}
              >
                <View
                  style={[
                    inputStyle,
                    {
                      justifyContent: 'center',
                      paddingHorizontal: SPACE[4],
                      borderWidth: STROKE.std,
                      borderColor: theme.borderStrong,
                    },
                  ]}
                >
                  <NomText variant="headingLg" color={theme.text}>
                    +1
                  </NomText>
                </View>
                <TextInput
                  style={[inputStyle, { flex: 1 }]}
                  placeholder="5551234567"
                  placeholderTextColor={theme.textFaint}
                  keyboardType="phone-pad"
                  value={phone}
                  onChangeText={setPhone}
                  onFocus={() => setFocused(true)}
                  onBlur={() => setFocused(false)}
                  autoFocus
                  maxLength={15}
                />
              </View>
              <NomButton
                label="SEND CODE"
                variant="primary"
                stretch
                loading={loading}
                onPress={() => handleSendCode(false)}
              />
              {loading && (
                <NomText
                  variant="bodyMd"
                  soft
                  center
                  style={{ marginTop: SPACE[3] }}
                >
                  Looking for code…
                </NomText>
              )}
            </View>
          )}

          {/* Verify Step */}
          {step === 'verify' && (
            <View>
              <SectionLabel>VERIFICATION CODE</SectionLabel>
              <NomText
                variant="bodyMd"
                soft
                style={{ marginBottom: SPACE[3] }}
              >
                we just texted a code to +1{sanitizePhone(phone)}. enter it
                below or wait for it to auto-fill.
              </NomText>
              <TextInput
                ref={codeInputRef}
                style={[
                  inputStyle,
                  {
                    fontSize: 28,
                    textAlign: 'center',
                    letterSpacing: 8,
                    marginBottom: SPACE[5],
                  },
                ]}
                placeholder="000000"
                placeholderTextColor={theme.textFaint}
                keyboardType="number-pad"
                value={code}
                onChangeText={setCode}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
                maxLength={6}
              />
              <View style={{ marginBottom: SPACE[3] }}>
                <NomButton
                  label="VERIFY & GO"
                  variant="primary"
                  stretch
                  loading={loading}
                  onPress={handleVerifyCode}
                />
              </View>
              <Pressable
                onPress={handleResendCode}
                disabled={loading || resendCooldown > 0}
                style={{
                  alignItems: 'center',
                  paddingVertical: SPACE[3],
                  opacity: resendCooldown > 0 ? 0.5 : 1,
                }}
              >
                <NomText variant="headingMd" soft>
                  {resendCooldown > 0
                    ? `send a new code in ${resendCooldown}s`
                    : 'send a new code'}
                </NomText>
              </Pressable>
              <Pressable
                onPress={() => {
                  setStep('phone');
                  setCode('');
                  verificationIdRef.current = null;
                  signedInRef.current = false;
                }}
                style={{
                  alignItems: 'center',
                  paddingVertical: SPACE[2],
                }}
              >
                <NomText variant="bodyMd" faint>
                  ← change phone number
                </NomText>
              </Pressable>
            </View>
          )}

          {/* Name Step */}
          {step === 'name' && (
            <View>
              <SectionLabel>WHAT SHOULD WE CALL YOU?</SectionLabel>
              <NomText
                variant="bodyMd"
                soft
                style={{ marginBottom: SPACE[3] }}
              >
                this is what your friends will see.
              </NomText>
              <TextInput
                style={[inputStyle, { marginBottom: SPACE[5] }]}
                placeholder="Your name"
                placeholderTextColor={theme.textFaint}
                value={displayName}
                onChangeText={setDisplayName}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
                autoFocus
                autoCapitalize="words"
                maxLength={30}
              />
              <NomButton
                label="LET'S GO"
                variant="primary"
                trailIcon="bolt"
                stretch
                loading={loading}
                onPress={handleSetName}
              />
            </View>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
