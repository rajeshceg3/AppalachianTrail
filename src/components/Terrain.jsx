import React, { useLayoutEffect, useRef, useMemo, useEffect, forwardRef, useImperativeHandle } from 'react';
import { Detailed } from '@react-three/drei';
import * as THREE from 'three';
import { getTerrainHeight, getPathX, noise2D } from '../utils/terrain';
import { generateHeightMap, generateNormalMap } from '../utils/textureGenerator';

const terrainArgsHigh = [1200, 1200, 256, 256]; // High detail for close range
const terrainArgsLow = [1200, 1200, 64, 64];   // Low detail for far range

const TerrainMesh = forwardRef(({ color, region, args, roughnessMap, normalMap, baseColor }, ref) => {
  const meshRef = useRef();

  useImperativeHandle(ref, () => meshRef.current);

  useLayoutEffect(() => {
    if (!meshRef.current) return;

    const geometry = meshRef.current.geometry;
    const positions = geometry.attributes.position;
    const count = positions.count;

    // 1. Set Heights
    for (let i = 0; i < count; i++) {
      const x = positions.getX(i);
      const y = positions.getY(i);
      const height = getTerrainHeight(x, -y, region?.terrainParams);
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
    const dirtColor = new THREE.Color('#5d5040');
    const sandColor = new THREE.Color('#fcd34d');
    const plateauDustColor = new THREE.Color('#c2410c');
    const snowColor = new THREE.Color('#ffffff');
    const screeColor = new THREE.Color('#8b8580');
    const pollutionColor = new THREE.Color('#1a1a1a');
    const radiationColor = new THREE.Color('#39ff14');
    const leyLineColor = new THREE.Color('#b514ff');
    const saltMarshColor = new THREE.Color('#4a5d23');
    const caveDarkness = new THREE.Color('#0f0f0f');
    const streamBedColor = new THREE.Color('#9ca3af');
    const alpineLakeShoreColor = new THREE.Color('#475569');

    const terrainParams = region?.terrainParams || {};
    const baseHeight = terrainParams.baseHeight || 0;

    for (let i = 0; i < count; i++) {
      const x = positions.getX(i);
      const y = positions.getY(i);
      const h = positions.getZ(i);

      const slope = normals.getZ(i);
      const n = noise2D(x * 0.05, -y * 0.05);

      c.copy(baseColor);

      const pathX = getPathX(-y);
      const distToPath = Math.abs(x - pathX);
      const pathBlend = 1.0 - THREE.MathUtils.smoothstep(1.5, 4.0, distToPath);
      c.lerp(dirtColor, pathBlend * 0.8);

      const thresholdNoise = n * 0.15;
      const rockThresholdStart = 0.5 + thresholdNoise;
      const rockThresholdEnd = 0.85 + thresholdNoise;
      const rockFactor = 1.0 - THREE.MathUtils.smoothstep(rockThresholdStart, rockThresholdEnd, slope);
      c.lerp(darkRock, rockFactor * 0.8);

      const peakFactor = THREE.MathUtils.smoothstep(35, 60, h);
      c.lerp(highPeak, peakFactor * 0.4);

      if (region?.id === 'maine') {
          if (slope < 0.7 && h > 30) {
               const screeFactor = 1.0 - THREE.MathUtils.smoothstep(0.4, 0.7, slope);
               c.lerp(screeColor, screeFactor * 0.9);
          }
          const snowThreshold = 45 + n * 3.0;
          if (h > snowThreshold) {
               const snowFactor = THREE.MathUtils.smoothstep(snowThreshold, snowThreshold + 10, h);
               c.lerp(snowColor, snowFactor * 0.95);
          }
      }

      if (terrainParams.coastal) {
          const sandFactor = 1.0 - THREE.MathUtils.smoothstep(baseHeight, baseHeight + 3.0, h);
          c.lerp(sandColor, sandFactor);
      }

      if (terrainParams.plateau) {
          const plateauLevel = baseHeight + 8.0;
          if (h > plateauLevel - 4.0 && h <= plateauLevel) {
               c.lerp(plateauDustColor, rockFactor * 0.6);
          }
      }

      if (terrainParams.pollution) {
          const polNoise = noise2D(x * 0.3, -y * 0.3);
          if (polNoise > 0.4) {
              const polFactor = THREE.MathUtils.smoothstep(0.4, 0.7, polNoise);
              c.lerp(pollutionColor, polFactor * 0.8);
          }
      }

      if (terrainParams.radiation) {
          const radNoise = noise2D(x * 0.2, -y * 0.2);
          if (radNoise > 0.6) {
              const radFactor = THREE.MathUtils.smoothstep(0.6, 0.9, radNoise);
              c.lerp(radiationColor, radFactor * 0.6);
          }
      }

      if (terrainParams.leyLines) {
          const lineX = Math.abs(Math.sin(x * 0.05 + -y * 0.05));
          const lineZ = Math.abs(Math.cos(x * 0.05 - -y * 0.05));
          if (lineX < 0.1 || lineZ < 0.1) {
              const lineFactor = 1.0 - Math.min(lineX, lineZ) / 0.1;
              c.lerp(leyLineColor, lineFactor * 0.8);
          }
      }

      if (terrainParams.saltMarsh) {
          const seaLevel = baseHeight;
          if (h < seaLevel + 3.0 && h > seaLevel - 1.0) {
              const marshFactor = 1.0 - Math.abs(h - (seaLevel + 1.0)) / 2.0;
              c.lerp(saltMarshColor, marshFactor * 0.7);
          }
      }

      if (terrainParams.caves) {
          const caveNoise = noise2D(x * 0.03, -y * 0.03);
          if (caveNoise > 0.6) {
              const sinkholeFactor = THREE.MathUtils.smoothstep(0.6, 1.0, caveNoise);
              c.lerp(caveDarkness, sinkholeFactor * 0.9);
          }
      }

      if (terrainParams.stream) {
          const streamPathX = Math.sin(-y * 0.02) * 30 + Math.sin(-y * 0.05) * 10;
          const distToStream = Math.abs(x - streamPathX);
          if (distToStream < 8.0) {
              const streamFactor = 1.0 - distToStream / 8.0;
              c.lerp(streamBedColor, streamFactor * 0.8);
          }
      }

      if (terrainParams.alpineLake) {
          const lakeCenter = { x: -40, z: -40 };
          const distToLake = Math.sqrt(Math.pow(x - lakeCenter.x, 2) + Math.pow(-y - lakeCenter.z, 2));
          if (distToLake < 50.0) {
              const shoreFactor = 1.0 - distToLake / 50.0;
              c.lerp(alpineLakeShoreColor, shoreFactor * 0.7);
          }
      }

      const lfN = noise2D(x * 0.005, -y * 0.005);
      c.offsetHSL(0, 0, n * 0.04 + lfN * 0.03);

      colors[i * 3] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;
    }

    colorAttribute.needsUpdate = true;
    geometry.computeBoundingBox();
    geometry.computeBoundingSphere();

  }, [baseColor, region, args]);

  return (
    <mesh
      ref={meshRef}
      rotation={[-Math.PI / 2, 0, 0]}
      receiveShadow
      frustumCulled={true}
    >
      <planeGeometry args={args} />
      <meshStandardMaterial
        vertexColors
        roughness={0.9}
        roughnessMap={roughnessMap}
        normalMap={normalMap}
        normalScale={new THREE.Vector2(0.5, 0.5)}
        flatShading={false}
      />
    </mesh>
  );
});

const Terrain = forwardRef(({ color, region }, ref) => {

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

  return (
    <group ref={ref}>
      <Detailed distances={[0, 400]}>
        <TerrainMesh
          args={terrainArgsHigh}
          color={color}
          region={region}
          baseColor={baseColor}
          roughnessMap={roughnessMap}
          normalMap={normalMap}
        />
        <TerrainMesh
          args={terrainArgsLow}
          color={color}
          region={region}
          baseColor={baseColor}
          roughnessMap={roughnessMap}
          normalMap={normalMap}
        />
      </Detailed>
    </group>
  );
});

export default Terrain;
