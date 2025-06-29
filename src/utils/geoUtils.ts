/**
 * Utility functions for geographic operations
 */
import { DIGIPIN_GRID } from '../lib/constants';

/**
 * Converts geographic coordinates to a DIGIPIN format according to the official India Post specification
 * DIGIPIN is a 10-digit alphanumeric code that represents a 4m x 4m grid cell in India
 * 
 * @param lat - Latitude in decimal degrees (EPSG:4326/WGS84)
 * @param lng - Longitude in decimal degrees (EPSG:4326/WGS84)
 * @returns A string representing the DIGIPIN code
 */
export const convertGeoLocationToDIGIPIN = (lat: number, lng: number): string => {
  // Check if the coordinates are within India's bounding box
  if (lng < DIGIPIN_GRID.BOUNDS.MIN_LON || lng > DIGIPIN_GRID.BOUNDS.MAX_LON || lat < DIGIPIN_GRID.BOUNDS.MIN_LAT || lat > DIGIPIN_GRID.BOUNDS.MAX_LAT) {
    return 'OUT-OF-BOUNDS'; // Location is outside India's bounding box
  }
  
  // Handle edge cases for coordinates on grid lines as per section 3.4 of the specification
  // For simplicity, we'll add a tiny offset to avoid exact grid line matches
  // In a production system, this would need more precise handling
  const epsilon = 0.0000001;
  if (Math.abs(lng - Math.floor((lng - DIGIPIN_GRID.BOUNDS.MIN_LON) / ((DIGIPIN_GRID.BOUNDS.MAX_LON - DIGIPIN_GRID.BOUNDS.MIN_LON) / 4)) * ((DIGIPIN_GRID.BOUNDS.MAX_LON - DIGIPIN_GRID.BOUNDS.MIN_LON) / 4) + DIGIPIN_GRID.BOUNDS.MIN_LON) < epsilon) {
    lng += epsilon; // Move slightly east if on a vertical grid line
  }
  if (Math.abs(lat - Math.floor((lat - DIGIPIN_GRID.BOUNDS.MIN_LAT) / ((DIGIPIN_GRID.BOUNDS.MAX_LAT - DIGIPIN_GRID.BOUNDS.MIN_LAT) / 4)) * ((DIGIPIN_GRID.BOUNDS.MAX_LAT - DIGIPIN_GRID.BOUNDS.MIN_LAT) / 4) + DIGIPIN_GRID.BOUNDS.MIN_LAT) < epsilon) {
    lat += epsilon; // Move slightly north if on a horizontal grid line
  }
  
  // Special case for the top-most and right-most grid lines
  if (Math.abs(lat - DIGIPIN_GRID.BOUNDS.MAX_LAT) < epsilon) {
    lat -= 2 * epsilon; // Move slightly south if on the top-most grid line
  }
  if (Math.abs(lng - DIGIPIN_GRID.BOUNDS.MAX_LON) < epsilon) {
    lng -= 2 * epsilon; // Move slightly west if on the right-most grid line
  }
  
  // The symbols used in DIGIPIN (in order)
  const symbols = ['2', '3', '4', '5', '6', '7', '8', '9', 'C', 'F', 'J', 'K', 'L', 'M', 'P', 'T'];
  
  // Initialize the DIGIPIN code
  let digipin = '';
  
  // Current bounding box for recursive subdivision
  let currentMinLng = DIGIPIN_GRID.BOUNDS.MIN_LON;
  let currentMaxLng = DIGIPIN_GRID.BOUNDS.MAX_LON;
  let currentMinLat = DIGIPIN_GRID.BOUNDS.MIN_LAT;
  let currentMaxLat = DIGIPIN_GRID.BOUNDS.MAX_LAT;
  
  // Generate the 10-digit DIGIPIN code through recursive subdivision
  for (let level = 0; level < 10; level++) {
    // Calculate the width and height of the current level's grid cells
    const lngWidth = (currentMaxLng - currentMinLng) / 4;
    const latHeight = (currentMaxLat - currentMinLat) / 4;
    
    // Determine which grid cell the point falls into (0-3 for both x and y)
    const xIndex = Math.min(3, Math.floor((lng - currentMinLng) / lngWidth));
    const yIndex = Math.min(3, Math.floor((lat - currentMinLat) / latHeight));
    
    // Convert the x,y grid position to the symbol index (0-15) using the spiral pattern
    // The spiral pattern is anticlockwise from the center, as per the specification
    // This mapping is based on Figure 2 and 3 in the technical document
    /*
                
            F < C < 9 < 8
            v           ^
            J   3 < 2   7
            v   v       ^
            K   4 > 5 > 6
            v          
            L > M > P > T

    */
    // Map the x,y coordinates to the symbol index according to the spiral pattern
    // This mapping is derived from the ASCII diagram in the code comments
    // Following the spiral: F < C < 9 < 8 < 7 < 6 < 5 < 4 < 3 < 2 < J < K < L < M < P < T
    let symbolIndex = 0;
    
    // Create a 4x4 grid mapping based on the spiral pattern from constants
    // The grid positions correspond to the following symbols:
    // DIGIPIN_GRID.MAPPING = [
    //  ["T", "P", "M", "L"],
    //  ["6", "5", "4", "K"],
    //  ["7", "2", "3", "J"],
    //  ["8", "9", "C", "F"]
    // ]
    
    // Get the symbol from the DIGIPIN_GRID.MAPPING using the x,y coordinates
    const symbol = DIGIPIN_GRID.MAPPING[3 - yIndex][xIndex];
    console.log("xIndex", xIndex);
    console.log("yIndex", yIndex);
    console.log("symbol", symbol);

    // Add the symbol to the DIGIPIN code
    digipin += symbol;
    
    // Format with a space after the 3rd and 6th characters for readability
    if (level === 2 || level === 5) {
      digipin += ' ';
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
export const convertDIGIPINToGeoLocation = (digipin: string): { lat: number, lng: number } | null => {
  // Clean up the input by removing spaces
  const cleanDigipin = digipin.replace(/\s+/g, '');
  
  // Validate the DIGIPIN format - should be 10 characters
  if (cleanDigipin.length !== 10) {
    return null;
  }
  
  // Validate that all characters are from the allowed set
  const validChars = new Set(['2', '3', '4', '5', '6', '7', '8', '9', 'C', 'F', 'J', 'K', 'L', 'M', 'P', 'T']);
  for (const char of cleanDigipin) {
    if (!validChars.has(char.toUpperCase())) {
      return null;
    }
  }
  
  // The symbols used in DIGIPIN (in order)
  const symbols = ['2', '3', '4', '5', '6', '7', '8', '9', 'C', 'F', 'J', 'K', 'L', 'M', 'P', 'T'];
  
  // Initialize the bounding box
  let currentMinLng = DIGIPIN_GRID.BOUNDS.MIN_LON;
  let currentMaxLng = DIGIPIN_GRID.BOUNDS.MAX_LON;
  let currentMinLat = DIGIPIN_GRID.BOUNDS.MIN_LAT;
  let currentMaxLat = DIGIPIN_GRID.BOUNDS.MAX_LAT;
  
  // Process each character in the DIGIPIN code
  for (let i = 0; i < cleanDigipin.length; i++) {
    const char = cleanDigipin[i].toUpperCase();
    const symbolIndex = symbols.indexOf(char);
    
    if (symbolIndex === -1) {
      return null; // Invalid character
    }
    
    // Calculate the width and height of the current level's grid cells
    const lngWidth = (currentMaxLng - currentMinLng) / 4;
    const latHeight = (currentMaxLat - currentMinLat) / 4;
    
    // Determine the x,y indices from the symbol index using the spiral pattern
    // This is the reverse mapping of the encoding process
    let xIndex = 0;
    let yIndex = 0;
    
    // Map the symbol index back to x,y coordinates based on the spiral pattern from constants
    // The grid positions correspond to the following symbols in DIGIPIN_GRID.MAPPING
    
    // Get the actual character from the DIGIPIN code
    const symbol = char;
    
    // Find the position of the symbol in the DIGIPIN_GRID.MAPPING
    let found = false;
    for (let y = 0; y < 4; y++) {
      for (let x = 0; x < 4; x++) {
        if (DIGIPIN_GRID.MAPPING[y][x] === symbol) {
          xIndex = x;
          yIndex = 3 - y; // Convert from array index to grid index (y-axis is inverted)
          found = true;
          break;
        }
      }
      if (found) break;
    }
    
    // Return null if the symbol wasn't found in the mapping
    if (!found) return null;
    
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
