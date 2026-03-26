import type { Venue } from '@/types';

const GOOGLE_PLACES_API_KEY = 'AIzaSyB3c0Gvh-SHmjXbXqdGMFjRstsudnutS4Q';
const BASE_URL = 'https://places.googleapis.com/v1/places:searchNearby';

interface SearchVenuesParams {
  lat: number;
  lng: number;
  radiusMeters: number;
  date?: string; // ISO date string
}

/**
 * Search for restaurants and bars near a location using Google Places API (New).
 * Nearby Search returns up to 20 results per call with no pagination.
 */
export async function searchVenues({
  lat,
  lng,
  radiusMeters,
  date,
}: SearchVenuesParams): Promise<Venue[]> {
  const body: Record<string, any> = {
    includedTypes: ['restaurant', 'bar', 'cafe'],
    maxResultCount: 20,
    locationRestriction: {
      circle: {
        center: { latitude: lat, longitude: lng },
        radius: radiusMeters,
      },
    },
  };

  const response = await fetch(BASE_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': GOOGLE_PLACES_API_KEY,
      'X-Goog-FieldMask': [
        'places.id',
        'places.displayName',
        'places.primaryType',
        'places.rating',
        'places.priceLevel',
        'places.photos',
        'places.location',
        'places.formattedAddress',
        'places.currentOpeningHours',
        'places.regularOpeningHours',
      ].join(','),
    },
    body: JSON.stringify(body),
  });

  const data = await response.json();

  if (!response.ok) {
    console.error('Places API error:', response.status, data);
    return [];
  }

  if (!data.places) return [];

  const venues: Venue[] = data.places.map((place: any) => {
    const venue: Venue = {
      id: place.id,
      name: place.displayName?.text ?? 'Unknown',
      cuisine: formatType(place.primaryType),
      rating: place.rating ?? 0,
      priceLevel: parsePriceLevel(place.priceLevel),
      photoUrl: place.photos?.[0]
        ? getPhotoUrl(place.photos[0].name)
        : null,
      lat: place.location?.latitude ?? 0,
      lng: place.location?.longitude ?? 0,
      distanceMiles: calculateDistance(lat, lng, place.location?.latitude, place.location?.longitude),
      address: place.formattedAddress ?? '',
      isOpenOnDate: date ? checkOpenOnDate(place.regularOpeningHours, date) : null,
      hasOffer: false,
    };
    return venue;
  });

  // Filter out venues closed on the selected date
  const filtered = date ? venues.filter((v) => v.isOpenOnDate !== false) : venues;

  return filtered;
}

function formatType(type?: string): string {
  if (!type) return 'Restaurant';
  return type
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function parsePriceLevel(level?: string): number {
  const map: Record<string, number> = {
    PRICE_LEVEL_FREE: 0,
    PRICE_LEVEL_INEXPENSIVE: 1,
    PRICE_LEVEL_MODERATE: 2,
    PRICE_LEVEL_EXPENSIVE: 3,
    PRICE_LEVEL_VERY_EXPENSIVE: 4,
  };
  return map[level ?? ''] ?? 2;
}

function getPhotoUrl(photoName: string): string {
  return `https://places.googleapis.com/v1/${photoName}/media?maxHeightPx=400&maxWidthPx=400&key=${GOOGLE_PLACES_API_KEY}`;
}

function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 3959; // Earth radius in miles
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)) * 10) / 10;
}

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

function checkOpenOnDate(hours: any, dateStr: string): boolean {
  if (!hours?.periods) return true; // assume open if no data
  const date = new Date(dateStr);
  const dayOfWeek = date.getDay(); // 0=Sunday
  return hours.periods.some((p: any) => p.open?.day === dayOfWeek);
}
