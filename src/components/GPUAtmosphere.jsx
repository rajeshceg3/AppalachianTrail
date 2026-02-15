import React, { useMemo, useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const GPUAtmosphere = ({ color = '#ffffff', count = 2000, type = 'dust', range = 100 }) => {
  const materialRef = useRef();

  // Create random attributes
  const { positions, offsets, speeds, scales } = useMemo(() => {
    const positions = new Float32Array(count * 3);
    const offsets = new Float32Array(count); // Random offset for sine waves
    const speeds = new Float32Array(count);
    const scales = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * range;
      positions[i * 3 + 1] = Math.random() * 20; // Height 0 to 20
      positions[i * 3 + 2] = (Math.random() - 0.5) * range;

      offsets[i] = Math.random() * 100;
      speeds[i] = 0.2 + Math.random() * 0.8;
      scales[i] = 0.5 + Math.random() * 1.5;
    }
    return { positions, offsets, speeds, scales };
  }, [count, range]);

  // Texture generation (simple soft particle)
  const particleTexture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 32;
    canvas.height = 32;
    const ctx = canvas.getContext('2d');
    const grad = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
    grad.addColorStop(0, 'rgba(255,255,255,1)');
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 32, 32);
    return new THREE.CanvasTexture(canvas);
  }, []);

  const uniforms = useMemo(() => ({
    uTime: { value: 0 },
    uColor: { value: new THREE.Color(color) },
    uCameraPos: { value: new THREE.Vector3() },
    uRange: { value: range },
    uType: { value: type === 'snow' ? 1 : type === 'leaves' ? 2 : 0 },
    uMap: { value: particleTexture },
    uLightColor: { value: new THREE.Color('#ffffff') },
    uLightIntensity: { value: 1.0 }
  }), [particleTexture]); // Minimal dependencies for init

  // Update uniforms when props change
  useEffect(() => {
    if (materialRef.current) {
        materialRef.current.uniforms.uColor.value.set(color);
        materialRef.current.uniforms.uType.value = type === 'snow' ? 1 : type === 'leaves' ? 2 : 0;
        materialRef.current.uniforms.uRange.value = range;
    }
  }, [color, type, range]);

  useFrame((state) => {
    if (materialRef.current) {
      materialRef.current.uniforms.uTime.value = state.clock.elapsedTime;
      materialRef.current.uniforms.uCameraPos.value.copy(state.camera.position);

      // We could pass scene light info here if we had access to it easily.
      // For now, assume ambient white.
    }
  });

  const vertexShader = `
    uniform float uTime;
    uniform vec3 uCameraPos;
    uniform float uRange;
    uniform int uType; // 0=dust, 1=snow, 2=leaves

    attribute float aOffset;
    attribute float aSpeed;
    attribute float aScale;
    attribute vec3 aPos; // Initial random position

    varying vec2 vUv;
    varying float vAlpha;
    varying float vDist;

    void main() {
      vUv = uv;

      // Base Position
      vec3 pos = aPos;

      // --- Movement Logic ---
      float time = uTime * aSpeed;

      // Wind Drift (Z axis mostly)
      float zDrift = time;
      // Add slight X drift
      float xDrift = sin(time * 0.5 + aOffset) * 2.0;

      if (uType == 1) { // Snow: Downward
         pos.y -= time * 3.0;
         pos.x += xDrift * 0.5;
         pos.z += zDrift * 0.5;
      } else if (uType == 2) { // Leaves: Downward + Sway
         pos.y -= time * 1.0;
         pos.x += xDrift;
         pos.z += zDrift;
      } else { // Dust: Gentle float
         pos.z += zDrift;
         pos.y += sin(time * 0.5 + aOffset) * 0.5;
         pos.x += cos(time * 0.3 + aOffset) * 0.5;
      }

      // --- Wrapping Logic ---
      // Relative to camera:
      vec3 rel = pos - uCameraPos;

      // Wrap X
      rel.x = mod(rel.x + uRange * 0.5, uRange) - uRange * 0.5;
      // Wrap Z
      rel.z = mod(rel.z + uRange * 0.5, uRange) - uRange * 0.5;

      // Wrap Y
      // We keep Y within 20 units window relative to camera if falling
      if (uType == 1 || uType == 2) {
          rel.y = mod(rel.y - uCameraPos.y + 10.0, 20.0) - 10.0;
      }
      // Else dust keeps its absolute Y mostly, but we clamp or wrap to keep it visible
      // Let's wrap dust Y too for infinite vertical field
      else {
          rel.y = mod(rel.y - uCameraPos.y + 10.0, 20.0) - 10.0;
      }

      // Final World Position
      vec3 finalPos = uCameraPos + rel;

      // --- Billboarding ---
      vec4 mvPosition = viewMatrix * vec4(finalPos, 1.0);

      // Scale
      float scale = aScale;
      // Distance fade scale (shrink if too close to avoid clipping)
      float dist = length(mvPosition.xyz);
      vDist = dist;

      if (dist < 2.0) scale *= (dist / 2.0);

      mvPosition.xy += position.xy * scale;

      gl_Position = projectionMatrix * mvPosition;

      // --- Varyings ---
      // Distance fade for alpha (Fade out at edges of range)
      float edgeFade = 1.0 - smoothstep(uRange * 0.35, uRange * 0.5, abs(rel.x));
      edgeFade *= 1.0 - smoothstep(uRange * 0.35, uRange * 0.5, abs(rel.z));
      edgeFade *= 1.0 - smoothstep(9.0, 10.0, abs(rel.y)); // Fade top/bottom

      vAlpha = edgeFade;
    }
  `;

  const fragmentShader = `
    uniform sampler2D uMap;
    uniform vec3 uColor;
    uniform vec3 uLightColor;
    uniform float uLightIntensity;

    varying vec2 vUv;
    varying float vAlpha;
    varying float vDist;

    void main() {
      vec4 texColor = texture2D(uMap, vUv);

      // Simple lighting simulation
      vec3 light = uLightColor * uLightIntensity;

      // Simple fog approximation (fade to transparent in distance)
      // Since additive blending, fading to black/transparent is enough.
      float fog = 1.0 - smoothstep(30.0, 90.0, vDist);

      gl_FragColor = vec4(uColor * light, texColor.a * vAlpha * fog * 0.6);
    }
  `;

  return (
    <mesh frustumCulled={false}>
      <instancedBufferGeometry args={[null, null, count]}>
        <planeGeometry args={[1, 1]} />
        <instancedBufferAttribute attach="attributes-aPos" args={[positions, 3]} />
        <instancedBufferAttribute attach="attributes-aOffset" args={[offsets, 1]} />
        <instancedBufferAttribute attach="attributes-aSpeed" args={[speeds, 1]} />
        <instancedBufferAttribute attach="attributes-aScale" args={[scales, 1]} />
      </instancedBufferGeometry>
      <shaderMaterial
        ref={materialRef}
        uniforms={uniforms}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        transparent
        depthWrite={false}
        blending={THREE.NormalBlending} // Changed from Additive to Normal for better visibility of "dust"
        // Additive is good for glowing things, Normal is better for dust/leaves
      />
    </mesh>
  );
};

export default GPUAtmosphere;
