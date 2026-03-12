/**
 * Google Places API (New) service for nearby restaurant search.
 *
 * Uses the Places API (New) — "Nearby Search" endpoint via REST.
 * Docs: https://developers.google.com/maps/documentation/places/web-service/nearby-search
 *
 * Also provides geocoding via the Geocoding API to convert zip codes → lat/lng.
 */

import type { Venue } from '@/types';

const PLACES_API_KEY = 'AIzaSyA_AHVtLPJuxhm_RcUKtpzOamwiCliHRJs';

// ─── Geocoding ───────────────────────────────────────────────────

interface GeocodingResult {
  lat: number;
  lng: number;
}

/**
 * Convert a US zip code to lat/lng using Google Geocoding API.
 */
export async function geocodeZipCode(zipCode: string): Promise<GeocodingResult> {
  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(zipCode)}&key=${PLACES_API_KEY}`;

  const res = await fetch(url);
  const data = await res.json();

  if (data.status !== 'OK' || !data.results?.length) {
    throw new Error(`Geocoding failed for zip "${zipCode}": ${data.status}`);
  }

  const location = data.results[0].geometry.location;
  return { lat: location.lat, lng: location.lng };
}

// ─── Nearby Restaurant Search ────────────────────────────────────

function milesToMeters(miles: number): number {
  return Math.round(miles * 1609.344);
}

/**
 * Calculate distance in miles between two lat/lng points (Haversine).
 */
function haversineDistanceMiles(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 3958.8; // Earth radius in miles
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10; // one decimal
}

/**
 * Map a Google price_level (0-4) to our 1-4 scale.
 */
function mapPriceLevel(level?: number): number {
  if (level === undefined || level === null) return 2; // default mid-range
  return Math.max(1, Math.min(4, level));
}

/**
 * Build a photo URL from a Places API photo reference.
 */
function photoUrl(photoName: string, maxWidth = 400): string {
  return `https://places.googleapis.com/v1/${photoName}/media?maxWidthPx=${maxWidth}&key=${PLACES_API_KEY}`;
}

/**
 * Extract a cuisine tag from the place types array.
 */
function extractCuisine(types: string[]): string {
  const cuisineMap: Record<string, string> = {
    american_restaurant: 'American',
    mexican_restaurant: 'Mexican',
    italian_restaurant: 'Italian',
    chinese_restaurant: 'Chinese',
    japanese_restaurant: 'Japanese',
    thai_restaurant: 'Thai',
    indian_restaurant: 'Indian',
    korean_restaurant: 'Korean',
    vietnamese_restaurant: 'Vietnamese',
    french_restaurant: 'French',
    mediterranean_restaurant: 'Mediterranean',
    greek_restaurant: 'Greek',
    turkish_restaurant: 'Turkish',
    spanish_restaurant: 'Spanish',
    brazilian_restaurant: 'Brazilian',
    seafood_restaurant: 'Seafood',
    steak_house: 'Steakhouse',
    sushi_restaurant: 'Sushi',
    pizza_restaurant: 'Pizza',
    burger_restaurant: 'Burgers',
    barbecue_restaurant: 'BBQ',
    ramen_restaurant: 'Ramen',
    vegan_restaurant: 'Vegan',
    vegetarian_restaurant: 'Vegetarian',
    breakfast_restaurant: 'Breakfast',
    brunch_restaurant: 'Brunch',
    sandwich_shop: 'Sandwiches',
    ice_cream_shop: 'Ice Cream',
    bakery: 'Bakery',
    cafe: 'Cafe',
    coffee_shop: 'Coffee',
    bar: 'Bar',
    fast_food_restaurant: 'Fast Food',
  };

  for (const type of types) {
    if (cuisineMap[type]) return cuisineMap[type];
  }

  return 'Restaurant';
}

/**
 * Search for nearby restaurants using the Places API (New) — Nearby Search.
 *
 * Returns up to `maxResults` venues sorted by relevance/popularity.
 */
export async function searchNearbyRestaurants(options: {
  lat: number;
  lng: number;
  radiusMiles: number;
  maxResults?: number;
}): Promise<Venue[]> {
  const { lat, lng, radiusMiles, maxResults = 20 } = options;

  const radiusMeters = milesToMeters(radiusMiles);

  // Places API (New) — Nearby Search via POST
  const url = 'https://places.googleapis.com/v1/places:searchNearby';

  const body = {
    includedTypes: ['restaurant'],
    maxResultCount: maxResults,
    locationRestriction: {
      circle: {
        center: { latitude: lat, longitude: lng },
        radius: Math.min(radiusMeters, 50000), // API max is 50km
      },
    },
  };

  const fieldMask = [
    'places.id',
    'places.displayName',
    'places.types',
    'places.rating',
    'places.priceLevel',
    'places.photos',
    'places.location',
    'places.formattedAddress',
    'places.currentOpeningHours',
    'places.regularOpeningHours',
  ].join(',');

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': PLACES_API_KEY,
      'X-Goog-FieldMask': fieldMask,
    },
    body: JSON.stringify(body),
  });

  const data = await res.json();

  if (data.error) {
    console.error('Places API error:', data.error);
    throw new Error(`Places API error: ${data.error.message}`);
  }

  const places = data.places ?? [];

  return places.map((place: any): Venue => {
    const placeLat = place.location?.latitude ?? lat;
    const placeLng = place.location?.longitude ?? lng;

    // Get the first photo if available
    let venuePhotoUrl: string | undefined;
    if (place.photos?.length > 0) {
      venuePhotoUrl = photoUrl(place.photos[0].name);
    }

    // Map price level string to number
    let priceLevel = 2;
    if (place.priceLevel) {
      const priceLevelMap: Record<string, number> = {
        PRICE_LEVEL_FREE: 1,
        PRICE_LEVEL_INEXPENSIVE: 1,
        PRICE_LEVEL_MODERATE: 2,
        PRICE_LEVEL_EXPENSIVE: 3,
        PRICE_LEVEL_VERY_EXPENSIVE: 4,
      };
      priceLevel = priceLevelMap[place.priceLevel] ?? 2;
    }

    return {
      id: place.id ?? '',
      name: place.displayName?.text ?? 'Unknown',
      cuisine: extractCuisine(place.types ?? []),
      rating: place.rating ?? 0,
      priceLevel,
      photoUrl: venuePhotoUrl,
      lat: placeLat,
      lng: placeLng,
      distanceMiles: haversineDistanceMiles(lat, lng, placeLat, placeLng),
      address: place.formattedAddress ?? '',
      hasOffer: false, // No sponsored offers yet
    };
  });
}
