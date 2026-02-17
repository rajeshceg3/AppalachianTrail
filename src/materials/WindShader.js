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
    shader.uniforms.uGlobalWind = { value: 0.5 };
    shader.uniforms.uWindDirection = { value: new THREE.Vector2(1, 0) };

    // Inject uniforms
    shader.vertexShader = `
      uniform float uTime;
      uniform float uSwaySpeed;
      uniform float uSwayAmount;
      uniform float uGlobalWind;
      uniform vec2 uWindDirection;
    ` + shader.vertexShader;

    // Inject displacement logic
    shader.vertexShader = shader.vertexShader.replace(
      '#include <begin_vertex>',
      `
        #include <begin_vertex>

        // Calculate world position
        vec4 worldPos = modelMatrix * vec4(position, 1.0);
        #ifdef USE_INSTANCING
          worldPos = modelMatrix * instanceMatrix * vec4(position, 1.0);
        #endif

        // Height factor (bending increases with height)
        // Assumes local Y is up and base is approx -1.0 for foliage
        float h = max(0.0, position.y + 1.0);

        // --- Unified Wind Logic ---

        // Intensity from global system (synced with audio)
        // uGlobalWind contains base + gusts
        float intensity = uGlobalWind * uSwayAmount;

        // 1. Directional Bend (Lean)
        // Trees lean away from wind source
        float bendFactor = intensity * 0.5 * h * h;
        float bendX = uWindDirection.x * bendFactor;
        float bendZ = uWindDirection.y * bendFactor;

        // 2. Turbulance / Flutter
        // Faster time for flutter
        float time = uTime * uSwaySpeed;

        // Add some local variance so trees don't move in unison
        float localPhase = worldPos.x * 0.5 + worldPos.z * 0.5;

        // Flutter is faster and chaotic
        float flutter = sin(time * 2.0 + localPhase) * 0.1 * intensity * h;

        // Elastic bounce (sway back against wind)
        float bounce = cos(time * 0.5 + localPhase) * 0.2 * intensity * h * h;

        transformed.x += bendX + flutter + bounce * uWindDirection.x;
        transformed.z += bendZ + flutter + bounce * uWindDirection.y;

        // Arc Correction: Lower Y slightly to simulate rotation around base
        transformed.y -= (bendX * bendX + bendZ * bendZ) * 0.2;
      `
    );

    // Store reference to update uniform
    material.userData.shader = shader;
  };

  // Helper to update time and wind
  material.userData.update = (time, natureState) => {
    if (material.userData.shader) {
      material.userData.shader.uniforms.uTime.value = time;
      if (natureState) {
          material.userData.shader.uniforms.uGlobalWind.value = natureState.windIntensity;
          material.userData.shader.uniforms.uWindDirection.value.copy(natureState.windDirection);
      }
    }
  };
}
