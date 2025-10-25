const env = (() => {
  if (typeof import.meta !== 'undefined' && import.meta.env) {
    return import.meta.env;
  }
  if (typeof process !== 'undefined' && process.env) {
    return process.env;
  }
  return {};
})();

const MAPBOX_BASE_URL = env.VITE_MAPBOX_GEOCODING_URL || 'https://api.mapbox.com/geocoding/v5/mapbox.places';
const ACCESS_TOKEN = env.VITE_MAPBOX_TOKEN || env.VITE_MAPBOX_ACCESS_TOKEN;

function assertToken() {
  if (!ACCESS_TOKEN) {
    throw new Error('Mapbox access token is not configured. Please set VITE_MAPBOX_TOKEN.');
  }
}

function buildUrl(path, params = {}) {
  assertToken();
  const url = new URL(`${MAPBOX_BASE_URL}/${path}.json`);
  url.searchParams.set('access_token', ACCESS_TOKEN);
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      url.searchParams.set(key, value);
    }
  });
  return url.toString();
}

async function mapboxRequest(path, params) {
  const response = await fetch(buildUrl(path, params));
  if (!response.ok) {
    throw new Error(`Geocoding request failed with status ${response.status}`);
  }
  return response.json();
}

function mapFeatureToSuggestion(feature) {
  if (!feature) return null;
  const [lng, lat] = feature.center || [];
  return {
    id: feature.id,
    placeName: feature.place_name,
    text: feature.text,
    coordinates: {
      lat,
      lng
    },
    raw: feature
  };
}

export async function searchAddress(query, { limit = 5 } = {}) {
  if (!query?.trim()) {
    return [];
  }
  const data = await mapboxRequest(encodeURIComponent(query.trim()), {
    autocomplete: 'true',
    limit: String(limit)
  });
  return (data.features || []).map(mapFeatureToSuggestion).filter(Boolean);
}

export async function reverseGeocode({ lat, lng }, { limit = 1 } = {}) {
  if (lat === undefined || lng === undefined) {
    throw new Error('Latitude and longitude are required for reverse geocoding.');
  }
  const data = await mapboxRequest(`${lng},${lat}`, {
    limit: String(limit)
  });
  const [feature] = data.features || [];
  return feature ? mapFeatureToSuggestion(feature) : null;
}

export function formatSuggestionLabel(suggestion) {
  return suggestion?.placeName || '';
}

export default {
  searchAddress,
  reverseGeocode,
  formatSuggestionLabel
};
