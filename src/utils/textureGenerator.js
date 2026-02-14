import * as THREE from 'three';
import { createNoise4D } from 'simplex-noise';

// Create a noise instance.
// Note: This uses Math.random() by default for the permutation table.
const noise4D = createNoise4D();

/**
 * Generates a high-frequency, seamless noise texture using Simplex noise.
 * Mapping 2D coordinates to a 4D torus ensures perfect tiling.
 *
 * @param {number} width - Texture width (default: 512).
 * @param {number} height - Texture height (default: 512).
 * @param {number} scale - Noise scale factor (default: 2.0). Controls the frequency/detail.
 * @returns {THREE.CanvasTexture} The generated texture.
 */
export function generateNoiseTexture(width = 512, height = 512, scale = 2.0) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  const imageData = ctx.createImageData(width, height);
  const data = imageData.data;

  // We map the 2D texture coordinates to a 4D torus to create a seamless texture.
  // x, y in [0, width], [0, height]
  // u = x / width * 2PI
  // v = y / height * 2PI
  // 4D coords:
  // X = R * cos(u)
  // Y = R * sin(u)
  // Z = R * cos(v)
  // W = R * sin(v)
  //
  // 'scale' effectively acts as the radius R. Larger R = traversing more noise space = higher frequency.

  const twoPi = Math.PI * 2;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const u = (x / width) * twoPi;
      const v = (y / height) * twoPi;

      const nx = Math.cos(u) * scale;
      const ny = Math.sin(u) * scale;
      const nz = Math.cos(v) * scale;
      const nw = Math.sin(v) * scale;

      // Noise value is typically -1 to 1
      const n = noise4D(nx, ny, nz, nw);

      // Map to 0-255
      // Add some contrast?
      // n is approx -1 to 1.
      const val = Math.floor((n * 0.5 + 0.5) * 255);

      const index = (y * width + x) * 4;
      data[index] = val;     // R
      data[index + 1] = val; // G
      data[index + 2] = val; // B
      data[index + 3] = 255; // Alpha
    }
  }

  ctx.putImageData(imageData, 0, 0);

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;

  // Update: Use LinearFilter for smoother results, or Nearest for retro.
  // Default is LinearFilter which is good.

  return texture;
}
