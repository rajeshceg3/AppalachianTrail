import React, { useLayoutEffect, useRef, useMemo, useEffect } from 'react';
import * as THREE from 'three';
import { getTerrainHeight, noise2D } from '../utils/terrain';
import { generateHeightMap, generateNormalMap } from '../utils/textureGenerator';

const terrainArgs = [600, 600, 512, 512];

const onBeforeCompile = (shader) => {
    shader.fragmentShader = `
      // Simple hash for high freq noise
      float hash(vec2 p) {
          p = fract(p * vec2(123.34, 456.21));
          p += dot(p, p + 45.32);
          return fract(p.x * p.y);
      }
    ` + shader.fragmentShader;

    // Use uv instead of vMapUv if map is not present?
    // But roughnessMap/normalMap are present, so vMapUv (or vRoughnessMapUv) should be there.
    // Standard material usually defines vMapUv if map is used.
    // If not, use vUv (standard attribute).
    // Let's assume vUv exists in standard vertex shader output.

    shader.fragmentShader = shader.fragmentShader.replace(
        '#include <map_fragment>',
        `
        #include <map_fragment>

        // Add procedural "grit"
        // High frequency noise based on UV
        // Use vRoughnessMapUv if available (since we use roughnessMap) or vUv

        #ifdef USE_ROUGHNESSMAP
            vec2 gritUv = vRoughnessMapUv;
        #else
            vec2 gritUv = vUv;
        #endif

        float grit = hash(gritUv * 500.0);

        // Soften the grit
        grit = mix(0.9, 1.1, grit);

        diffuseColor.rgb *= grit;
        `
    );
};

const Terrain = ({ color }) => {
  const meshRef = useRef();

  const { roughnessMap, normalMap } = useMemo(() => {
    // Higher resolution and scale to reduce visible tiling pattern
    const rMap = generateHeightMap(1024, 1024, 8.0, 4);
    rMap.wrapS = THREE.RepeatWrapping;
    rMap.wrapT = THREE.RepeatWrapping;
    rMap.repeat.set(8, 8);

    const nMap = generateNormalMap(1024, 1024, 8.0, 4, 1.0);
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
    for (let i = 0; i < count; i++) {
      const x = positions.getX(i);
      const y = positions.getY(i);

      const height = getTerrainHeight(x, -y);
      positions.setZ(i, height);
    }

    positions.needsUpdate = true;

    // 2. Compute Normals based on new heights
    geometry.computeVertexNormals();
    const normals = geometry.attributes.normal;

    // 3. Calculate Vertex Colors
    if (!geometry.attributes.color) {
      const colors = new Float32Array(count * 3);
      geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    }
    const colorAttribute = geometry.attributes.color;
    const colors = colorAttribute.array;

    const c = new THREE.Color();
    const darkRock = new THREE.Color('#2a2a2a');
    const highPeak = new THREE.Color('#e2e8f0');

    for (let i = 0; i < count; i++) {
      const x = positions.getX(i);
      const y = positions.getY(i);
      const h = positions.getZ(i);

      const slope = normals.getZ(i);
      const n = noise2D(x * 0.05, -y * 0.05);

      c.copy(baseColor);

      const rockFactor = 1.0 - THREE.MathUtils.smoothstep(0.5, 0.85, slope);
      c.lerp(darkRock, rockFactor * 0.7);

      const peakFactor = THREE.MathUtils.smoothstep(35, 60, h);
      c.lerp(highPeak, peakFactor * 0.4);

      c.offsetHSL(0, 0, n * 0.04);

      colors[i * 3] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;
    }

    colorAttribute.needsUpdate = true;

  }, [baseColor]);

  return (
    <mesh
      ref={meshRef}
      rotation={[-Math.PI / 2, 0, 0]}
      receiveShadow
      frustumCulled={false}
    >
      <planeGeometry args={terrainArgs} />
      <meshStandardMaterial
        vertexColors
        roughness={0.9}
        roughnessMap={roughnessMap}
        normalMap={normalMap}
        normalScale={new THREE.Vector2(0.5, 0.5)}
        flatShading={false}
        onBeforeCompile={onBeforeCompile}
      />
    </mesh>
  );
};

export default Terrain;
