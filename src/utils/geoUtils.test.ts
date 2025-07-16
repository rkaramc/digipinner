import { describe, it, expect, beforeEach } from 'vitest';
import {
  DIGIPIN_BOUNDS,
  convertGeoLocationToDIGIPIN,
  convertDIGIPINToGeoLocation,
  isValidDIGIPIN,
  cleanAndValidateDigipin,
  EPSILON
} from './geoUtils';

describe('DIGIPIN_BOUNDS', () => {
  describe('isValidCoordinate', () => {
    it('should return true for coordinates within bounds', () => {
      // Test center of the bounds
      expect(DIGIPIN_BOUNDS.isValidCoordinate(20.5, 80.5)).toBe(true);
      // Test edge cases
      expect(DIGIPIN_BOUNDS.isValidCoordinate(2.5, 63.5)).toBe(true);  // SW corner
      expect(DIGIPIN_BOUNDS.isValidCoordinate(38.5, 99.5)).toBe(true);  // NE corner
    });

    it('should return false for coordinates outside bounds', () => {
      // Test outside each boundary
      expect(DIGIPIN_BOUNDS.isValidCoordinate(1.0, 80.5)).toBe(false);  // Too far south
      expect(DIGIPIN_BOUNDS.isValidCoordinate(40.0, 80.5)).toBe(false); // Too far north
      expect(DIGIPIN_BOUNDS.isValidCoordinate(20.5, 60.0)).toBe(false); // Too far west
      expect(DIGIPIN_BOUNDS.isValidCoordinate(20.5, 100.0)).toBe(false); // Too far east
    });
  });

  describe('avoidGridLines', () => {
    it('should not adjust coordinates away from grid lines', () => {
      // Test point not on any grid line
      const { lat, lng } = DIGIPIN_BOUNDS.avoidGridLines(20.5, 80.5);
      expect(lat).toBeCloseTo(20.5);
      expect(lng).toBeCloseTo(80.5);
    });

    it('should adjust coordinates on horizontal grid lines', () => {
      // Create a point on a horizontal grid line
      const gridLat = Math.floor(18.0 / 9) * 9 + 2.5;
      const { lat } = DIGIPIN_BOUNDS.avoidGridLines(gridLat, 80.5);
      expect(lat).not.toBe(gridLat);
      expect(lat).toBeCloseTo(gridLat + EPSILON);
    });

    it('should adjust coordinates on vertical grid lines', () => {
      // Create a point on a vertical grid line
      const gridLng = Math.floor(18.0 / 9) * 9 + 63.5;
      const { lng } = DIGIPIN_BOUNDS.avoidGridLines(20.5, gridLng);
      expect(lng).not.toBe(gridLng);
      expect(lng).toBeCloseTo(gridLng + EPSILON);
    });

    it('should handle points on both grid lines', () => {
      const gridLat = Math.floor(18.0 / 9) * 9 + 2.5;
      const gridLng = Math.floor(18.0 / 9) * 9 + 63.5;
      const { lat, lng } = DIGIPIN_BOUNDS.avoidGridLines(gridLat, gridLng);
      expect(lat).not.toBe(gridLat);
      expect(lng).not.toBe(gridLng);
      expect(lat).toBeCloseTo(gridLat + EPSILON);
      expect(lng).toBeCloseTo(gridLng + EPSILON);
    });

    it('should handle points on the maximum boundary', () => {
      const { lat, lng } = DIGIPIN_BOUNDS.avoidGridLines(38.5, 99.5);
      expect(lat).toBeLessThan(38.5);
      expect(lng).toBeLessThan(99.5);
    });
  });
});

describe('DIGIPIN Conversion', () => {
  // Test known coordinates to DIGIPIN conversions
  const testCases = [
    {
      name: 'Center of India',
      lat: 20.5,
      lng: 81.5,
      expectedPrefix: '2' // First character should be 'C' for center
    },
    {
      name: 'North-West corner',
      lat: 38.4,
      lng: 63.6,
      expectedPrefix: 'F' // Should be in the bottom-left cell
    },
    {
      name: 'South-East corner',
      lat: 2.6,
      lng: 99.4,
      expectedPrefix: 'T' // Should be in the top-right cell
    }
  ];

  testCases.forEach(({ name, lat, lng, expectedPrefix }) => {
    it(`should convert coordinates to DIGIPIN for ${name}`, () => {
      const digipin = convertGeoLocationToDIGIPIN(lat, lng);
      expect(digipin).toBeDefined();
      expect(digipin).not.toBe('OUT-OF-BOUNDS');
      expect(digipin[0]).toBe(expectedPrefix);
      
      // Test round-trip conversion
      const result = convertDIGIPINToGeoLocation(digipin);
      expect(result).toBeDefined();
      if (result) {
        // Allow for small floating point differences
        expect(result.lat).toBeCloseTo(lat, 4);
        expect(result.lng).toBeCloseTo(lng, 4);
      }
    });
  });

  it('should return OUT-OF-BOUNDS for coordinates outside India', () => {
    // Test with coordinates outside India
    expect(convertGeoLocationToDIGIPIN(1.0, 80.5)).toBe('OUT-OF-BOUNDS'); // Too far south
    expect(convertGeoLocationToDIGIPIN(40.0, 80.5)).toBe('OUT-OF-BOUNDS'); // Too far north
    expect(convertGeoLocationToDIGIPIN(20.5, 60.0)).toBe('OUT-OF-BOUNDS'); // Too far west
    expect(convertGeoLocationToDIGIPIN(20.5, 100.0)).toBe('OUT-OF-BOUNDS'); // Too far east
  });
});

describe('DIGIPIN Validation', () => {
  it('should validate correct DIGIPIN formats', () => {
    // Test with valid DIGIPINs (format: XXX YYY ZZZZ)
    expect(isValidDIGIPIN('C3M 4P9 7F2L')).toBe(true);
    expect(isValidDIGIPIN('L9K 2J8 2P4T')).toBe(true);
    expect(isValidDIGIPIN('T1F 5M6 9C8P')).toBe(false); // Invalid DIGIPIN contains invalid character '1'
    
    // Test with valid partial DIGIPINs
    expect(isValidDIGIPIN('C3M', true)).toBe(true);
    expect(isValidDIGIPIN('C3M 4P9', true)).toBe(true);
    expect(isValidDIGIPIN('C3M 4P9 7F', true)).toBe(true);
  });

  it('should reject invalid DIGIPIN formats', () => {
    // Test with invalid characters
    expect(isValidDIGIPIN('C3M 4P9 7F2!')).toBe(false); // Contains special character
    expect(isValidDIGIPIN('C3M 4P9 7F2 ')).toBe(false); // Ends with space
    expect(isValidDIGIPIN(' C3M 4P9 7F2L')).toBe(true); // Starts with space
    
    // Test with incorrect length
    expect(isValidDIGIPIN('C3M4P97F2L')).toBe(true); // No spaces
    expect(isValidDIGIPIN('C3M 4P9 7F2L ')).toBe(true); // Extra space at end
    expect(isValidDIGIPIN('C3M 4P9 7F2L1')).toBe(false); // Too long
    expect(isValidDIGIPIN('C3M 4P9 7F2')).toBe(false); // Too short
  });

  it('should clean and validate DIGIPINs', () => {
    // Test with valid but messy DIGIPINs
    expect(cleanAndValidateDigipin(' c3m 4p9 7f2l ')).toBe('C3M4P97F2L');
    expect(cleanAndValidateDigipin('c3m-4p9-7f2l', false, '-')).toBe('C3M4P97F2L');
    
    // Test with invalid DIGIPINs
    expect(cleanAndValidateDigipin('C3M 4P9 7F2!')).toBeNull();
    expect(cleanAndValidateDigipin('C3M 4P9 7F2L1')).toBeNull();
  });
});

describe('Round-trip Conversion', () => {
  it('should convert DIGIPIN back to original coordinates', () => {
    const testPoints = [
      { lat: 20.5, lng: 81.5 },  // Center of India
      { lat: 28.6, lng: 77.2 },  // Near Delhi
      { lat: 19.0, lng: 72.8 },  // Near Mumbai
      { lat: 13.1, lng: 80.3 },  // Near Chennai
    ];

    testPoints.forEach(({ lat, lng }) => {
      const digipin = convertGeoLocationToDIGIPIN(lat, lng);
      expect(digipin).not.toBe('OUT-OF-BOUNDS');
      
      const result = convertDIGIPINToGeoLocation(digipin);
      expect(result).toBeDefined();
      
      if (result) {
        // The converted point should be very close to the original
        expect(result.lat).toBeCloseTo(lat, 4);
        expect(result.lng).toBeCloseTo(lng, 4);
      }
    });
  });
});