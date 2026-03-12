import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { COLORS } from '@/constants';
import type { Party } from '@/types';

interface PartyListCardProps {
  party: Party;
  onPress: () => void;
}

export function PartyListCard({ party, onPress }: PartyListCardProps) {
  const memberCount = party.memberIds.length;
  const statusLabel = getStatusLabel(party);
  const statusStyle = getStatusStyle(party);

  const dateStr = party.date
    ? new Date(party.date).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      })
    : undefined;

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.7}>
      <Text style={styles.name}>{party.name}</Text>
      <Text style={styles.meta}>
        {memberCount} member{memberCount !== 1 ? 's' : ''} · {party.zipCode} · {party.radiusMiles} mi
        {dateStr ? ` · ${dateStr}` : ''}
      </Text>
      <View style={[styles.badge, statusStyle.badge]}>
        <Text style={[styles.badgeText, statusStyle.text]}>{statusLabel}</Text>
      </View>
    </TouchableOpacity>
  );
}

function getStatusLabel(party: Party): string {
  switch (party.status) {
    case 'lobby':
      return 'Waiting for members';
    case 'swiping':
      return 'Swiping in progress';
    case 'nominated':
      return `✓ Nominated`;
    case 'results':
      return 'Results available';
    default:
      return party.status;
  }
}

function getStatusStyle(party: Party) {
  if (party.status === 'nominated') {
    return {
      badge: { backgroundColor: 'rgba(46,204,113,0.12)' },
      text: { color: COLORS.success },
    };
  }
  return {
    badge: { backgroundColor: 'rgba(255,107,53,0.12)' },
    text: { color: COLORS.primary },
  };
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  name: {
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.text,
  },
  meta: {
    fontSize: 13,
    color: COLORS.textLight,
    marginTop: 4,
  },
  badge: {
    alignSelf: 'flex-start',
    marginTop: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
});
