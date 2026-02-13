import { test, expect } from '@playwright/test';
import path from 'path';

test('debug immersion', async ({ page }) => {
  // Go to the app
  await page.goto('http://localhost:5173');

  // Click "Start Journey"
  await page.click('text=Start Journey');

  // Click "Georgia" on the map
  await page.click('text=Georgia');

  // Wait for the canvas to appear
  await page.waitForSelector('canvas');

  // Wait a bit for scene to load
  await page.waitForTimeout(5000);

  // Debugging: Log Three.js state
  const debugInfo = await page.evaluate(() => {
    try {
      // Access the internal state of React Three Fiber if exposed,
      // or try to find the canvas and get its context (not easy for WebGL internal state).
      // However, we can check if the canvas context exists.
      const canvas = document.querySelector('canvas');
      const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');

      return {
        canvasWidth: canvas.width,
        canvasHeight: canvas.height,
        webglAttributes: gl ? gl.getContextAttributes() : 'No WebGL',
        // We can't easily access the React state from outside without exposing it on window.
        // But we can check for console errors.
      };
    } catch (e) {
      return { error: e.toString() };
    }
  });

  console.log('Debug Info:', debugInfo);

  // Take a screenshot
  await page.screenshot({ path: 'verification/debug_immersion.png' });
});
