/**
 * Shared Wind Logic for Audio and Visual Sync
 * Ideally, these constants should match the GLSL shader in src/materials/WindShader.js
 */

export const getWindGustRaw = (x, z, time) => {
  // Matches the GLSL logic:
  // float gust = sin(worldPos.x * 0.05 + time * 0.5)
  //            + sin(worldPos.z * 0.03 + time * 0.3)
  //            + sin(worldPos.x * 0.1 + worldPos.z * 0.1 + time * 0.8) * 0.5;
  return Math.sin(x * 0.05 + time * 0.5)
       + Math.sin(z * 0.03 + time * 0.3)
       + Math.sin(x * 0.1 + z * 0.1 + time * 0.8) * 0.5;
};

export const getWindGustFactor = (x, z, time) => {
  const gust = getWindGustRaw(x, z, time);
  // Map gust (-2.5 to 2.5) to a multiplier (0.5 to 1.5)
  // float gustFactor = 1.0 + (gust * 0.2);
  return 1.0 + (gust * 0.2);
};
