// This should be set in your environment variables
// For development, you can set it in .env file
// VITE_MAPBOX_ACCESS_TOKEN=your_token_here

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN || '';

// Debug: Log if token is loaded (only in development)
if (import.meta.env.DEV) {
  console.log('Mapbox token loaded:', MAPBOX_TOKEN ? '✅ Token found' : '❌ Token missing');
  if (!MAPBOX_TOKEN) {
    console.warn('Please make sure you have VITE_MAPBOX_ACCESS_TOKEN in your .env file');
  }
}

export const MAPBOX_ACCESS_TOKEN = MAPBOX_TOKEN;

// Map style URL
export const MAP_STYLE = 'mapbox://styles/mapbox/streets-v12';

// DIGIPIN Bounds - defined as a separate constant to avoid circular dependencies
const DIGIPIN_BOUNDS = {
  // Longitude range (east-west)
  MIN_LON: 63.5,  // 63.5° E
  MAX_LON: 99.5,  // 99.5° E
  
  // Latitude range (north-south)
  MIN_LAT: 2.5,   // 2.5° N
  MAX_LAT: 38.5,  // 38.5° N

  // For map.fitBounds() or similar functions
  toBounds: function() {
    return [
      [this.MIN_LAT, this.MIN_LON],  // SW coordinates
      [this.MAX_LAT, this.MAX_LON]   // NE coordinates
    ] as [[number, number], [number, number]];
  },

  // Converts the bounds to a GeoJSON Polygon geometry
  toPolygon: function() {
    return {
      type: 'Polygon' as const,
      coordinates: [
        [
          [this.MIN_LON, this.MIN_LAT], // SW
          [this.MAX_LON, this.MIN_LAT], // SE
          [this.MAX_LON, this.MAX_LAT], // NE
          [this.MIN_LON, this.MAX_LAT], // NW
          [this.MIN_LON, this.MIN_LAT]  // Close polygon (back to SW)
        ]
      ]
    };
  },

  // Check if coordinates are within DIGIPIN bounds
  contains: function(lng: number, lat: number): boolean {
    return lng >= this.MIN_LON && lng <= this.MAX_LON &&
           lat >= this.MIN_LAT && lat <= this.MAX_LAT;
  }
} as const;

// Default map center (center of DIGIPIN bounds)
const DEFAULT_CENTER_LNG = (DIGIPIN_BOUNDS.MIN_LON + DIGIPIN_BOUNDS.MAX_LON) / 2;
const DEFAULT_CENTER_LAT = (DIGIPIN_BOUNDS.MIN_LAT + DIGIPIN_BOUNDS.MAX_LAT) / 2;

export const DEFAULT_MAP_CENTER: [number, number] = [DEFAULT_CENTER_LNG, DEFAULT_CENTER_LAT];
export const DEFAULT_ZOOM_LEVEL = 3;

// DIGIPIN Grid Configuration
export const DIGIPIN_GRID = {
  BOUNDS: DIGIPIN_BOUNDS,

  // Grid size at level 10 (most precise) (only at the Equator)
  GRID_SIZE: {
    WIDTH: 3.8,  // meters
    HEIGHT: 3.8  // meters
  },

  // Grid precision levels
  LEVELS: 10,

  // Character set used in DIGIPIN encoding
  CHARACTER_SET: '23456789CJKLMNPFT',

  // Coordinate Reference System
  CRS: 'EPSG:4326',  // WGS84
  DATUM: 'WGS84 (epoch 2005)'
} as const;

// API Endpoints (example - update with your actual API endpoints)
export const API_ENDPOINTS = {
  GEOCODE: 'https://api.mapbox.com/geocoding/v5/mapbox.places/',
  REVERSE_GEOCODE: 'https://api.mapbox.com/geocoding/v5/mapbox.places/',
} as const;
