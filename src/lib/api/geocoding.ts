const GOOGLE_GEOCODING_API_KEY = 'AIzaSyB3c0Gvh-SHmjXbXqdGMFjRstsudnutS4Q';
const BASE_URL = 'https://maps.googleapis.com/maps/api/geocode/json';

interface GeoResult {
  lat: number;
  lng: number;
}

/**
 * Convert a US zip code to lat/lng coordinates via Google Geocoding API.
 */
export async function geocodeZipCode(zipCode: string): Promise<GeoResult> {
  const url = `${BASE_URL}?address=${encodeURIComponent(zipCode)}&components=country:US&key=${GOOGLE_GEOCODING_API_KEY}`;

  const response = await fetch(url);
  const data = await response.json();

  if (data.status !== 'OK' || !data.results?.length) {
    throw new Error(`Could not geocode zip code: ${zipCode}`);
  }

  const location = data.results[0].geometry.location;
  return {
    lat: location.lat,
    lng: location.lng,
  };
}
