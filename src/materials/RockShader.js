import * as THREE from 'three';

/**
 * Injects static displacement logic into a material's vertex shader for rocks.
 * @param {THREE.Material} material - The material to modify.
 * @param {number} magnitude - Magnitude of the displacement.
 */
export function applyRockShader(material, magnitude = 0.15) {
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uDisplacementMagnitude = { value: magnitude };

    // Inject uniforms and noise function
    shader.vertexShader = `
      uniform float uDisplacementMagnitude;

      // Simple pseudo-random sine wave combination for organic lumps
      float organicNoise(vec3 p) {
          return sin(p.x * 2.0 + p.y * 1.5) * 0.5 +
                 sin(p.z * 2.5 + p.x * 1.1) * 0.3 +
                 sin(p.y * 3.0 + p.z * 1.7) * 0.2;
      }
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

        // Calculate noise based on world position to ensure variation between instances
        float n = organicNoise(worldPos.xyz);

        // Add some high frequency noise for roughness
        float n2 = sin(worldPos.x * 10.0) * sin(worldPos.z * 10.0) * 0.1;

        float displacement = (n + n2) * uDisplacementMagnitude;

        // Apply displacement along normal
        transformed += normal * displacement;
      `
    );
  };
}
