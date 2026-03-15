import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  Alert,
  Share,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS } from '@/constants';
import { useAuthStore } from '@/stores/authStore';
import { usePartyLobby } from '@/hooks/usePartyLobby';
import { PartyService } from '@/lib/services';
import type { PartyMember } from '@/types';

const AVATAR_COLORS = ['#FF6B35', '#6c5ce7', '#00b894', '#fdcb6e', '#e17055', '#0984e3', '#00cec9', '#fd79a8'];

export default function PartyLobbyScreen() {
  const { id: partyId } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const { party, members, loading, error } = usePartyLobby(partyId!);
  const [starting, setStarting] = useState(false);

  // Show error and navigate back if party can't be loaded
  useEffect(() => {
    if (error) {
      Alert.alert('Error', error, [
        { text: 'OK', onPress: () => router.replace('/') },
      ]);
    }
  }, [error]);

  const isCreator = party?.creatorId === user?.id;

  const handleInvite = async () => {
    const link = `https://nom-nominate.web.app/party/${partyId}`;
    try {
      await Share.share({
        message: `Join my Nom Nominate party "${party?.name}"! 🍽️\n\n${link}`,
        url: link,
      });
    } catch (error) {
      // User cancelled share
    }
  };

  const handleStartSwiping = async () => {
    if (members.length < 2) {
      Alert.alert('Need More People', 'You need at least 2 members to start swiping.');
      return;
    }

    setStarting(true);
    try {
      await PartyService.startSwipingSession(partyId!);
      router.replace({ pathname: '/party/swipe', params: { partyId } });
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to start swiping.');
    } finally {
      setStarting(false);
    }
  };

  // Redirect if party is already in swiping mode
  useEffect(() => {
    if (party?.status === 'swiping') {
      router.replace({ pathname: '/party/swipe', params: { partyId } });
    } else if (party?.status === 'nominated') {
      router.replace({ pathname: '/party/success', params: { partyId } });
    }
  }, [party?.status]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  const getMemberBadge = (member: PartyMember) => {
    if (member.status === 'declined') {
      return { label: 'Declined', style: styles.badgeDeclined, textStyle: styles.badgeTextDeclined };
    }
    if (member.status === 'invited') {
      return { label: 'Invited', style: styles.badgeInvited, textStyle: styles.badgeTextInvited };
    }
    if (member.status === 'done' || member.swipeCount >= 20) {
      return { label: 'Noms Nominated', style: styles.badgeNominated, textStyle: styles.badgeTextNominated };
    }
    // joined or swiping but not done
    return { label: 'Nominating Needed', style: styles.badgeNeeded, textStyle: styles.badgeTextNeeded };
  };

  const renderMember = ({ item, index }: { item: PartyMember; index: number }) => {
    const color = AVATAR_COLORS[index % AVATAR_COLORS.length];
    const isYou = item.userId === user?.id;
    const initial = item.displayName.charAt(0).toUpperCase();
    const badge = getMemberBadge(item);

    return (
      <View style={styles.memberRow}>
        <View style={[styles.memberAvatar, { backgroundColor: color }]}>
          <Text style={styles.memberInitial}>{initial}</Text>
        </View>
        <View style={styles.memberInfo}>
          <Text style={styles.memberName}>
            {item.displayName}{isYou ? ' (you)' : ''}
          </Text>
          <Text style={styles.memberStatus}>
            {item.status === 'invited' || item.status === 'declined'
              ? 'Invited'
              : `Joined ${formatTimeAgo(item.joinedAt)}`}
          </Text>
        </View>
        <View style={[styles.memberBadge, badge.style]}>
          <Text style={[styles.badgeText, badge.textStyle]}>
            {badge.label}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.replace('/')}>
          <Text style={styles.backBtnText}>🏠</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Party Lobby</Text>
      </View>

      {/* Party Info */}
      <View style={styles.partyInfo}>
        <Text style={styles.partyName}>{party?.name}</Text>
        <Text style={styles.partyMeta}>
          {party?.zipCode} · {party?.radiusMiles} mi
          {party?.date ? ` · ${new Date(party.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}` : ''}
        </Text>
      </View>

      {/* Members List */}
      <FlatList
        data={members}
        keyExtractor={(item) => item.userId}
        renderItem={renderMember}
        ListHeaderComponent={
          <Text style={styles.sectionTitle}>MEMBERS ({members.length})</Text>
        }
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />

      {/* Bottom Actions */}
      <View style={styles.bottomActions}>
        <TouchableOpacity style={styles.inviteBtn} onPress={handleInvite}>
          <Text style={styles.inviteIcon}>📤</Text>
          <Text style={styles.inviteBtnText}>Invite More Friends</Text>
        </TouchableOpacity>

        {isCreator && (
          <TouchableOpacity
            style={[styles.startBtn, starting && styles.startBtnDisabled]}
            onPress={handleStartSwiping}
            disabled={starting}
          >
            {starting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.startBtnText}>Start Swiping 🔥</Text>
            )}
          </TouchableOpacity>
        )}

        {!isCreator && (
          <View style={styles.waitingBanner}>
            <Text style={styles.waitingText}>
              Waiting for the party creator to start swiping...
            </Text>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

function formatTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - new Date(date).getTime();
  const diffMin = Math.floor(diffMs / 60000);

  if (diffMin < 1) return 'just now';
  if (diffMin < 60) return `${diffMin} min ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  return `${Math.floor(diffHr / 24)}d ago`;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 24,
    paddingBottom: 16,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 12, backgroundColor: '#fff',
    justifyContent: 'center', alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
  },
  backBtnText: { fontSize: 18 },
  headerTitle: { fontSize: 22, fontWeight: '800', color: COLORS.text },
  partyInfo: { alignItems: 'center', marginBottom: 24 },
  partyName: { fontSize: 24, fontWeight: '800', color: COLORS.text, marginBottom: 4 },
  partyMeta: { fontSize: 14, color: COLORS.textLight },
  listContent: { paddingHorizontal: 24 },
  sectionTitle: {
    fontSize: 13, fontWeight: '700', letterSpacing: 1,
    color: COLORS.textLight, marginBottom: 12,
  },
  memberRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f0f0f0',
  },
  memberAvatar: {
    width: 40, height: 40, borderRadius: 20,
    justifyContent: 'center', alignItems: 'center',
  },
  memberInitial: { color: '#fff', fontWeight: '700', fontSize: 14 },
  memberInfo: { flex: 1 },
  memberName: { fontSize: 15, fontWeight: '600', color: COLORS.text },
  memberStatus: { fontSize: 12, color: COLORS.textLight },
  memberBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  badgeDeclined: { backgroundColor: 'rgba(231,76,60,0.12)' },
  badgeTextDeclined: { color: COLORS.danger },
  badgeInvited: { backgroundColor: 'rgba(255,107,53,0.12)' },
  badgeTextInvited: { color: COLORS.primary },
  badgeNeeded: { backgroundColor: 'rgba(108,92,231,0.12)' },
  badgeTextNeeded: { color: '#6c5ce7' },
  badgeNominated: { backgroundColor: 'rgba(46,204,113,0.12)' },
  badgeTextNominated: { color: COLORS.success },
  badgeText: { fontSize: 11, fontWeight: '700' },
  bottomActions: { paddingHorizontal: 24, paddingBottom: 40, paddingTop: 16 },
  inviteBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    padding: 16, borderWidth: 2, borderColor: COLORS.border, borderRadius: 14,
    backgroundColor: '#fff', marginBottom: 12,
  },
  inviteIcon: { fontSize: 16 },
  inviteBtnText: { fontSize: 15, fontWeight: '600', color: COLORS.text },
  startBtn: {
    backgroundColor: COLORS.primary, borderRadius: 16,
    padding: 18, alignItems: 'center',
  },
  startBtnDisabled: { opacity: 0.7 },
  startBtnText: { color: '#fff', fontSize: 17, fontWeight: '700' },
  waitingBanner: {
    backgroundColor: 'rgba(255,107,53,0.08)', borderRadius: 14,
    padding: 16, alignItems: 'center',
  },
  waitingText: { fontSize: 14, color: COLORS.textLight, textAlign: 'center' },
});
