import { test, expect } from '@playwright/test';

async function waitForMapLoad(page) {
  // Wait for the map container to be visible
  const mapContainer = page.locator('.mapboxgl-map');
  await expect(mapContainer).toBeVisible();
  
  // Wait for the map to be fully loaded
  await page.waitForFunction(() => {
    // @ts-ignore - Accessing map instance from window
    return window.Map && window.Map.loaded();
  }, null, { timeout: 30000 });
  
  // Small delay to ensure any map animations complete
  await page.waitForTimeout(500);
}

test.describe('DIGIPINner Application', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await waitForMapLoad(page);
  });

  test('should load the application with map', async ({ page }) => {
    // Verify the page title
    await expect(page).toHaveTitle(/DIGIPINner/);
    
    // Check if the search input is present
    const searchInput = page.getByPlaceholder('Search for a location');
    await expect(searchInput).toBeVisible();
  });

  test('should allow zooming the map', async ({ page }) => {
    // Get initial zoom level
    const initialZoom = await page.evaluate(() => {
      // @ts-ignore - Accessing map instance from window
      const map = window.map;
      return map.getZoom();
    });

    // Zoom in using the zoom controls
    await page.click('.mapboxgl-ctrl-zoom-in');
    
    // Wait for zoom animation
    await page.waitForTimeout(500);

    // Get new zoom level
    const newZoom = await page.evaluate(() => {
      // @ts-ignore - Accessing map instance from window
      const map = window.map;
      return map.getZoom();
    });

    // Verify the zoom level has increased
    expect(newZoom).toBeGreaterThan(initialZoom);
  });

  test('should display marker when clicking on the map', async ({ page }) => {
    // Click on the map at a specific position
    await page.mouse.click(400, 300);
    
    // Wait for the marker to appear
    const marker = page.locator('.mapboxgl-marker');
    await expect(marker).toBeVisible();
  });
});
