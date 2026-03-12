import React, { useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS } from '@/constants';
import { useResults } from '@/hooks/useResults';
import type { VenueVotes } from '@/types';

const RANK_COLORS = ['#f0932b', '#95a5a6', '#cd6133'];

export default function ResultsScreen() {
  const { partyId } = useLocalSearchParams<{ partyId: string }>();
  const router = useRouter();
  const { results, party, loading } = useResults(partyId!);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  const renderResultItem = ({ item, index }: { item: VenueVotes; index: number }) => {
    const rank = index + 1;
    const rankColor = RANK_COLORS[index] ?? COLORS.border;
    const isTopThree = index < 3;

    return (
      <View style={styles.resultItem}>
        <View style={[styles.rankBadge, { backgroundColor: isTopThree ? rankColor : '#dfe6e9' }]}>
          <Text style={[styles.rankText, !isTopThree && { color: COLORS.text }]}>
            {rank}
          </Text>
        </View>
        <View style={styles.resultInfo}>
          <Text style={styles.resultName}>{item.venueName}</Text>
          <Text style={styles.resultCuisine}>{item.cuisine}</Text>
          <View style={styles.voteBar}>
            <View
              style={[styles.voteBarFill, { width: `${item.percentage}%` }]}
            />
          </View>
        </View>
        <View style={styles.voteCount}>
          <Text style={styles.votePercent}>{item.percentage}%</Text>
          <Text style={styles.voteLabel}>
            {item.rightSwipes}/{item.totalMembers}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backBtnText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Results</Text>
      </View>

      <Text style={styles.subtitle}>
        {party?.name} · {party?.memberIds.length} members voted
      </Text>

      <FlatList
        data={results}
        keyExtractor={(item) => item.venueId}
        renderItem={renderResultItem}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>📊</Text>
            <Text style={styles.emptyTitle}>No results yet</Text>
            <Text style={styles.emptySubtitle}>
              Results will appear once members start swiping.
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 24, paddingBottom: 8,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 12, backgroundColor: '#fff',
    justifyContent: 'center', alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
  },
  backBtnText: { fontSize: 18 },
  headerTitle: { fontSize: 22, fontWeight: '800', color: COLORS.text },
  subtitle: {
    fontSize: 14, color: COLORS.textLight,
    paddingHorizontal: 24, marginBottom: 20,
  },
  listContent: { paddingHorizontal: 24, paddingBottom: 40 },
  resultItem: {
    backgroundColor: '#fff', borderRadius: 16, padding: 16,
    marginBottom: 10, flexDirection: 'row', alignItems: 'center', gap: 14,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04, shadowRadius: 8, elevation: 2,
  },
  rankBadge: {
    width: 32, height: 32, borderRadius: 10,
    justifyContent: 'center', alignItems: 'center',
  },
  rankText: { fontWeight: '800', fontSize: 14, color: '#fff' },
  resultInfo: { flex: 1 },
  resultName: { fontSize: 15, fontWeight: '700', color: COLORS.text },
  resultCuisine: { fontSize: 12, color: COLORS.textLight },
  voteBar: {
    width: '100%', height: 6, backgroundColor: '#f0f0f0',
    borderRadius: 3, marginTop: 8, overflow: 'hidden',
  },
  voteBarFill: {
    height: '100%', borderRadius: 3, backgroundColor: COLORS.primary,
  },
  voteCount: { alignItems: 'flex-end' },
  votePercent: { fontSize: 20, fontWeight: '800', color: COLORS.primary },
  voteLabel: { fontSize: 11, color: COLORS.textLight },
  emptyState: { alignItems: 'center', paddingTop: 60 },
  emptyEmoji: { fontSize: 48, marginBottom: 12 },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: COLORS.text, marginBottom: 8 },
  emptySubtitle: {
    fontSize: 15, color: COLORS.textLight, textAlign: 'center', lineHeight: 22,
  },
});
