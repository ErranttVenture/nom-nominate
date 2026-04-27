/**
 * Party Lobby — "backstage" screen (design Variant B).
 *
 * Auth + join behavior is unchanged from the previous version:
 *   - Deep-linked guests without auth get redirected to /auth with a
 *     pendingPartyId stash, then returned here after sign-in.
 *   - On mount we auto-join (idempotent) with exponential backoff retry.
 *   - Party real-time state comes from `usePartyLobby`.
 *
 * Visually we match the locked "BACKSTAGE" hi-fi: halftone wash top,
 * big ink join-code card, rotated sticker name tags, host line.
 */

import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Alert,
  Share,
  ActivityIndicator,
  ScrollView,
  Pressable,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useAuthStore } from '@/stores/authStore';
import { usePartyLobby } from '@/hooks/usePartyLobby';
import { PartyService } from '@/lib/services';
import { useTheme } from '@/theme/ThemeContext';
import { NomText } from '@/theme/NomText';
import { COLOR, RADIUS, SPACE, STROKE } from '@/theme/tokens';
import {
  Splat,
  Halftone,
  Bolt,
  NomButton,
  Avatar,
} from '@/components/nom';
import type { PartyMember } from '@/types';

export default function PartyLobbyScreen() {
  const { id: partyId } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const theme = useTheme();
  const user = useAuthStore((s) => s.user);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isLoading = useAuthStore((s) => s.isLoading);
  const setPendingPartyId = useAuthStore((s) => s.setPendingPartyId);

  const [joining, setJoining] = useState(false);
  const [starting, setStarting] = useState(false);
  const joinAttempted = useRef(false);

  // ── Auth guard ──
  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) {
      setPendingPartyId(partyId!);
      router.replace('/auth');
    }
  }, [isAuthenticated, isLoading]);

  // ── Auto-join ──
  useEffect(() => {
    if (!isAuthenticated || !partyId || joinAttempted.current) return;
    joinAttempted.current = true;

    const TRANSIENT_CODES = [
      'firestore/unavailable',
      'firestore/deadline-exceeded',
    ];
    const MAX_RETRIES = 3;

    (async () => {
      setJoining(true);
      for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
        try {
          await PartyService.joinParty(partyId);
          setJoining(false);
          return;
        } catch (err: any) {
          const isTransient = TRANSIENT_CODES.some(
            (code) => err.message?.includes(code) || err.code === code
          );
          if (isTransient && attempt < MAX_RETRIES) {
            await new Promise((r) => setTimeout(r, Math.pow(2, attempt) * 1000));
            continue;
          }
          Alert.alert(
            'Could not join party',
            err.message ||
              'The party may no longer exist. Please ask the host for a new link.',
            [{ text: 'OK', onPress: () => router.replace('/') }]
          );
          setJoining(false);
          return;
        }
      }
    })();
  }, [isAuthenticated, partyId]);

  const { party, members, loading, error } = usePartyLobby(partyId!);

  useEffect(() => {
    if (error) {
      Alert.alert('Error', error, [
        { text: 'OK', onPress: () => router.replace('/') },
      ]);
    }
  }, [error]);

  useEffect(() => {
    if (party?.status === 'nominated') {
      router.replace({ pathname: '/party/success', params: { partyId } });
    }
  }, [party?.status]);

  const handleInvite = async () => {
    const link = `https://nom-nominate.web.app/party/${partyId}`;
    const code = party?.joinCode;
    const message = code
      ? `Join my Nom party — code: ${code}\n${link}`
      : `Join my Nom Nominate party "${party?.name}"!\n\n${link}`;
    try {
      await Share.share({ message, url: link });
    } catch {
      // user cancelled
    }
  };

  const handleCopyCode = async () => {
    if (!party?.joinCode) return;
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    await Share.share({
      message: `Join my Nom party with code ${party.joinCode}`,
    });
  };

  const handleStartSwiping = async () => {
    setStarting(true);
    try {
      router.replace({ pathname: '/party/swipe', params: { partyId } });
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to start swiping.');
    } finally {
      setStarting(false);
    }
  };

  const isSwiping = party?.status === 'swiping';
  const expected = party?.expectedMembers ?? 0;
  const openMode = expected === 0;
  const joinedCount = members.length;
  const waitingSlots = openMode ? 0 : Math.max(0, expected - joinedCount);

  if (joining || loading || isLoading) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: theme.bg,
        }}
      >
        <ActivityIndicator color={theme.action} />
        {joining && (
          <NomText variant="bodyMd" soft style={{ marginTop: 12 }}>
            Joining party...
          </NomText>
        )}
      </View>
    );
  }

  return (
    <SafeAreaView
      edges={['top', 'bottom']}
      style={{ flex: 1, backgroundColor: theme.bg }}
    >
      {/* Halftone wash */}
      <View
        pointerEvents="none"
        style={{ position: 'absolute', top: 0, left: 0, right: 0 }}
      >
        <Halftone
          width={420}
          height={160}
          color={theme.text}
          opacity={0.07}
          size={6}
        />
      </View>

      {/* Top nav */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: SPACE[5],
          paddingVertical: SPACE[2],
        }}
      >
        <Pressable onPress={() => router.replace('/')} hitSlop={10}>
          <NomText variant="bodyLg" soft>
            ← leave
          </NomText>
        </Pressable>
        <NomText variant="monoSm" soft uppercase>
          BACKSTAGE
        </NomText>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: SPACE[5] }}
        showsVerticalScrollIndicator={false}
      >
        {/* Brand row */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: SPACE[5],
            gap: SPACE[3],
          }}
        >
          <View
            style={{
              width: 60,
              height: 60,
              transform: [{ rotate: '-3deg' }],
            }}
          >
            <Splat
              size={60}
              color={theme.action}
              seed={1}
              style={{ position: 'absolute', top: 0, left: 0 }}
            />
            <View
              style={{
                position: 'absolute',
                top: 14,
                left: 8,
                transform: [{ rotate: '3deg' }],
              }}
            >
              <NomText variant="displayMd" color={theme.text}>
                nom
              </NomText>
            </View>
          </View>
          <View style={{ flex: 1 }}>
            <NomText variant="displayLg" color={theme.text}>
              get ready
            </NomText>
            <NomText variant="bodyMd" soft>
              {party?.name ?? "tonight's dinner is about to go down"}
            </NomText>
          </View>
        </View>

        {/* Join code card */}
        <View style={{ paddingHorizontal: SPACE[5], marginTop: SPACE[4] }}>
          <Pressable onPress={handleCopyCode} disabled={!party?.joinCode}>
            <View
              style={{
                position: 'absolute',
                top: 3,
                left: 3,
                right: -3,
                bottom: -3,
                borderRadius: RADIUS.lg,
                backgroundColor: theme.borderStrong,
              }}
            />
            <View
              style={{
                backgroundColor: COLOR.neutral.ink,
                borderColor: theme.borderStrong,
                borderWidth: 2,
                borderRadius: RADIUS.lg,
                padding: SPACE[4],
                overflow: 'hidden',
              }}
            >
              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'baseline',
                }}
              >
                <NomText
                  variant="monoSm"
                  color="rgba(250,245,236,0.55)"
                  uppercase
                >
                  JOIN CODE
                </NomText>
                <NomText variant="bodySm" color="rgba(250,245,236,0.55)">
                  tap to share
                </NomText>
              </View>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'baseline',
                  marginTop: SPACE[1],
                }}
              >
                <NomText
                  variant="displayXL"
                  color={theme.action}
                  style={{ letterSpacing: 6, fontSize: 40 }}
                >
                  {party?.joinCode ?? '—— — ——'}
                </NomText>
              </View>
              <Bolt
                size={26}
                color={COLOR.brand.warn}
                stroke={COLOR.neutral.paper}
                style={{
                  position: 'absolute',
                  top: 8,
                  right: 16,
                  transform: [{ rotate: '12deg' }],
                }}
              />
            </View>
          </Pressable>
        </View>

        {/* IN THE ROOM */}
        <View style={{ paddingHorizontal: SPACE[5], marginTop: SPACE[5] }}>
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'baseline',
              marginBottom: SPACE[2],
            }}
          >
            <NomText variant="monoSm" soft uppercase>
              IN THE ROOM
            </NomText>
            <NomText variant="bodyMd" soft>
              {openMode
                ? `${joinedCount} joined`
                : `${joinedCount} of ${expected}`}
            </NomText>
          </View>

          <View
            style={{
              flexDirection: 'row',
              flexWrap: 'wrap',
              gap: SPACE[2],
            }}
          >
            {members.map((m, i) => (
              <MemberSticker
                key={m.userId}
                member={m}
                index={i}
                isYou={m.userId === user?.id}
              />
            ))}
            {Array.from({ length: waitingSlots }).map((_, i) => (
              <WaitingSticker key={`slot-${i}`} index={joinedCount + i} />
            ))}
          </View>
        </View>

        {/* Host note */}
        {party?.creatorId && (
          <View style={{ paddingHorizontal: SPACE[5], marginTop: SPACE[4] }}>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: SPACE[2],
                padding: SPACE[3],
                backgroundColor: theme.surface,
                borderRadius: RADIUS.md,
                borderWidth: 1.5,
                borderColor: theme.border,
              }}
            >
              <View
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: 12,
                  backgroundColor: theme.action,
                  borderWidth: 1.5,
                  borderColor: theme.borderStrong,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <NomText variant="headingMd" color={theme.text}>
                  ?
                </NomText>
              </View>
              <NomText variant="bodyMd" soft style={{ flex: 1 }}>
                {hostName(party?.creatorId, members) ?? 'Host'} is running this
                one · {party?.radiusMiles ?? '?'}mi radius
              </NomText>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Bottom actions */}
      <View
        style={{
          flexDirection: 'row',
          gap: SPACE[2],
          paddingHorizontal: SPACE[5],
          paddingTop: SPACE[2],
          paddingBottom: SPACE[4],
        }}
      >
        <NomButton
          label="invite ↗"
          variant="secondary"
          compact
          onPress={handleInvite}
        />
        <View style={{ flex: 1 }}>
          <NomButton
            label={isSwiping ? 'RESUME →' : 'BEGIN! →'}
            variant="primary"
            loading={starting}
            stretch
            onPress={handleStartSwiping}
          />
        </View>
      </View>
    </SafeAreaView>
  );
}

// ─── Helpers ───

function hostName(creatorId: string, members: PartyMember[]): string | null {
  const host = members.find((m) => m.userId === creatorId);
  return host?.displayName ?? null;
}

const TILTS = [-5, 3, -3, 4, -2, 2];

function MemberSticker({
  member,
  index,
  isYou,
}: {
  member: PartyMember;
  index: number;
  isYou: boolean;
}) {
  const theme = useTheme();
  const rot = TILTS[index % TILTS.length];
  const alt = index % 2 === 0;

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACE[2],
        paddingVertical: 6,
        paddingLeft: 6,
        paddingRight: 12,
        backgroundColor: alt ? COLOR.neutral.paper : theme.surface,
        borderColor: theme.borderStrong,
        borderWidth: 2,
        borderRadius: RADIUS.full,
        transform: [{ rotate: `${rot}deg` }],
      }}
    >
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          top: 2,
          left: 2,
          right: -2,
          bottom: -2,
          backgroundColor: theme.borderStrong,
          borderRadius: RADIUS.full,
          zIndex: -1,
        }}
      />
      <Avatar
        name={member.displayName}
        size={26}
        rotation={0}
        color={undefined}
      />
      <NomText variant="headingMd" color={COLOR.neutral.ink}>
        {member.displayName}
        {isYou ? ' (you)' : ''}
      </NomText>
    </View>
  );
}

function WaitingSticker({ index }: { index: number }) {
  const theme = useTheme();
  const rot = TILTS[index % TILTS.length];
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACE[2],
        paddingVertical: 6,
        paddingLeft: 6,
        paddingRight: 12,
        borderColor: theme.borderStrong,
        borderWidth: 1.5,
        borderStyle: 'dashed',
        borderRadius: RADIUS.full,
        opacity: 0.55,
        transform: [{ rotate: `${rot}deg` }],
      }}
    >
      <View
        style={{
          width: 22,
          height: 22,
          borderRadius: 11,
          borderWidth: 1.5,
          borderStyle: 'dashed',
          borderColor: theme.borderStrong,
        }}
      />
      <NomText variant="bodyMd" soft>
        waiting…
      </NomText>
    </View>
  );
}
