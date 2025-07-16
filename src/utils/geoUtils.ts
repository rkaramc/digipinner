/**
 * Utility functions for geographic operations
 *
 * @module geoUtils
 *
 */

/**
 * Small offset to avoid grid lines (equivalent to ~1cm at the equator)
 * @constant
 * @type {number}
 */
export const EPSILON = 0.0000001;

/**
 * Length of a DIGIPIN (number of characters)
 * @constant
 * @type {number}
 */
const DIGIPIN_LENGTH = 10;

/**
 * Size of the DIGIPIN grid (number of cells in each direction)
 * @constant
 * @type {number}
 */
const DIGIPIN_GRID_SIZE = 4;

/**
 * Bounding box for India (EPSG:4326/WGS84)
 * @constant
 * @type {Object}
 */
export const DIGIPIN_BOUNDS = {
  // Longitude range (east-west)
  MIN_LON: 63.5, // 63.5° E
  MAX_LON: 99.5, // 99.5° E

  // Latitude range (north-south)
  MIN_LAT: 2.5, // 2.5° N
  MAX_LAT: 38.5, // 38.5° N

  // Extents of the DIGIPIN grid (in decimal degrees)
  LON_EXTENT: 9,
  LAT_EXTENT: 9,

  /**
   * Validate lat/long coordinates are within the DIGIPIN bounds
   *
   * @param lat - Latitude in decimal degrees (EPSG:4326/WGS84)
   * @param lng - Longitude in decimal degrees (EPSG:4326/WGS84)
   * @returns boolean - True if the coordinates are within the bounds, false otherwise
   */
  isValidCoordinate: (lat: number, lng: number) => {
    return (
      lat >= DIGIPIN_BOUNDS.MIN_LAT &&
      lat <= DIGIPIN_BOUNDS.MAX_LAT &&
      lng >= DIGIPIN_BOUNDS.MIN_LON &&
      lng <= DIGIPIN_BOUNDS.MAX_LON
    );
  },

  /**
   * Adjust lat/long coordinates to avoid DIGIPIN grid lines
   *
   * @param lat - Latitude in decimal degrees (EPSG:4326/WGS84)
   * @param lng - Longitude in decimal degrees (EPSG:4326/WGS84)
   * @returns { lat: number, lng: number } - Adjusted coordinates
   */
  avoidGridLines: (lat: number, lng: number): { lat: number; lng: number } => {
    if (isNaN(lat) || isNaN(lng)) {
      throw new Error("Invalid coordinates: lat and lng must be numbers");
    }
    if (!DIGIPIN_BOUNDS.isValidCoordinate(lat, lng)) {
      throw new Error("Invalid coordinates: lat and lng must be within bounds");
    }

    // calculate grid positions
    const lonCell = Math.min(3, Math.floor(
      (lng - DIGIPIN_BOUNDS.MIN_LON) / DIGIPIN_BOUNDS.LON_EXTENT
    ));
    const latCell = Math.min(3, Math.floor(
      (lat - DIGIPIN_BOUNDS.MIN_LAT) / DIGIPIN_BOUNDS.LAT_EXTENT
    ));

    const gridlon =
      lonCell * DIGIPIN_BOUNDS.LON_EXTENT + DIGIPIN_BOUNDS.MIN_LON;
    const gridlat =
      latCell * DIGIPIN_BOUNDS.LAT_EXTENT + DIGIPIN_BOUNDS.MIN_LAT;

    // calculate distances to nearest grid lines
    const lonDist = Math.abs(lng - gridlon);
    const latDist = Math.abs(lat - gridlat);
    const maxLonDist = Math.abs(DIGIPIN_BOUNDS.MAX_LON - lng);
    const maxLatDist = Math.abs(DIGIPIN_BOUNDS.MAX_LAT - lat);

    // early return if no adjustment is needed
    if (
      lonDist > EPSILON &&
      latDist > EPSILON &&
      maxLonDist > EPSILON &&
      maxLatDist > EPSILON
    ) {
      return { lat, lng };
    }

    // adjust coordinates to avoid grid lines
    let adjustedLon = lng;
    if (lonDist < EPSILON) {
      adjustedLon = lng + EPSILON;
    } else if (maxLonDist < EPSILON) {
      adjustedLon = lng - 2 * EPSILON;
    }

    let adjustedLat = lat;
    if (latDist < EPSILON) {
      adjustedLat = lat + EPSILON;
    } else if (maxLatDist < EPSILON) {
      adjustedLat = lat - 2 * EPSILON;
    }

    return { lat: adjustedLat, lng: adjustedLon };
  },
};

/**
 * DIGIPIN Mapping
 * The spiral pattern is anticlockwise from the center, as per the specification
 * This mapping is based on Figure 2 and 3 in the technical document
 *
 *            F < C < 9 < 8
 *            v           ^
 *            J   3 < 2   7
 *            v   v       ^
 *            K   4 > 5 > 6
 *            v
 *            L > M > P > T
 *
 */
const DIGIPIN_MAPPING = [
  ["L", "M", "P", "T"], // y=0 bottom row
  ["K", "4", "5", "6"], // y=1
  ["J", "3", "2", "7"], // y=2
  ["F", "C", "9", "8"], // y=3 top row
];

/**
 * Reverse mapping from DIGIPIN symbols to their [y,x] coordinates in the grid.
 * y=0 is the bottom row, y=3 is the top row
 * x=0 is the leftmost column, x=3 is the rightmost column
 */
const REVERSE_DIGIPIN_MAPPING: { [key: string]: [number, number] } = {};

/**
 * Initialize the reverse mapping
 *
 * @param DIGIPIN_MAPPING - The DIGIPIN mapping array
 * @param REVERSE_DIGIPIN_MAPPING - The reverse mapping object
 */
for (let i = 0; i < DIGIPIN_MAPPING.length; i++) {
  for (let j = 0; j < DIGIPIN_MAPPING[i].length; j++) {
    const symbol = DIGIPIN_MAPPING[i][j];
    REVERSE_DIGIPIN_MAPPING[symbol] = [i, j];
  }
}

// The symbols used in DIGIPIN derived from DIGIPIN_MAPPING by flattening the array
// We collect them in a specific order to maintain consistency with the DIGIPIN encoding scheme
const DIGIPIN_SYMBOLS = [
  // Numbers first
  ..."23456789".split(""),
  // Then letters in alphabetical order
  ..."CFJKLMPT".split(""),
].filter((symbol) => DIGIPIN_MAPPING.flat().includes(symbol));

/**
 * Helper function to clean and perform basic validation on a DIGIPIN
 * @param digipin - The DIGIPIN string to validate
 * @param allowPartial - Whether to allow partial DIGIPINs (less than 10 chars)
 * @returns The cleaned DIGIPIN if valid, null otherwise
 */
export const cleanAndValidateDigipin = (
  digipin: string,
  allowPartial: boolean = false,
  separator: string = ""
): string | null => {
  // Check if digipin is defined and is a string
  if (!digipin || typeof digipin !== "string") {
    return null;
  }

  // Clean up the input by removing spaces
  const cleanDigipin = digipin
    .replace(/\s+/g, "")
    .replace(new RegExp(`[${separator.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}]`, "g"), "")
    .toUpperCase();
  
  // Check DIGIPIN length
  if (allowPartial) {
    // For partial DIGIPINs, length should be at most 10
    if (cleanDigipin.length > DIGIPIN_LENGTH) {
      return null;
    }
  } else {
    // For complete DIGIPINs, length must be exactly 10
    if (cleanDigipin.length !== DIGIPIN_LENGTH) {
      return null;
    }
  }

  // Validate that all characters are from the allowed set
  for (const char of cleanDigipin) {
    if (!DIGIPIN_SYMBOLS.includes(char)) {
      return null;
    }
  }

  return cleanDigipin;
};

/**
 * Validates if a string is a valid DIGIPIN format
 * @param digipin - The DIGIPIN string to validate
 * @param allowPartial - Whether to allow partial DIGIPINs (less than 10 chars)
 * @returns boolean - True if the DIGIPIN is valid, false otherwise
 */
export const isValidDIGIPIN = (
  digipin: string,
  allowPartial: boolean = false
): boolean => {
  // Perform basic validation using the helper function
  const cleanDigipin = cleanAndValidateDigipin(digipin, allowPartial);

  // If basic validation failed, return false
  if (!cleanDigipin) {
    return false;
  }

  // Check if the DIGIPIN is within the valid range for India
  // This is a basic check - we could add more sophisticated validation
  // based on the hierarchical encoding if needed
  try {
    const location = convertDIGIPINToGeoLocation(cleanDigipin, allowPartial);

    // If conversion returns null, the DIGIPIN is invalid
    if (!location) {
      return false;
    }

    // Check if coordinates are within India's bounding box using DIGIPIN_BOUNDS
    const { lat, lng } = location;
    return DIGIPIN_BOUNDS.isValidCoordinate(lat, lng);
  } catch (error) {
    // If any error occurs during conversion, the DIGIPIN is invalid
    return false;
  }
};

/**
 * Converts geographic coordinates to a DIGIPIN format according to the official India Post specification
 * DIGIPIN is a 10-digit alphanumeric code that represents a 4m x 4m grid cell in India
 *
 * @param lat - Latitude in decimal degrees (EPSG:4326/WGS84)
 * @param lng - Longitude in decimal degrees (EPSG:4326/WGS84)
 * @returns A string representing the DIGIPIN code
 */
export const convertGeoLocationToDIGIPIN = (
  lat: number,
  lng: number,
  separator: string = " "
): string => {
  console.log("convertGeoLocationToDIGIPIN", lat, lng);
  // Check if the coordinates are within India's bounding box
  if (!DIGIPIN_BOUNDS.isValidCoordinate(lat, lng)) {
    return ""; // Location is outside India's bounding box
  }

  ({ lat, lng } = DIGIPIN_BOUNDS.avoidGridLines(lat, lng));

  // Initialize the DIGIPIN code
  let digipin = "";

  // Current bounding box for recursive subdivision
  let currentMinLng = DIGIPIN_BOUNDS.MIN_LON;
  let currentMaxLng = DIGIPIN_BOUNDS.MAX_LON;
  let currentMinLat = DIGIPIN_BOUNDS.MIN_LAT;
  let currentMaxLat = DIGIPIN_BOUNDS.MAX_LAT;

  // Generate the 10-digit DIGIPIN code through recursive subdivision
  for (let level = 0; level < DIGIPIN_LENGTH; level++) {
    // Calculate the width and height of the current level's grid cells
    const lngWidth = (currentMaxLng - currentMinLng) / DIGIPIN_GRID_SIZE;
    const latHeight = (currentMaxLat - currentMinLat) / DIGIPIN_GRID_SIZE;

    // Determine which grid cell the point falls into (0-3 for both x and y)
    const xIndex = Math.min(3, Math.floor((lng - currentMinLng) / lngWidth));
    const yIndex = Math.min(3, Math.floor((lat - currentMinLat) / latHeight));

    // Get the symbol from the DIGIPIN_MAPPING using the y,x coordinates
    const symbol = DIGIPIN_MAPPING[yIndex][xIndex];

    // Add the symbol to the DIGIPIN code
    digipin += symbol;

    // Format with a space after the 3rd and 6th characters for readability
    if (level === 2 || level === 5) {
      digipin += separator;
    }

    // Update the bounding box for the next level of subdivision
    currentMinLng += xIndex * lngWidth;
    currentMaxLng = currentMinLng + lngWidth;
    currentMinLat += yIndex * latHeight;
    currentMaxLat = currentMinLat + latHeight;
  }

  return digipin;
};

/**
 * Converts a DIGIPIN code back to geographic coordinates according to the official India Post specification
 *
 * @param digipin - The DIGIPIN code to convert (format: XXX YYY ZZZZ)
 * @returns An object with lat and lng properties, or null if invalid
 */
export const convertDIGIPINToGeoLocation = (
  digipin: string,
  allowPartial: boolean = false
): { lat: number; lng: number } | null => {
  // Clean and validate the DIGIPIN
  const cleanDigipin = cleanAndValidateDigipin(digipin, allowPartial);

  // Return null if validation failed
  if (!cleanDigipin) {
    return null;
  }

  // For partial DIGIPINs, return the center of the bounding square
  // Each character narrows down the bounding box, so we'll process as many as we have
  // and return the center of the resulting area

  // Initialize the bounding box
  let currentMinLng = DIGIPIN_BOUNDS.MIN_LON;
  let currentMaxLng = DIGIPIN_BOUNDS.MAX_LON;
  let currentMinLat = DIGIPIN_BOUNDS.MIN_LAT;
  let currentMaxLat = DIGIPIN_BOUNDS.MAX_LAT;

  // Process each character in the DIGIPIN code
  for (let i = 0; i < cleanDigipin.length; i++) {
    const char = cleanDigipin[i].toUpperCase();
    const coords = REVERSE_DIGIPIN_MAPPING[char];
    if (!coords) {
      console.error(
        `Invalid DIGIPIN character: '${char}' in '${cleanDigipin}'`
      );
      return null;
    }
    const [yIndex, xIndex] = coords;

    // Calculate the width and height of the current level's grid cells
    const lngWidth = (currentMaxLng - currentMinLng) / 4;
    const latHeight = (currentMaxLat - currentMinLat) / 4;

    // Update the bounding box for the next level of subdivision
    currentMinLng += xIndex * lngWidth;
    currentMaxLng = currentMinLng + lngWidth;
    currentMinLat += yIndex * latHeight;
    currentMaxLat = currentMinLat + latHeight;
  }

  // Calculate the center point of the final grid cell
  const lng = (currentMinLng + currentMaxLng) / 2;
  const lat = (currentMinLat + currentMaxLat) / 2;

  return { lat, lng };
};

export const convertDIGIPINToBounds = (digipin: string) => {
  const bounds: { minLng: number; maxLng: number; minLat: number; maxLat: number }[] = [];

  let cleanDigipin = cleanAndValidateDigipin(digipin);
  if (!cleanDigipin) return bounds;

  let currentMinLng = DIGIPIN_BOUNDS.MIN_LON;
  let currentMaxLng = DIGIPIN_BOUNDS.MAX_LON;
  let currentMinLat = DIGIPIN_BOUNDS.MIN_LAT;
  let currentMaxLat = DIGIPIN_BOUNDS.MAX_LAT;
  bounds.push({
    minLng: currentMinLng,
    maxLng: currentMaxLng,
    minLat: currentMinLat,
    maxLat: currentMaxLat
  });

  for (let i = 0; i < cleanDigipin.length; i++) {
    const char = cleanDigipin[i].toUpperCase();
    const coords = REVERSE_DIGIPIN_MAPPING[char];
    if (!coords) {
      console.error(
        `Invalid DIGIPIN character: '${char}' in '${cleanDigipin}'`
      );
      return bounds;
    }
    const [yIndex, xIndex] = coords;

    // Calculate the width and height of the current level's grid cells
    const lngWidth = (currentMaxLng - currentMinLng) / 4;
    const latHeight = (currentMaxLat - currentMinLat) / 4;

    // Update the bounding box for the next level of subdivision
    currentMinLng = currentMinLng + xIndex * lngWidth;
    currentMaxLng = currentMinLng + lngWidth;
    currentMinLat = currentMinLat + yIndex * latHeight;
    currentMaxLat = currentMinLat + latHeight;

    bounds.push({
      minLng: currentMinLng,
      maxLng: currentMaxLng,
      minLat: currentMinLat,
      maxLat: currentMaxLat,
    });
  }

  return bounds;
};