import React, { useLayoutEffect, useRef, useMemo, useEffect, forwardRef, useImperativeHandle } from 'react';
import * as THREE from 'three';
import { getTerrainHeight, getPathX, noise2D } from '../utils/terrain';
import { generateHeightMap, generateNormalMap } from '../utils/textureGenerator';

const terrainArgs = [1200, 1200, 256, 256]; // Reduced segments for better generation & culling performance

const Terrain = forwardRef(({ color, region }, ref) => {
  const meshRef = useRef();

  useImperativeHandle(ref, () => meshRef.current);

  const { roughnessMap, normalMap } = useMemo(() => {
    // Higher resolution and scale to reduce visible tiling pattern
    const rMap = generateHeightMap(512, 512, 8.0, 4);
    rMap.wrapS = THREE.RepeatWrapping;
    rMap.wrapT = THREE.RepeatWrapping;
    rMap.repeat.set(8, 8);

    const nMap = generateNormalMap(512, 512, 8.0, 4, 1.0, rMap.userData.imageData);
    nMap.wrapS = THREE.RepeatWrapping;
    nMap.wrapT = THREE.RepeatWrapping;
    nMap.repeat.set(8, 8);

    return { roughnessMap: rMap, normalMap: nMap };
  }, []);

  useEffect(() => {
    return () => {
      roughnessMap.dispose();
      normalMap.dispose();
    };
  }, [roughnessMap, normalMap]);

  // Create base color object to avoid re-parsing every frame if it doesn't change
  const baseColor = useMemo(() => new THREE.Color(color), [color]);

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
      const height = getTerrainHeight(x, -y, region?.terrainParams);
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
    const dirtColor = new THREE.Color('#5d5040'); // Dirt/gravel for path edges
    const sandColor = new THREE.Color('#fcd34d'); // Sand/Beach for coastal
    const plateauDustColor = new THREE.Color('#c2410c'); // Red dust for plateau edges
    const snowColor = new THREE.Color('#ffffff'); // Pure snow
    const screeColor = new THREE.Color('#8b8580'); // Loose scree rock

    const terrainParams = region?.terrainParams || {};
    const baseHeight = terrainParams.baseHeight || 0;

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

      // --- Path Blending ---
      const pathX = getPathX(-y); // -y is World Z
      const distToPath = Math.abs(x - pathX);
      // Fade dirt color near path (1.5 to 4.0 units)
      const pathBlend = 1.0 - THREE.MathUtils.smoothstep(1.5, 4.0, distToPath);
      c.lerp(dirtColor, pathBlend * 0.8);

      // --- Slope Texturing ---
      // Perturb slope threshold with noise for organic rock blending
      const thresholdNoise = n * 0.15;
      const rockThresholdStart = 0.5 + thresholdNoise;
      const rockThresholdEnd = 0.85 + thresholdNoise;

      // If slope is steep, blend to rock color
      const rockFactor = 1.0 - THREE.MathUtils.smoothstep(rockThresholdStart, rockThresholdEnd, slope);

      // Mix rock color based on factor (overrides dirt/grass)
      c.lerp(darkRock, rockFactor * 0.8);

      // --- Height Texturing ---
      // Lighten peaks
      const peakFactor = THREE.MathUtils.smoothstep(35, 60, h);
      c.lerp(highPeak, peakFactor * 0.4);

      // Snow line and scree slope features for Mountain locations
      if (region?.id === 'maine') {
          // Scree slope (loose rocks on steep edges at medium-high altitudes)
          if (slope < 0.7 && h > 30) {
               const screeFactor = 1.0 - THREE.MathUtils.smoothstep(0.4, 0.7, slope);
               c.lerp(screeColor, screeFactor * 0.9);
          }

          // Snow line (snow accumulation at highest peaks, modulated by noise)
          const snowThreshold = 45 + n * 3.0;
          if (h > snowThreshold) {
               const snowFactor = THREE.MathUtils.smoothstep(snowThreshold, snowThreshold + 10, h);
               c.lerp(snowColor, snowFactor * 0.95);
          }
      }

      // Coastal sand blending
      if (terrainParams.coastal) {
          const sandFactor = 1.0 - THREE.MathUtils.smoothstep(baseHeight, baseHeight + 3.0, h);
          c.lerp(sandColor, sandFactor);
      }

      // Plateau edge blending (dusty red on steep parts near top)
      if (terrainParams.plateau) {
          const plateauLevel = baseHeight + 8.0;
          if (h > plateauLevel - 4.0 && h <= plateauLevel) {
               c.lerp(plateauDustColor, rockFactor * 0.6);
          }
      }

      // --- Noise Texturing ---
      // Low frequency noise for large scale variation
      const lfN = noise2D(x * 0.005, -y * 0.005);

      // Subtle darkening/lightening for "dirt" vs "grass"
      // range -0.05 to +0.05
      // Combined with low frequency noise
      c.offsetHSL(0, 0, n * 0.04 + lfN * 0.03);

      colors[i * 3] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;
    }

    colorAttribute.needsUpdate = true;

    // Compute bounding geometry so frustum culling works correctly
    geometry.computeBoundingBox();
    geometry.computeBoundingSphere();

  }, [baseColor, region]); // Re-run when region changes

  return (
    <mesh
      ref={meshRef}
      rotation={[-Math.PI / 2, 0, 0]}
      receiveShadow
      frustumCulled={true} // Re-enabled culling after computing bounds
    >
      <planeGeometry args={terrainArgs} />
      <meshStandardMaterial
        vertexColors
        roughness={0.9}
        roughnessMap={roughnessMap}
        normalMap={normalMap}
        normalScale={new THREE.Vector2(0.5, 0.5)} // Subtle normal
        flatShading={false}
      />
    </mesh>
  );
});

export default Terrain;
