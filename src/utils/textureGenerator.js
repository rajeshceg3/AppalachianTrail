import * as THREE from 'three';
import { createNoise4D } from 'simplex-noise';

// Create a noise instance.
const noise4D = createNoise4D();

/**
 * Fractal Brownian Motion (FBM) using 4D noise for seamless tiling.
 */
function fbm4D(nx, ny, nz, nw, octaves = 4, persistence = 0.5, lacunarity = 2.0) {
    let total = 0;
    let frequency = 1.0;
    let amplitude = 1.0;
    let maxValue = 0;  // Used for normalizing result to 0.0 - 1.0

    for(let i=0; i<octaves; i++) {
        total += noise4D(nx * frequency, ny * frequency, nz * frequency, nw * frequency) * amplitude;
        maxValue += amplitude;
        amplitude *= persistence;
        frequency *= lacunarity;
    }

    // Normalize to -1..1 range first (approx)
    return total / maxValue;
}

/**
 * Generates a high-frequency, seamless noise texture using FBM Simplex noise.
 * Mapping 2D coordinates to a 4D torus ensures perfect tiling.
 *
 * @param {number} width - Texture width.
 * @param {number} height - Texture height.
 * @param {number} scale - Noise scale factor.
 * @param {number} octaves - Number of FBM octaves.
 * @returns {THREE.CanvasTexture} The generated texture.
 */
export function generateHeightMap(width = 512, height = 512, scale = 8.0, octaves = 6) { // Increased scale and octaves for finer grain
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  const imageData = ctx.createImageData(width, height);
  const data = imageData.data;
  const twoPi = Math.PI * 2;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const u = (x / width) * twoPi;
      const v = (y / height) * twoPi;

      // Map to 4D torus
      const nx = Math.cos(u) * scale;
      const ny = Math.sin(u) * scale;
      const nz = Math.cos(v) * scale;
      const nw = Math.sin(v) * scale;

      // FBM Noise value (-1 to 1)
      const n = fbm4D(nx, ny, nz, nw, octaves);

      // Map to 0-255
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

  // Store raw data in userdata for normal map generation if needed later
  texture.userData = { imageData };

  return texture;
}

/**
 * Generates a seamless Normal Map from the same noise function used for height.
 *
 * @param {number} width - Texture width.
 * @param {number} height - Texture height.
 * @param {number} scale - Noise scale factor.
 * @param {number} octaves - Number of FBM octaves.
 * @param {number} strength - Strength of the normal effect (bumpiness).
 * @returns {THREE.CanvasTexture} The generated normal map.
 */
export function generateNormalMap(width = 512, height = 512, scale = 8.0, octaves = 6, strength = 2.0) { // Increased scale and octaves
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  const imageData = ctx.createImageData(width, height);
  const data = imageData.data;
  const twoPi = Math.PI * 2;

  // Helper to sample height at (x, y)
  // We re-compute noise here. Optimization: could reuse heightmap buffer if passed.
  // But computing per pixel is fine for initialization.
  const sampleHeight = (x, y) => {
      const u = (x / width) * twoPi;
      const v = (y / height) * twoPi;
      const nx = Math.cos(u) * scale;
      const ny = Math.sin(u) * scale;
      const nz = Math.cos(v) * scale;
      const nw = Math.sin(v) * scale;
      return fbm4D(nx, ny, nz, nw, octaves);
  };

  const eps = 1.0; // 1 pixel step

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {

      // Sobel-like filter or simple finite difference
      // Sample neighbors (wrapping)
      const xL = (x - 1 + width) % width;
      const xR = (x + 1) % width;
      const yD = (y - 1 + height) % height;
      const yU = (y + 1) % height;

      const hL = sampleHeight(xL, y);
      const hR = sampleHeight(xR, y);
      const hD = sampleHeight(x, yD);
      const hU = sampleHeight(x, yU);

      // dx, dy
      const dX = (hR - hL) * strength; // Scale strength
      const dY = (hU - hD) * strength;

      // Normal vector (dX, dY, 1.0) normalized
      // Tangent space normal map:
      // Z is up (blue). X is right (Red). Y is down/up (Green).
      // Vector N = (-dX, -dY, 1.0).

      let nx = -dX;
      let ny = -dY;
      let nz = 1.0;

      // Normalize
      const len = Math.sqrt(nx*nx + ny*ny + nz*nz);
      nx /= len;
      ny /= len;
      nz /= len;

      // Map -1..1 to 0..255
      const r = Math.floor((nx * 0.5 + 0.5) * 255);
      const g = Math.floor((ny * 0.5 + 0.5) * 255);
      const b = Math.floor((nz * 0.5 + 0.5) * 255);

      const index = (y * width + x) * 4;
      data[index] = r;
      data[index + 1] = g;
      data[index + 2] = b;
      data[index + 3] = 255;
    }
  }

  ctx.putImageData(imageData, 0, 0);

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;

  return texture;
}

/**
 * Generates an alpha map for the path with ragged, organic edges using noise.
 *
 * @param {number} width - Texture width.
 * @param {number} height - Texture height.
 * @returns {THREE.CanvasTexture} The generated alpha map.
 */
export function generateAlphaMap(width = 512, height = 512) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  const imageData = ctx.createImageData(width, height);
  const data = imageData.data;

  // Use a noise scale that creates nice ragged edges
  // We want the noise to repeat vertically for the path
  const noiseScaleY = 5.0; // Scale along path
  const noiseScaleX = 2.0; // Scale across width

  const twoPi = Math.PI * 2;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      // Normalized coordinates
      const u = x / width;
      const v = y / height;

      // Calculate distance from center (0.0 at center, 0.5 at edges)
      const dist = Math.abs(u - 0.5);

      // Generate noise
      // We map 'v' to 4D torus for seamless vertical wrapping
      // We map 'u' linearly (or maybe standard noise)

      const angle = v * twoPi;
      const ny = Math.cos(angle) * noiseScaleY;
      const nw = Math.sin(angle) * noiseScaleY;
      const nx = u * noiseScaleX;

      // 3D noise (x, y, w) using 4D function
      const n = fbm4D(nx, ny, 0, nw, 3, 0.5, 2.0); // range approx -1 to 1

      // Distort the threshold
      // Base threshold is 0.3 (leaving 0.2 margin on each side)
      // Add noise to threshold
      const threshold = 0.35 + n * 0.1;

      // Soft blend
      // Calculate alpha based on distance vs threshold
      // 1.0 if dist < threshold, fading to 0.0

      const edgeWidth = 0.1; // Width of the fade
      let alpha = 1.0 - THREE.MathUtils.smoothstep(threshold - edgeWidth, threshold + edgeWidth, dist);

      const val = Math.floor(alpha * 255);

      const index = (y * width + x) * 4;
      data[index] = val;     // R
      data[index + 1] = val; // G
      data[index + 2] = val; // B
      data[index + 3] = val; // Alpha (use val for everything for safety, though only Alpha matters or R in alphaMap)
    }
  }

  ctx.putImageData(imageData, 0, 0);

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.ClampToEdgeWrapping; // Don't wrap width
  texture.wrapT = THREE.RepeatWrapping;      // Wrap length

  // Ensure it repeats along the path
  texture.repeat.set(1, 50); // Repeat 50 times along path for consistent detail

  return texture;
}

// Backward compatibility
export const generateNoiseTexture = generateHeightMap;
