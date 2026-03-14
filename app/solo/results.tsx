import React from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  FlatList,
  StyleSheet,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS } from '@/constants';
import { usePartyStore } from '@/stores/partyStore';
import type { Venue } from '@/types';

const RANK_COLORS = ['#f0932b', '#95a5a6', '#cd6133'];

export default function SoloResultsScreen() {
  const router = useRouter();
  const soloFavorites = usePartyStore((s) => s.soloFavorites);

  const renderResultItem = ({ item, index }: { item: Venue; index: number }) => {
    const rank = index + 1;
    const rankColor = RANK_COLORS[index] ?? COLORS.border;
    const isTopThree = index < 3;
    const priceDisplay = '$'.repeat(item.priceLevel || 1);

    return (
      <View style={styles.resultItem}>
        {/* Rank badge */}
        <View style={[styles.rankBadge, { backgroundColor: isTopThree ? rankColor : '#dfe6e9' }]}>
          <Text style={[styles.rankText, !isTopThree && { color: COLORS.text }]}>
            {rank}
          </Text>
        </View>

        {/* Venue photo thumbnail */}
        {item.photoUrl ? (
          <Image source={{ uri: item.photoUrl }} style={styles.thumbnail} />
        ) : (
          <View style={[styles.thumbnail, styles.thumbnailPlaceholder]}>
            <Text style={styles.thumbnailEmoji}>🍽️</Text>
          </View>
        )}

        {/* Venue info */}
        <View style={styles.resultInfo}>
          <Text style={styles.resultName} numberOfLines={1}>{item.name}</Text>
          <Text style={styles.resultCuisine}>{item.cuisine}</Text>
          <View style={styles.metaRow}>
            <Text style={styles.metaItem}>⭐ {item.rating}</Text>
            <Text style={styles.metaItem}>{priceDisplay}</Text>
            <Text style={styles.metaItem}>📍 {item.distanceMiles} mi</Text>
          </View>
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
        <Text style={styles.headerTitle}>Your Favorites</Text>
        <TouchableOpacity style={styles.homeBtn} onPress={() => router.replace('/')}>
          <Text style={styles.homeBtnText}>🏠</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.subtitle}>
        You liked {soloFavorites.length} restaurant{soloFavorites.length !== 1 ? 's' : ''}
      </Text>

      <FlatList
        data={soloFavorites}
        keyExtractor={(item) => item.id}
        renderItem={renderResultItem}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>🤷</Text>
            <Text style={styles.emptyTitle}>No favorites yet</Text>
            <Text style={styles.emptySubtitle}>
              Swipe right on restaurants you like to add them here.
            </Text>
          </View>
        }
      />

      {/* Bottom buttons */}
      <View style={styles.bottomButtons}>
        <TouchableOpacity
          style={styles.browseAgainBtn}
          onPress={() => router.replace('/solo')}
          activeOpacity={0.7}
        >
          <Text style={styles.browseAgainBtnText}>Browse Again</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.homeLargeBtn}
          onPress={() => router.replace('/')}
          activeOpacity={0.7}
        >
          <Text style={styles.homeLargeBtnText}>Home</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
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
  headerTitle: { fontSize: 22, fontWeight: '800', color: COLORS.text, flex: 1 },
  homeBtn: {
    width: 36, height: 36, borderRadius: 12, backgroundColor: '#fff',
    justifyContent: 'center', alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
  },
  homeBtnText: { fontSize: 16 },
  subtitle: {
    fontSize: 14, color: COLORS.textLight,
    paddingHorizontal: 24, marginBottom: 20,
  },
  listContent: { paddingHorizontal: 24, paddingBottom: 120 },
  resultItem: {
    backgroundColor: '#fff', borderRadius: 16, padding: 14,
    marginBottom: 10, flexDirection: 'row', alignItems: 'center', gap: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04, shadowRadius: 8, elevation: 2,
  },
  rankBadge: {
    width: 32, height: 32, borderRadius: 10,
    justifyContent: 'center', alignItems: 'center',
  },
  rankText: { fontWeight: '800', fontSize: 14, color: '#fff' },
  thumbnail: {
    width: 56, height: 56, borderRadius: 12,
  },
  thumbnailPlaceholder: {
    backgroundColor: '#e17055', justifyContent: 'center', alignItems: 'center',
  },
  thumbnailEmoji: { fontSize: 24 },
  resultInfo: { flex: 1 },
  resultName: { fontSize: 15, fontWeight: '700', color: COLORS.text },
  resultCuisine: { fontSize: 12, color: COLORS.textLight, marginBottom: 4 },
  metaRow: { flexDirection: 'row', gap: 12 },
  metaItem: { fontSize: 12, color: COLORS.text },
  emptyState: { alignItems: 'center', paddingTop: 60 },
  emptyEmoji: { fontSize: 48, marginBottom: 12 },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: COLORS.text, marginBottom: 8 },
  emptySubtitle: {
    fontSize: 15, color: COLORS.textLight, textAlign: 'center', lineHeight: 22,
  },
  bottomButtons: {
    paddingHorizontal: 24, paddingVertical: 16, paddingBottom: 32, gap: 10,
    borderTopWidth: 1, borderTopColor: COLORS.border,
    backgroundColor: COLORS.background,
  },
  browseAgainBtn: {
    backgroundColor: COLORS.primary,
    paddingVertical: 16, borderRadius: 16, alignItems: 'center',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 12, elevation: 5,
  },
  browseAgainBtnText: { color: '#fff', fontSize: 17, fontWeight: '700' },
  homeLargeBtn: {
    backgroundColor: '#fff', paddingVertical: 16, borderRadius: 16,
    alignItems: 'center', borderWidth: 2, borderColor: COLORS.border,
  },
  homeLargeBtnText: { color: COLORS.text, fontSize: 17, fontWeight: '700' },
});
