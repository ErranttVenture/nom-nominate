/**
 * History — scrollable list of past nominations.
 */

import React from 'react';
import { View, FlatList } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { usePartyStore } from '@/stores/partyStore';
import { PartyListCard } from '@/components/party/PartyListCard';
import { NomText } from '@/theme/NomText';
import { useTheme } from '@/theme/ThemeContext';
import { SPACE } from '@/theme/tokens';

export default function HistoryScreen() {
  const router = useRouter();
  const theme = useTheme();
  const pastParties = usePartyStore((s) => s.pastParties);

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: theme.bg }}
      edges={['top']}
    >
      <View
        style={{
          paddingHorizontal: SPACE[5],
          paddingBottom: SPACE[4],
        }}
      >
        <NomText variant="displayXL" color={theme.text}>
          history
        </NomText>
        <NomText variant="bodyMd" soft style={{ marginTop: SPACE[1] }}>
          past nominations.
        </NomText>
      </View>

      <FlatList
        data={pastParties}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <PartyListCard
            party={item}
            onPress={() =>
              router.push({
                pathname: '/party/results',
                params: { partyId: item.id },
              })
            }
          />
        )}
        contentContainerStyle={{
          paddingHorizontal: SPACE[5],
          paddingBottom: SPACE[6],
        }}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={{ alignItems: 'center', paddingTop: SPACE[10] }}>
            <NomText variant="displayLg" center>
              no history yet
            </NomText>
            <NomText
              variant="bodyMd"
              soft
              center
              style={{ marginTop: SPACE[2], maxWidth: 260 }}
            >
              Your completed nominations will appear here.
            </NomText>
          </View>
        }
      />
    </SafeAreaView>
  );
}
