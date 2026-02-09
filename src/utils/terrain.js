import { createNoise2D } from 'simplex-noise';

// Simple seeded random function (Mulberry32)
// This ensures that the terrain is generated identically every time,
// preventing mismatches between the ground mesh and object placement.
function mulberry32(a) {
    return function() {
      var t = a += 0x6D2B79F5;
      t = Math.imul(t ^ t >>> 15, t | 1);
      t ^= t + Math.imul(t ^ t >>> 7, t | 61);
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    }
}

// Seed the noise generator for consistency across reloads/imports
const seed = 12345;
const random = mulberry32(seed);
const noise2D = createNoise2D(random);

/**
 * Calculates the X position of the path center for a given Z coordinate.
 * Creates a winding, natural-looking path.
 */
export const getPathX = (z) => {
  // Combine multiple sine waves with non-integer frequencies and noise for organic variation
  // Using prime-ish numbers for frequencies helps avoid repetition
  return (
    Math.sin(z * 0.043) * 6 +
    Math.sin(z * 0.017) * 12 +
    Math.sin(z * 0.009) * 4 +
    noise2D(100, z * 0.005) * 15 // Long-range meandering using noise
  );
};

/**
 * Calculates the terrain height at a given (x, z) coordinate.
 * Uses multiple octaves of simplex noise for organic hills.
 * Flattens the terrain near the path to create a walkable surface.
 */
export const getTerrainHeight = (x, z) => {
  const pathX = getPathX(z);
  const dist = Math.abs(x - pathX);

  // --- Terrain Noise Generation ---

  // Base layer: Large, rolling hills
  // Low frequency, high amplitude
  let y = noise2D(x * 0.015, z * 0.015) * 8.0;

  // Detail layer: Smaller bumps and texture
  // Higher frequency, lower amplitude
  y += noise2D(x * 0.08, z * 0.08) * 2.0;

  // Micro detail layer: Roughness
  y += noise2D(x * 0.3, z * 0.3) * 0.5;

  // Ultra-fine detail for ground texture (pebbles/dirt)
  y += noise2D(x * 1.5, z * 1.5) * 0.1;

  // --- Path Flattening Logic ---

  // Define the width of the flat path area
  // Increased to ensuring the ground is flat under the visual path width (2.0)
  // even with lower terrain mesh resolution.
  // Add some noise to path width to make edges organic
  const widthNoise = noise2D(z * 0.1, 0) * 1.0;
  const pathWidth = 5.0 + widthNoise;

  // Define how quickly the flat area blends back into the hills
  // Vary blend distance slightly for organic feel
  const blendNoise = noise2D(0, z * 0.05) * 2.0;
  const blendDistance = 10.0 + blendNoise;

  // Calculate blend factor (0.0 = on path, 1.0 = fully wild terrain)
  let blend = (dist - pathWidth * 0.5) / blendDistance;
  blend = Math.max(0, Math.min(1, blend));

  // Smoothstep function for organic transition (3x^2 - 2x^3)
  blend = blend * blend * (3 - 2 * blend);

  // Calculate the height of the path itself at this Z coordinate
  // The path should follow the general terrain flow but be much smoother
  // We sample the noise at the path's center (pathX) but dampen it significantly
  const pathBaseHeight = noise2D(pathX * 0.01, z * 0.01) * 3.0;

  // Add subtle camber/irregularity to the path surface so it's not perfectly flat
  const pathCamber = noise2D(x * 0.5, z * 0.5) * 0.15;

  // Final height is a linear interpolation between path height and wild terrain height
  return (y * blend) + ((pathBaseHeight + pathCamber) * (1 - blend));
};
