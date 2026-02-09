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
 * Fractal Brownian Motion (FBM)
 * Sums multiple octaves of noise for organic detail.
 */
function fbm(x, z, octaves = 4, persistence = 0.5, lacunarity = 2.0, scale = 1.0) {
  let total = 0;
  let frequency = scale;
  let amplitude = 1;
  let maxValue = 0;
  for(let i = 0; i < octaves; i++) {
      total += noise2D(x * frequency, z * frequency) * amplitude;
      maxValue += amplitude;
      amplitude *= persistence;
      frequency *= lacunarity;
  }
  return total;
}

/**
 * Ridged Multifractal Noise
 * Creates sharp peaks and valleys (erosion).
 */
function ridgedNoise(x, z, octaves = 4, persistence = 0.5, lacunarity = 2.0, scale = 1.0) {
  let total = 0;
  let frequency = scale;
  let amplitude = 1;
  let maxValue = 0;
  for(let i = 0; i < octaves; i++) {
      let n = noise2D(x * frequency, z * frequency);
      n = 1.0 - Math.abs(n); // Invert ridges
      n = n * n; // Sharpen ridges
      total += n * amplitude;
      maxValue += amplitude;
      amplitude *= persistence;
      frequency *= lacunarity;
  }
  return total;
}

/**
 * Calculates the X position of the path center for a given Z coordinate.
 * Creates a winding, natural-looking path.
 */
export const getPathX = (z) => {
  // Base path using sine waves for general direction
  let x = Math.sin(z * 0.043) * 6 +
          Math.sin(z * 0.017) * 12 +
          Math.sin(z * 0.009) * 4;

  // Add organic meander using FBM
  // Lower frequency, higher amplitude for general wandering
  x += fbm(100, z, 3, 0.5, 2.0, 0.005) * 15;

  return x;
};

/**
 * Calculates the terrain height at a given (x, z) coordinate.
 * Uses FBM and ridged noise for organic, eroded look.
 * Flattens the terrain near the path to create a walkable surface.
 */
export const getTerrainHeight = (x, z) => {
  const pathX = getPathX(z);
  const dist = Math.abs(x - pathX);

  // --- Terrain Noise Generation ---

  // 1. Base Layer: Large rolling hills (FBM)
  // Low frequency (0.005), High amplitude (12.0)
  let y = fbm(x, z, 4, 0.5, 2.0, 0.005) * 12.0;

  // 2. Erosion Layer: Ridged noise for sharp features/cliffs
  // Mix in some ridged noise for visual interest
  const ridge = ridgedNoise(x, z, 3, 0.5, 2.0, 0.01) * 6.0;

  // Blend base and ridge based on another noise layer (mask)
  const ridgeMask = (noise2D(x * 0.008, z * 0.008) + 1) * 0.5; // 0 to 1
  y = y * (1 - ridgeMask) + ridge * ridgeMask;

  // 3. Detail Layer: Roughness/Texture
  // High frequency (0.1), Low amplitude (0.5)
  y += fbm(x, z, 3, 0.5, 2.0, 0.1) * 0.5;

  // 4. Micro Detail: Ground texture (pebbles)
  // Very high frequency (1.5), Very low amplitude (0.05)
  y += noise2D(x * 1.5, z * 1.5) * 0.05;


  // --- Path Flattening Logic ---

  // Define width - slightly organic
  const widthNoise = noise2D(z * 0.1, 0) * 1.0;
  const pathWidth = 5.0 + widthNoise;

  // Blend distance - smoother transition
  const blendNoise = noise2D(0, z * 0.05) * 2.0;
  const blendDistance = 10.0 + blendNoise;

  // Calculate blend factor (0.0 = on path, 1.0 = fully wild terrain)
  let blend = (dist - pathWidth * 0.5) / blendDistance;
  blend = Math.max(0, Math.min(1, blend));
  // Smoothstep (quintic is even smoother: 6t^5 - 15t^4 + 10t^3)
  // But cubic (3t^2 - 2t^3) is usually fine. Let's use quintic for "stunning" smoothness.
  blend = blend * blend * blend * (blend * (blend * 6 - 15) + 10);

  // Path Height Calculation
  // We want the path to follow the terrain but be smoother.
  // Sample the "wild" noise at the path center (pathX), but dampen high frequencies.
  // We use a separate, smoother noise function for the path base.
  const pathBaseHeight = fbm(pathX, z, 2, 0.5, 2.0, 0.005) * 12.0 * (1 - ridgeMask) +
                         ridgedNoise(pathX, z, 2, 0.5, 2.0, 0.01) * 6.0 * ridgeMask;
                         // Note: mirroring the main terrain mix logic roughly, but with fewer octaves

  // Add subtle camber/irregularity to path surface
  const pathCamber = noise2D(x * 0.5, z * 0.5) * 0.15;

  // Add specific "wear" track in the center
  const wearTrack = -Math.exp(-Math.pow(dist, 2) * 2.0) * 0.1; // Slight dip in center

  const finalPathHeight = pathBaseHeight + pathCamber + wearTrack;

  // Final mix
  return (y * blend) + (finalPathHeight * (1 - blend));
};
