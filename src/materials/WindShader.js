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
    shader.vertexShader = shader.vertexShader.replace(
      '#include <begin_vertex>',
      `
        #include <begin_vertex>

        // Simple wind sway based on height
        // Assumes local Y starts at 0 or is centered appropriately.
        // For cones, Y is often centered, so we use max(0.0, position.y + offset) if needed.
        // Here we assume base is roughly at Y=0 or sway increases with Y.
        // Use object space position.

        float h = max(0.0, position.y + 0.5); // Offset to ensure base doesn't move much if centered
        float time = uTime * uSwaySpeed;

        // Sway X
        float swayX = sin(time + position.x * 0.5 + position.z * 0.3) * uSwayAmount * h * h;

        // Sway Z (slightly different phase/freq)
        float swayZ = cos(time * 0.8 + position.x * 0.3 + position.z * 0.5) * uSwayAmount * h * h;

        transformed.x += swayX;
        transformed.z += swayZ;
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
