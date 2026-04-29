/**
 * Home — party list + primary actions.
 *
 * Brand mark top-left, user avatar top-right. Primary CTA is "NEW PARTY"
 * (orange chunky). Secondary is "BROWSE SOLO" (ghost).
 */

import React from 'react';
import { View, FlatList, RefreshControl, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '@/stores/authStore';
import { usePartyStore } from '@/stores/partyStore';
import { useParties } from '@/hooks/useParties';
import { PartyListCard } from '@/components/party/PartyListCard';
import { useTheme } from '@/theme/ThemeContext';
import { NomText } from '@/theme/NomText';
import { SPACE } from '@/theme/tokens';
import { Splat, NomButton, Avatar } from '@/components/nom';
import type { Party } from '@/types';

export default function HomeScreen() {
  const router = useRouter();
  const theme = useTheme();
  const user = useAuthStore((s) => s.user);
  const { activeParties, pastParties } = usePartyStore();
  const { loading, refresh } = useParties();

  const handlePartyPress = (party: Party) => {
    if (party.status === 'lobby') {
      router.push(`/party/${party.id}`);
    } else if (party.status === 'swiping') {
      router.push({ pathname: '/party/swipe', params: { partyId: party.id } });
    } else if (party.status === 'nominated') {
      router.push({ pathname: '/party/success', params: { partyId: party.id } });
    } else {
      router.push({ pathname: '/party/results', params: { partyId: party.id } });
    }
  };

  const renderHeader = () => (
    <View>
      {/* Hero */}
      <View style={{ marginBottom: SPACE[5] }}>
        <NomText variant="displayXL" color={theme.text}>
          what's for dinner?
        </NomText>
        <NomText
          variant="bodyLg"
          soft
          style={{ marginTop: SPACE[1], maxWidth: 320 }}
        >
          start a party with friends, or browse solo.
        </NomText>
      </View>

      {/* Primary CTA */}
      <View style={{ marginBottom: SPACE[3] }}>
        <NomButton
          label="THROW A PARTY →"
          variant="primary"
          leadIcon="plus"
          stretch
          onPress={() => router.push('/party/create')}
        />
      </View>

      {/* Secondary */}
      <View style={{ marginBottom: SPACE[6] }}>
        <NomButton
          label="SOLO BROWSE ↗"
          variant="secondary"
          leadIcon="forkknife"
          stretch
          onPress={() => router.push('/solo')}
        />
      </View>

      {activeParties.length > 0 && (
        <>
          <NomText
            variant="monoSm"
            soft
            uppercase
            style={{ marginBottom: SPACE[3], letterSpacing: 1.5 }}
          >
            ACTIVE
          </NomText>
          {activeParties.map((party) => (
            <PartyListCard
              key={party.id}
              party={party}
              onPress={() => handlePartyPress(party)}
            />
          ))}
        </>
      )}

      {pastParties.length > 0 && (
        <NomText
          variant="monoSm"
          soft
          uppercase
          style={{ marginTop: SPACE[5], marginBottom: SPACE[3], letterSpacing: 1.5 }}
        >
          PAST NOMINATIONS
        </NomText>
      )}
    </View>
  );

  return (
    <SafeAreaView
      edges={['top']}
      style={{ flex: 1, backgroundColor: theme.bg }}
    >
      {/* Header */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: SPACE[5],
          paddingBottom: SPACE[3],
        }}
      >
        {/* Mini lockup */}
        <View style={{ width: 72, height: 44 }}>
          <Splat
            size={60}
            color={theme.action}
            seed={1}
            rotation={-4}
            style={{ position: 'absolute', top: -6, left: 0 }}
          />
          <View
            style={{
              position: 'absolute',
              top: 8,
              left: 10,
              transform: [{ rotate: '-2deg' }],
            }}
          >
            <NomText
              variant="displayMd"
              color={theme.text}
              style={{ fontSize: 26, lineHeight: 28 }}
            >
              nom
            </NomText>
          </View>
        </View>
        <Pressable onPress={() => {}}>
          <Avatar
            name={user?.displayName ?? '?'}
            size={40}
            rotation={-4}
          />
        </Pressable>
      </View>

      <FlatList
        data={pastParties}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={renderHeader}
        renderItem={({ item }) => (
          <PartyListCard party={item} onPress={() => handlePartyPress(item)} />
        )}
        contentContainerStyle={{
          paddingHorizontal: SPACE[5],
          paddingBottom: SPACE[6],
        }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={refresh}
            tintColor={theme.action}
          />
        }
        ListEmptyComponent={
          pastParties.length === 0 && activeParties.length === 0 ? (
            <View
              style={{
                alignItems: 'center',
                padding: SPACE[8],
                borderWidth: 1.5,
                borderStyle: 'dashed',
                borderColor: theme.borderStrong,
                borderRadius: 14,
                backgroundColor: theme.surface,
              }}
            >
              <NomText variant="displayLg" center>
                no parties yet
              </NomText>
              <NomText
                variant="bodyMd"
                soft
                center
                style={{ marginTop: SPACE[2], maxWidth: 260 }}
              >
                start one or paste a friend's code
              </NomText>
            </View>
          ) : null
        }
      />
    </SafeAreaView>
  );
}
