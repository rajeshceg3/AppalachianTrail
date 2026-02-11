import React, { useLayoutEffect, useRef, useMemo } from 'react';
import * as THREE from 'three';
import { getTerrainHeight, noise2D } from '../utils/terrain';

const terrainArgs = [600, 600, 512, 512];

const Terrain = ({ color }) => {
  const meshRef = useRef();

  // Create base color object to avoid re-parsing every frame if it doesn't change
  const baseColor = useMemo(() => new THREE.Color(color), [color]);

  // Generate Procedural Noise Texture for detail
  const noiseTexture = useMemo(() => {
    const size = 512;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');

    // Fill with noise
    const imgData = ctx.createImageData(size, size);
    const data = imgData.data;

    for (let i = 0; i < data.length; i += 4) {
        // High frequency noise biased towards white (rough)
        // Range 100-255
        const val = 100 + Math.random() * 155;
        data[i] = val;     // R
        data[i+1] = val;   // G
        data[i+2] = val;   // B
        data[i+3] = 255;   // Alpha
    }
    ctx.putImageData(imgData, 0, 0);

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(60, 60); // High repeat for fine grain detail

    return texture;
  }, []);

  useLayoutEffect(() => {
    if (!meshRef.current) return;

    const geometry = meshRef.current.geometry;
    const positions = geometry.attributes.position;
    const count = positions.count;

    // 1. Set Heights
    // PlaneGeometry creates a flat grid on XY. We displace Z (which becomes Y in world).

    for (let i = 0; i < count; i++) {
      const x = positions.getX(i);
      const y = positions.getY(i); // Corresponds to -Z in world space due to rotation

      // Calculate height at World (x, z). World Z = -y.
      const height = getTerrainHeight(x, -y);
      positions.setZ(i, height);
    }

    positions.needsUpdate = true;

    // 2. Compute Normals based on new heights
    geometry.computeVertexNormals();
    const normals = geometry.attributes.normal;

    // 3. Calculate Vertex Colors
    // Initialize color attribute if not present
    if (!geometry.attributes.color) {
      const colors = new Float32Array(count * 3);
      geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    }
    const colorAttribute = geometry.attributes.color;
    const colors = colorAttribute.array;

    const c = new THREE.Color();
    const darkRock = new THREE.Color('#2a2a2a'); // Dark grey/brown for cliffs
    const highPeak = new THREE.Color('#e2e8f0'); // Lighter/snowy for peaks (Slate-200)

    for (let i = 0; i < count; i++) {
      const x = positions.getX(i);
      const y = positions.getY(i); // local Y (world -Z)
      const h = positions.getZ(i); // local Z (world Y/Height)

      // Slope factor: 1.0 = flat (normal points up Z), 0.0 = vertical
      const slope = normals.getZ(i);

      // Noise for organic variation
      const n = noise2D(x * 0.05, -y * 0.05); // Organic patchiness

      // Reset to base color
      c.copy(baseColor);

      // --- Slope Texturing ---
      // If slope < 0.7 (approx 45 deg), blend to rock color
      // Smoothstep for soft transition
      const rockFactor = 1.0 - THREE.MathUtils.smoothstep(0.5, 0.85, slope);
      // Mix rock color based on factor
      c.lerp(darkRock, rockFactor * 0.7);

      // --- Height Texturing ---
      // Lighten peaks
      const peakFactor = THREE.MathUtils.smoothstep(35, 60, h);
      c.lerp(highPeak, peakFactor * 0.4);

      // --- Noise Texturing ---
      // Subtle darkening/lightening for "dirt" vs "grass"
      // range -0.05 to +0.05
      c.offsetHSL(0, 0, n * 0.04);

      colors[i * 3] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;
    }

    colorAttribute.needsUpdate = true;

  }, [baseColor]); // Re-run when region color changes

  return (
    <mesh
      ref={meshRef}
      rotation={[-Math.PI / 2, 0, 0]}
      receiveShadow
      frustumCulled={false} // Prevent culling due to displacement
    >
      <planeGeometry args={terrainArgs} />
      <meshStandardMaterial
        vertexColors
        roughness={1}
        roughnessMap={noiseTexture}
        bumpMap={noiseTexture}
        bumpScale={0.15}
        flatShading={false}
      />
    </mesh>
  );
};

export default Terrain;
