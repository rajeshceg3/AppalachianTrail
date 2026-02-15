import * as THREE from 'three';

/**
 * Enhanced shader injection for organic materials.
 * Adds vertex displacement (noise) and wind sway.
 *
 * @param {THREE.Material} material - The material to enhance.
 * @param {Object} options - Configuration options.
 * @param {Object} options.wind - Wind settings { speed, amount }.
 * @param {Object} options.displacement - Displacement settings { scale, strength }.
 */
export function enhanceMaterial(material, options = {}) {
  const wind = options.wind || null;
  const displacement = options.displacement || null;

  material.onBeforeCompile = (shader) => {
    // Inject Uniforms
    shader.uniforms.uTime = { value: 0 };

    let uniformsChunk = `uniform float uTime;\n`;

    if (wind) {
      shader.uniforms.uSwaySpeed = { value: wind.speed || 1.0 };
      shader.uniforms.uSwayAmount = { value: wind.amount || 0.1 };
      uniformsChunk += `
        uniform float uSwaySpeed;
        uniform float uSwayAmount;
      `;
    }

    if (displacement) {
      shader.uniforms.uDisplaceScale = { value: displacement.scale || 1.0 };
      shader.uniforms.uDisplaceStrength = { value: displacement.strength || 0.1 };
      uniformsChunk += `
        uniform float uDisplaceScale;
        uniform float uDisplaceStrength;
      `;
    }

    // Inject Common Noise Function
    const noiseChunk = `
      // Simple pseudo-random noise
      float hash(vec3 p) {
        p = fract(p * 0.3183099 + .1);
        p *= 17.0;
        return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
      }

      float noise(vec3 x) {
        vec3 i = floor(x);
        vec3 f = fract(x);
        f = f * f * (3.0 - 2.0 * f);
        return mix(mix(mix(hash(i + vec3(0,0,0)), hash(i + vec3(1,0,0)), f.x),
                       mix(hash(i + vec3(0,1,0)), hash(i + vec3(1,1,0)), f.x), f.y),
                   mix(mix(hash(i + vec3(0,0,1)), hash(i + vec3(1,0,1)), f.x),
                       mix(hash(i + vec3(0,1,1)), hash(i + vec3(1,1,1)), f.x), f.y), f.z);
      }
    `;

    shader.vertexShader = uniformsChunk + noiseChunk + shader.vertexShader;

    // Replace <begin_vertex>
    let vertexLogic = `
        #include <begin_vertex>

        // Calculate world position for coherent noise
        vec4 worldPos = modelMatrix * vec4(position, 1.0);
        #ifdef USE_INSTANCING
          worldPos = modelMatrix * instanceMatrix * vec4(position, 1.0);
        #endif
    `;

    if (displacement) {
        // Use local position for displacement so it rotates/scales with object
        vertexLogic += `
          // --- Organic Displacement ---
          float dNoise = noise(position * uDisplaceScale);
          float disp = (dNoise - 0.5) * 2.0 * uDisplaceStrength;
          transformed += normal * disp;
        `;
    }

    if (wind) {
        vertexLogic += `
          // --- Wind Sway ---
          // Height factor (bending increases with height)
          // Assumes local Y is up.
          float h = max(0.0, position.y + 0.5);

          float time = uTime * uSwaySpeed;

          // Gust Logic (Global world pos)
          float gust = sin(worldPos.x * 0.05 + time * 0.5)
                     + sin(worldPos.z * 0.03 + time * 0.3)
                     + sin(worldPos.x * 0.1 + worldPos.z * 0.1 + time * 0.8) * 0.5;
          float gustFactor = 1.0 + (gust * 0.2);
          float currentSwayAmount = uSwayAmount * gustFactor;

          // Sway Logic
          float swayX = sin(time + worldPos.x * 0.5 + worldPos.z * 0.3) * currentSwayAmount * h * h;
          float swayZ = cos(time * 0.8 + worldPos.x * 0.3 + worldPos.z * 0.5) * currentSwayAmount * h * h;

          transformed.x += swayX;
          transformed.z += swayZ;
          // Arc Correction
          transformed.y -= (swayX * swayX + swayZ * swayZ) * 0.3;
        `;
    }

    shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>', vertexLogic);

    material.userData.shader = shader;
  };

  // Helper to update time
  material.userData.update = (time) => {
    if (material.userData.shader) {
      material.userData.shader.uniforms.uTime.value = time;
    }
  };
}
