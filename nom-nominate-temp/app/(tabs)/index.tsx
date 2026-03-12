import React, { useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS } from '@/constants';
import { useAuthStore } from '@/stores/authStore';
import { usePartyStore } from '@/stores/partyStore';
import { useParties } from '@/hooks/useParties';
import { PartyListCard } from '@/components/party/PartyListCard';
import type { Party } from '@/types';

export default function HomeScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const { activeParties, pastParties } = usePartyStore();
  const { loading, refresh } = useParties();

  const initials = user?.displayName?.charAt(0).toUpperCase() ?? '?';

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
      {/* New Party Button */}
      <TouchableOpacity
        style={styles.newPartyBtn}
        onPress={() => router.push('/party/create')}
        activeOpacity={0.7}
      >
        <Text style={styles.newPartyPlus}>+</Text>
        <Text style={styles.newPartyText}>New Party</Text>
      </TouchableOpacity>

      {/* Active Parties */}
      {activeParties.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>ACTIVE</Text>
          {activeParties.map((party) => (
            <PartyListCard
              key={party.id}
              party={party}
              onPress={() => handlePartyPress(party)}
            />
          ))}
        </>
      )}

      {/* Past Parties */}
      {pastParties.length > 0 && (
        <Text style={[styles.sectionTitle, { marginTop: 24 }]}>PAST NOMINATIONS</Text>
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Parties</Text>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initials}</Text>
        </View>
      </View>

      <FlatList
        data={pastParties}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={renderHeader}
        renderItem={({ item }) => (
          <PartyListCard
            party={item}
            onPress={() => handlePartyPress(item)}
          />
        )}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={refresh} tintColor={COLORS.primary} />
        }
        ListEmptyComponent={
          pastParties.length === 0 && activeParties.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyEmoji}>🍽️</Text>
              <Text style={styles.emptyTitle}>No parties yet</Text>
              <Text style={styles.emptySubtitle}>
                Create your first party and invite friends to start swiping!
              </Text>
            </View>
          ) : null
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingBottom: 16,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: COLORS.text,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
  listContent: {
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  newPartyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 20,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: COLORS.primary,
    borderRadius: 20,
    backgroundColor: 'rgba(255,107,53,0.05)',
    marginBottom: 28,
  },
  newPartyPlus: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.primary,
  },
  newPartyText: {
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.primary,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 1,
    color: COLORS.textLight,
    marginBottom: 12,
  },
  emptyState: {
    alignItems: 'center',
    paddingTop: 40,
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 15,
    color: COLORS.textLight,
    textAlign: 'center',
    lineHeight: 22,
  },
});
