import { createNoise2D } from 'simplex-noise';
import * as THREE from 'three';

function mulberry32(a) {
    return function() {
      var t = a += 0x6D2B79F5;
      t = Math.imul(t ^ t >>> 15, t | 1);
      t ^= t + Math.imul(t ^ t >>> 7, t | 61);
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    }
}

const seed = 12345;
const random = mulberry32(seed);
const noise2D = createNoise2D(random);

console.log("Noise2D check:", noise2D(0, 0));

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

function ridgedNoise(x, z, octaves = 4, persistence = 0.5, lacunarity = 2.0, scale = 1.0) {
  let total = 0;
  let frequency = scale;
  let amplitude = 1;
  let maxValue = 0;
  for(let i = 0; i < octaves; i++) {
      let n = noise2D(x * frequency, z * frequency);
      n = 1.0 - Math.abs(n);
      n = n * n;
      total += n * amplitude;
      maxValue += amplitude;
      amplitude *= persistence;
      frequency *= lacunarity;
  }
  return total;
}

const getPathX = (z) => {
  let x = Math.sin(z * 0.043) * 6 +
          Math.sin(z * 0.017) * 12 +
          Math.sin(z * 0.009) * 4;
  x += fbm(100, z, 3, 0.5, 2.0, 0.005) * 15;
  return x;
};

const getTerrainHeight = (x, z) => {
  const pathX = getPathX(z);
  const dist = Math.abs(x - pathX);

  let y = fbm(x, z, 4, 0.5, 2.0, 0.005) * 12.0;
  const ridge = ridgedNoise(x, z, 3, 0.5, 2.0, 0.01) * 6.0;
  const ridgeMask = (noise2D(x * 0.008, z * 0.008) + 1) * 0.5;
  y = y * (1 - ridgeMask) + ridge * ridgeMask;
  y += fbm(x, z, 3, 0.5, 2.0, 0.1) * 0.5;
  y += noise2D(x * 1.5, z * 1.5) * 0.05;

  const widthNoise = noise2D(z * 0.1, 0) * 1.0;
  const pathWidth = 5.0 + widthNoise;

  const blendNoise = noise2D(0, z * 0.05) * 2.0;
  const blendDistance = 10.0 + blendNoise;

  let blend = (dist - pathWidth * 0.5) / blendDistance;
  blend = Math.max(0, Math.min(1, blend));
  blend = blend * blend * blend * (blend * (blend * 6 - 15) + 10);

  const pathBaseHeight = fbm(pathX, z, 2, 0.5, 2.0, 0.005) * 12.0 * (1 - ridgeMask) +
                         ridgedNoise(pathX, z, 2, 0.5, 2.0, 0.01) * 6.0 * ridgeMask;

  const pathCamber = noise2D(x * 0.5, z * 0.5) * 0.15;
  const wearTrack = -Math.exp(-Math.pow(dist, 2) * 2.0) * 0.1;

  const finalPathHeight = pathBaseHeight + pathCamber + wearTrack;

  return (y * blend) + (finalPathHeight * (1 - blend));
};

console.log("Height at (0,0):", getTerrainHeight(0, 0));
console.log("Height at (10,10):", getTerrainHeight(10, 10));
console.log("Height at (-100,-100):", getTerrainHeight(-100, -100));
