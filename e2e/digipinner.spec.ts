qimport { test, expect } from '@playwright/test';
import { convertGeoLocationToDIGIPIN, convertDIGIPINToGeoLocation } from '../dist/utils/geoUtils';
import { Map } from 'mapbox-gl';

async function waitForMapLoad(page) {
  // Wait for the map container to be visible
  const mapContainer = page.locator('.mapboxgl-map');
  await expect(mapContainer).toBeVisible();
  
  // Wait for the loading indicator to disappear
  // This indicates that the map has finished loading
  const loadingIndicator = page.locator('.animate-spin');
  await expect(loadingIndicator).toBeVisible();
  await expect(loadingIndicator).toBeHidden({ timeout: 30000 });
  
  // Small delay to ensure any map animations complete
  await page.waitForTimeout(500);
}

const DIGIPINregex = /DIGIPIN:\s+([\w\s]+)/;
const LongitudeRegex = /Longitude:\s+([\d.-]+)/;
const LatitudeRegex = /Latitude:\s+([\d.-]+)/;
const ZoomLevelRegex = /Zoom Level:\s+([\d.]+)/;

test.describe('DIGIPINner Application', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await waitForMapLoad(page);
  });

  test('should load the application with map', async ({ page }) => {
    // Verify the page title
    await expect(page).toHaveTitle(/DIGIPINner/);
    
    // Check if the search input is present
    // const searchInput = page.getByPlaceholder('Search for a location');
    // await expect(searchInput).toBeVisible();
  });

  test('should allow zooming the map', async ({ page }) => {
    // Get initial zoom level
    const initialPositionText = await page.locator('[data-testid="position-details"]').textContent();
    const initialZoomText = initialPositionText?.match(ZoomLevelRegex)?.[1];
    const initialZoom = initialZoomText ? parseFloat(initialZoomText) : 0;
    
    // Zoom in using the zoom controls
    await page.click('.mapboxgl-ctrl-zoom-in');
    
    // Wait for zoom animation
    await page.waitForTimeout(500);

    // Get new zoom level
    const newZoomText = await page.locator('[data-testid="position-details"]').textContent();
    const newZoomLevel = newZoomText?.match(ZoomLevelRegex)?.[1];
    const newZoom = newZoomLevel ? parseFloat(newZoomLevel) : 0;

    // Verify the zoom level has increased
    expect(newZoom).toBeGreaterThan(initialZoom);
  });

  test('should display marker when clicking on the map', async ({ page }) => {
    // Click on the map at a specific position
    await page.mouse.click(400, 300);
    
    // Wait for the marker to appear
    const marker = page.locator('.mapboxgl-marker');
    await expect(marker).toBeVisible();
    
    // Wait for marker position display to appear
    const positionDisplay = page.locator('[data-testid="marker-position-display"]');
    await expect(positionDisplay).toBeVisible({ timeout: 5000 });
  });

  test('should remove marker when clicking on it', async ({ page }) => {
    // Click on the map to place a marker
    await page.mouse.click(400, 300);
    
    // Wait for the marker to appear
    const marker = page.locator('.mapboxgl-marker');
    await expect(marker).toBeVisible();
    
    // Click on the marker to remove it
    await marker.click();
    
    // Verify the marker is removed
    await expect(marker).not.toBeVisible({ timeout: 5000 });
    
    // Verify the position display is reset
    const positionDetails = page.locator('[data-testid="position-details"]');
    const positionText = await positionDetails.textContent();
    expect(positionText).toContain('Marker not placed');
  });

  test('should change cursor when hovering over marker', async ({ page }) => {
    // Click on the map to place a marker
    await page.mouse.click(400, 300);
    
    // Wait for the marker to appear
    const marker = page.locator('.mapboxgl-marker');
    await expect(marker).toBeVisible();
    
    // Hover over the marker
    await marker.hover();
    
    // Check the cursor style (this is tricky to test directly in Playwright)
    // We'll verify the cursor style was set by checking the element's style attribute
    const cursorStyle = await marker.evaluate(element => {
      return window.getComputedStyle(element).cursor;
    });
    
    // Verify the cursor is not the default
    expect(cursorStyle).not.toBe('auto');
    expect(cursorStyle).not.toBe('default');
    
    // The exact value will be a complex data URL for our custom cursor
    // So we'll just verify it contains 'url(' which indicates a custom cursor
    expect(cursorStyle).toContain('url(');
  });

  test('should display DIGIPIN when marker is placed', async ({ page }) => {
    // Click on the map at a specific position
    await page.mouse.click(400, 300);
    
    // Wait for marker position display to appear
    const positionDisplay = page.locator('[data-testid="marker-position-display"]');
    await expect(positionDisplay).toBeVisible({ timeout: 5000 });
    
    // Verify that the marker position display shows coordinates and DIGIPIN
    const positionText = await positionDisplay.locator('[data-testid="position-details"]').textContent();
    expect(positionText).toContain('Longitude:');
    expect(positionText).toContain('Latitude:');
    expect(positionText).toContain('DIGIPIN:');
    
    // Verify DIGIPIN format (should be 10 characters with spaces after 3rd and 6th)
    const digipin = positionText?.match(DIGIPINregex)?.[1];
    expect(digipin).toBeDefined();
    expect(digipin?.replace(/\s+/g, '').length).toBe(10); // 10 characters without spaces
    
    // Should have spaces after 3rd and 6th characters
    const digipinParts = digipin?.split(' ');
    expect(digipinParts?.length).toBe(3);
    expect(digipinParts?.[0].length).toBe(3);
    expect(digipinParts?.[1].length).toBe(3);
    expect(digipinParts?.[2].length).toBe(4);
  });

  test('should update DIGIPIN when marker position changes', async ({ page }) => {
    // Click on the map at first position
    await page.mouse.click(400, 300);
    await page.waitForSelector('[data-testid="marker-position-display"]', { timeout: 5000 });
    const positionDisplay = page.locator('[data-testid="marker-position-display"]');
    await expect(positionDisplay).toBeVisible({ timeout: 5000 });
    
    // Get the first DIGIPIN
    const firstPositionText = await page.locator('[data-testid="position-details"]').textContent();
    const firstDigipin = firstPositionText?.match(DIGIPINregex)?.[1];
    
    // Click on a different position
    await page.mouse.click(500, 200);
    await page.waitForTimeout(500); // Wait for position update
    
    // Get the second DIGIPIN
    const secondPositionText = await page.locator('[data-testid="position-details"]').textContent();
    const secondDigipin = secondPositionText?.match(DIGIPINregex)?.[1];
    
    // Verify that the DIGIPIN changed
    expect(firstDigipin).not.toBe(secondDigipin);
  });

  test('should display DIGIPIN with valid characters', async ({ page }) => {
    // Click on the map
    await page.mouse.click(400, 300);
    await page.waitForSelector('[data-testid="marker-position-display"]', { timeout: 5000 });
    const positionDisplay = page.locator('[data-testid="marker-position-display"]');
    await expect(positionDisplay).toBeVisible({ timeout: 5000 });
    
    // Get the DIGIPIN
    const positionText = await page.locator('[data-testid="position-details"]').textContent();
    const digipin = positionText?.match(DIGIPINregex)?.[1];
    
    // Verify DIGIPIN format
    expect(digipin).toBeDefined();
    if (digipin) {
      // Should only contain valid DIGIPIN characters: 2-9, C, F, J, K, L, M, P, T
      const validChars = ['2', '3', '4', '5', '6', '7', '8', '9', 'C', 'F', 'J', 'K', 'L', 'M', 'P', 'T'];
      const digipinChars = digipin.replace(/\s+/g, '').split('');
      digipinChars.forEach(char => {
        expect(validChars).toContain(char);
      });
    }
  });

  test('should have consistent encoding and decoding', async ({ page }) => {
    // This test verifies that encoding and decoding are consistent
    // by getting coordinates from the UI, getting the DIGIPIN,
    // then decoding the DIGIPIN back to coordinates and comparing
    
    // Click on the map
    await page.mouse.click(400, 300);
    await page.waitForSelector('[data-testid="marker-position-display"]', { timeout: 5000 });
    const positionDisplay = page.locator('[data-testid="marker-position-display"]');
    await expect(positionDisplay).toBeVisible({ timeout: 5000 });
    
    // Get the position text
    const positionText = await page.locator('[data-testid="position-details"]').textContent();
    
    // Extract coordinates and DIGIPIN
    const lngMatch = positionText?.match(LongitudeRegex);
    const latMatch = positionText?.match(LatitudeRegex);
    const digipinMatch = positionText?.match(DIGIPINregex);
    
    // Verify we have all the data
    expect(lngMatch).toBeDefined();
    expect(latMatch).toBeDefined();
    expect(digipinMatch).toBeDefined();
    
    if (lngMatch && latMatch && digipinMatch) {
      const lng = parseFloat(lngMatch[1]);
      const lat = parseFloat(latMatch[1]);
      const digipin = digipinMatch[1].replace(/\s+/g, '');
      
      // Verify encoding works correctly
      const encodedDigipin = convertGeoLocationToDIGIPIN(lat, lng).replace(/\s+/g, '');
      expect(encodedDigipin).toBe(digipin);
      
      // Verify decoding works correctly
      const decodedCoords = convertDIGIPINToGeoLocation(digipin);
      expect(decodedCoords).not.toBeNull();
      
      if (decodedCoords) {
        // Coordinates should be close (within a small margin of error due to precision)
        expect(Math.abs(decodedCoords.lng - lng)).toBeLessThan(0.001);
        expect(Math.abs(decodedCoords.lat - lat)).toBeLessThan(0.001);
      }
    }
  });
});
