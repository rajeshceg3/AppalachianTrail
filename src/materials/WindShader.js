import * as THREE from 'three';

/**
 * Injects wind sway logic into a material's vertex shader.
 * @param {THREE.Material} material - The material to modify.
 * @param {number} swaySpeed - Speed of the sway animation.
 * @param {number} swayAmount - Magnitude of the sway.
 */
export function applyWindShader(material, swaySpeed = 1.0, swayAmount = 0.1) {
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = { value: 0 };
    shader.uniforms.uSwaySpeed = { value: swaySpeed };
    shader.uniforms.uSwayAmount = { value: swayAmount };

    // Inject uniforms
    shader.vertexShader = `
      uniform float uTime;
      uniform float uSwaySpeed;
      uniform float uSwayAmount;
    ` + shader.vertexShader;

    // Inject displacement logic
    // We compute world position to create coherent wind waves across instances.
    shader.vertexShader = shader.vertexShader.replace(
      '#include <begin_vertex>',
      `
        #include <begin_vertex>

        // Calculate world position for coherent noise
        vec4 worldPos = modelMatrix * vec4(position, 1.0);
        #ifdef USE_INSTANCING
          worldPos = modelMatrix * instanceMatrix * vec4(position, 1.0);
        #endif

        // Height factor (bending increases with height)
        // Assumes local Y is up and base is approx -1.0 for foliage
        float h = max(0.0, position.y + 1.0);

        // Separate time for global wind movement vs local sway frequency
        float windTime = uTime;
        float swayTime = uTime * uSwaySpeed;

        // --- Gust Logic ---
        // Combine sine waves to create rolling wind bands across the terrain.
        // Frequencies chosen to be non-repeating. Matches src/utils/wind.js
        float gust = sin(worldPos.x * 0.05 + windTime * 0.5)
                   + sin(worldPos.z * 0.03 + windTime * 0.3)
                   + sin(worldPos.x * 0.1 + worldPos.z * 0.1 + windTime * 0.8) * 0.5;

        // Map gust (-2.5 to 2.5) to a multiplier (0.5 to 1.5)
        float gustFactor = 1.0 + (gust * 0.2);

        // Modulate amplitude by gust
        float currentSwayAmount = uSwayAmount * gustFactor;

        // --- Sway Logic ---
        // High frequency sway based on position
        float swayX = sin(swayTime + worldPos.x * 0.5 + worldPos.z * 0.3) * currentSwayAmount * h * h;
        float swayZ = cos(swayTime * 0.8 + worldPos.x * 0.3 + worldPos.z * 0.5) * currentSwayAmount * h * h;

        transformed.x += swayX;
        transformed.z += swayZ;

        // Arc Correction: Lower Y slightly to simulate rotation around base
        transformed.y -= (swayX * swayX + swayZ * swayZ) * 0.3;
      `
    );

    // Store reference to update uniform
    material.userData.shader = shader;
  };

  // Helper to update time
  material.userData.update = (time) => {
    if (material.userData.shader) {
      material.userData.shader.uniforms.uTime.value = time;
    }
  };
}
