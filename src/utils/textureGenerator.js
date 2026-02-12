import * as THREE from 'three';

/**
 * Generates a high-frequency noise texture using an HTML5 Canvas.
 * This texture is useful for adding organic detail to materials like terrain and paths,
 * breaking up the "plastic" look of standard materials.
 *
 * @param {number} width - Texture width (default: 512).
 * @param {number} height - Texture height (default: 512).
 * @param {number} scale - Noise scale factor (default: 1.0).
 * @returns {THREE.CanvasTexture} The generated texture.
 */
export function generateNoiseTexture(width = 512, height = 512, scale = 1.0) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  const imageData = ctx.createImageData(width, height);
  const data = imageData.data;

  for (let i = 0; i < data.length; i += 4) {
    // Generate simple white noise
    // Range: 0-255
    const val = Math.floor(Math.random() * 255);

    // Apply some slight variation based on position to avoid perfectly uniform static
    // (This is a very simple "perlin-like" effect but much cheaper)
    // Actually, simple white noise is often better for "grit".
    // Let's mix white noise with a bit of coherent structure if needed.
    // For now, pure white noise is fine for bump/roughness at high frequency.

    data[i] = val;     // R
    data[i + 1] = val; // G
    data[i + 2] = val; // B
    data[i + 3] = 255; // Alpha
  }

  ctx.putImageData(imageData, 0, 0);

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  // texture.minFilter = THREE.NearestFilter; // Sharp pixels
  // texture.magFilter = THREE.NearestFilter;

  return texture;
}
