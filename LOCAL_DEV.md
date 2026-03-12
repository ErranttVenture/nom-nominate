# Nom Nominate — Local Development (Mock Mode)

Run the full app locally with mock data — no Firebase, no API keys, no accounts needed.

## Prerequisites

- **Node.js 18+** — [download here](https://nodejs.org/)
- **Expo CLI** — install globally: `npm install -g expo-cli`
- **Expo Go app** on your phone (optional, for testing on device)
  - [iOS App Store](https://apps.apple.com/app/expo-go/id982107779)
  - [Google Play Store](https://play.google.com/store/apps/details?id=host.exp.exponent)
- **iOS Simulator** (Mac only) — comes with Xcode
- **Android Emulator** — comes with Android Studio

## Quick Start

```bash
# 1. Navigate to the project
cd app-scaffold

# 2. Install dependencies
npm install

# 3. Start the dev server
npx expo start
```

This opens the Expo dev tools. From there:

- Press **i** to open in iOS Simulator
- Press **a** to open in Android Emulator
- Scan the **QR code** with Expo Go on your phone

## What Mock Mode Does

When `USE_MOCK = true` in `src/lib/services.ts` (this is the default), the app:

- **Skips all Firebase calls** — no Firebase project needed
- **Auto-authenticates** as "Sean" — skips the phone verification flow
- **Loads 20 mock venues** around Beverly Hills (90210) with realistic names, cuisines, ratings, prices, and distances
- **Includes 3 sponsored offers** so you can see the offer banner UX
- **Shows 1 active party** ("Friday Night Dinner") and 3 past nominations on the home screen
- **Simulates 4 party members** (Sean, Alex, Maria, Jordan) in the lobby
- **Priority badges** appear on venues that other "members" have right-swiped
- **Full swipe mechanics** work (gesture + buttons) with all animations
- **Results screen** shows pre-populated vote data with percentages

## How to Test Each Screen

| Screen | How to reach it |
|---|---|
| **Home** | App launches directly here (auto-authenticated) |
| **Create Party** | Tap "+ New Party" on home screen |
| **Party Lobby** | Tap "Friday Night Dinner" card, or create a new party |
| **Swipe** | Tap "Start Swiping" in the lobby |
| **Success** | Swipe right on enough venues (or navigate via code) |
| **Results** | Tap "Show Results" banner after 20 swipes, or "View All Results" from success |
| **History** | Tap the "History" tab |
| **Settings** | Tap the "Settings" tab |

## Simulating a Nomination

In mock mode the nomination doesn't auto-trigger (since there's no Cloud Function). To test the success screen, you can either:

**Option A:** In `src/lib/mock/services.ts`, import and call `simulateNomination`:
```typescript
// In any component or hook, after a right-swipe:
import { simulateNomination } from '@/lib/mock/services';
simulateNomination('party_1', 'venue_1'); // triggers the success flow
```

**Option B:** Navigate directly in the swipe screen by temporarily modifying `swipe.tsx`:
```typescript
// After 5 right-swipes, auto-trigger success:
if (swipeCount >= 5 && direction === 'right') {
  router.replace({
    pathname: '/party/success',
    params: { partyId, venueId: venue.id },
  });
}
```

## Switching to Production

When you're ready to connect real Firebase:

1. Open `src/lib/services.ts`
2. Change `USE_MOCK = true` to `USE_MOCK = false`
3. Follow the Firebase setup in `SETUP.md`

That's it — every screen and hook reads from the service layer, so no other code changes are needed.

## Troubleshooting

| Issue | Fix |
|---|---|
| `expo start` fails | Make sure you ran `npm install` first |
| "Module not found" errors | The app may try to resolve Firebase imports — ensure `USE_MOCK = true` |
| Blank screen on launch | Check terminal for errors; restart with `npx expo start --clear` |
| Swipe gestures not working | Make sure `react-native-gesture-handler` is installed; restart the dev server |
| DateTimePicker crashes | This requires native modules; use `npx expo run:ios` instead of Expo Go |
