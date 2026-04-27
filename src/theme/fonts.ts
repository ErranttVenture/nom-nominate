/**
 * Font loader. Call useBrandFonts() at root; block render until loaded.
 * Font names here match the `FONT` constants in tokens.ts.
 */

import { useFonts } from 'expo-font';

export function useBrandFonts() {
  const [loaded] = useFonts({
    PermanentMarker: require('../../assets/fonts/PermanentMarker-Regular.ttf'),
    PatrickHand: require('../../assets/fonts/PatrickHand-Regular.ttf'),
    CaveatBold: require('../../assets/fonts/Caveat-Bold.ttf'),
  });
  return loaded;
}
