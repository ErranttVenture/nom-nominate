/**
 * VenuePhoto — shows a real photo when `uri` is provided, with a warm
 * painterly gradient + halftone placeholder during load (and as fallback
 * when no photo exists). Monogram in Permanent Marker sits bottom-left.
 *
 * Google Places returns a single rep photo via `venue.photoUrl`; pass it in.
 */

import React, { useState } from 'react';
import { View, Image, ViewStyle, StyleProp } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Halftone } from './Halftone';
import { NomText } from '@/theme/NomText';
import { COLOR } from '@/theme/tokens';

const PALETTES: Array<[string, string, string]> = [
  [COLOR.brand.orangeD, COLOR.brand.warn, COLOR.brand.blue],
  [COLOR.semantic.success, COLOR.brand.warn, COLOR.brand.orange],
  [COLOR.brand.blue, COLOR.semantic.destruct, COLOR.brand.warn],
  [COLOR.semantic.destruct, COLOR.brand.orange, COLOR.brand.warn],
];

function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function monogramOf(name: string): string {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .map((w) => w[0])
      .join('')
      .slice(0, 2)
      .toUpperCase() || 'NOM'
  );
}

export interface VenuePhotoProps {
  name: string;
  uri?: string | null;
  cuisine?: string;
  /** Show monogram overlay. Default true when no photo loads. */
  showMonogram?: boolean;
  /** Dim halftone texture. Default 0.18. */
  halftoneOpacity?: number;
  style?: StyleProp<ViewStyle>;
}

export function VenuePhoto({
  name,
  uri,
  cuisine,
  showMonogram = true,
  halftoneOpacity = 0.18,
  style,
}: VenuePhotoProps) {
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  const pal = PALETTES[hash(name) % PALETTES.length];
  const showPlaceholder = !uri || failed || !loaded;

  return (
    <View style={[{ overflow: 'hidden', backgroundColor: pal[0] }, style]}>
      {/* Painterly placeholder — always rendered; photo fades on top */}
      <LinearGradient
        colors={pal}
        locations={[0, 0.6, 1]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
      />
      <View
        pointerEvents="none"
        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
      >
        <Halftone
          width={240}
          height={240}
          color={COLOR.neutral.ink}
          opacity={halftoneOpacity}
          size={7}
          style={{ width: '100%', height: '100%' }}
        />
      </View>
      {/* Real photo on top (if any) */}
      {uri && !failed && (
        <Image
          source={{ uri }}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            opacity: loaded ? 1 : 0,
          }}
          resizeMode="cover"
          onLoadEnd={() => setLoaded(true)}
          onError={() => setFailed(true)}
        />
      )}
      {/* Monogram + cuisine overlay — visible whenever placeholder shows */}
      {showPlaceholder && showMonogram && (
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            left: 12,
            bottom: 8,
          }}
        >
          <NomText
            variant="displayXL"
            color={COLOR.neutral.cream}
            style={{ letterSpacing: -0.6 }}
          >
            {monogramOf(name)}
          </NomText>
        </View>
      )}
      {showPlaceholder && cuisine && (
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            top: 10,
            left: 10,
            backgroundColor: COLOR.neutral.ink,
            paddingHorizontal: 8,
            paddingVertical: 2,
          }}
        >
          <NomText
            variant="monoSm"
            color={COLOR.neutral.paper}
            uppercase
            style={{ letterSpacing: 1.1 }}
          >
            {cuisine}
          </NomText>
        </View>
      )}
    </View>
  );
}
