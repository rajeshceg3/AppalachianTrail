import * as THREE from 'three';
import { createNoise2D } from 'simplex-noise';

// Create a seeded random function for consistent noise
function mulberry32(a) {
    return function() {
      var t = a += 0x6D2B79F5;
      t = Math.imul(t ^ t >>> 15, t | 1);
      t ^= t + Math.imul(t ^ t >>> 7, t | 61);
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    }
}

const seed = 8888; // Different seed than terrain to avoid artifacts aligning perfectly
const random = mulberry32(seed);
const noise2D = createNoise2D(random);

/**
 * Generates a seamless noise texture on a canvas.
 * @param {number} width
 * @param {number} height
 * @returns {THREE.CanvasTexture}
 */
export const generateNoiseTexture = (width = 512, height = 512) => {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');

  const imageData = context.createImageData(width, height);
  const data = imageData.data;

  // Generate noise
  for (let x = 0; x < width; x++) {
    for (let y = 0; y < height; y++) {
      // High frequency noise for "grit"
      // Scale 0.1 gives decent granularity for 512x512
      const scale = 0.1;

      // Add multiple octaves for fractal detail
      let n = 0;
      let amplitude = 1;
      let frequency = scale;
      let maxVal = 0;

      // 3 Octaves
      for(let i=0; i<3; i++) {
          n += noise2D(x * frequency, y * frequency) * amplitude;
          maxVal += amplitude;
          amplitude *= 0.5;
          frequency *= 2.0;
      }

      // Normalize to 0-1
      n = (n / maxVal) * 0.5 + 0.5;

      // Map to grey scale
      // We want a subtle noise, so map 0.3 to 0.7
      const val = Math.floor((0.3 + n * 0.4) * 255);

      const index = (x + y * width) * 4;
      data[index] = val;     // R
      data[index + 1] = val; // G
      data[index + 2] = val; // B
      data[index + 3] = 255; // Alpha
    }
  }

  context.putImageData(imageData, 0, 0);

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  // Increase repeat to tile it across the large terrain
  texture.repeat.set(16, 16);

  return texture;
};
