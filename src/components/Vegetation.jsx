import React, { useMemo, useRef, useLayoutEffect } from 'react';
import { Instances, Instance } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { getTerrainHeight, getPathX, noise2D } from '../utils/terrain';
import { applyWindShader } from '../materials/WindShader';

const TreeCluster = ({ data, region, swaySpeed }) => {
  // Reactive sway based on wind intensity
  const windIntensity = region.windIntensity || 0.4;
  const speed = swaySpeed * (0.8 + windIntensity);
  const amp = 0.2 * (0.5 + windIntensity * 2.0); // Magnitude for shader

  // Create materials with wind shader
  const foliageMaterial1 = useMemo(() => {
      const m = new THREE.MeshStandardMaterial({ color: "#ffffff", roughness: 0.8 });
      applyWindShader(m, speed, amp);
      return m;
  }, [speed, amp]);

  const foliageMaterial2 = useMemo(() => {
      const m = new THREE.MeshStandardMaterial({ color: "#ffffff", roughness: 0.8 });
      applyWindShader(m, speed, amp * 1.5);
      return m;
  }, [speed, amp]);

  const foliageMaterial3 = useMemo(() => {
      const m = new THREE.MeshStandardMaterial({ color: "#ffffff", roughness: 0.8 });
      applyWindShader(m, speed, amp * 2.0); // Topmost layer moves most
      return m;
  }, [speed, amp]);

  useFrame((state) => {
    const time = state.clock.elapsedTime;

    if (foliageMaterial1.userData.update) foliageMaterial1.userData.update(time);
    if (foliageMaterial2.userData.update) foliageMaterial2.userData.update(time);
    if (foliageMaterial3.userData.update) foliageMaterial3.userData.update(time);
  });

  return (
    <group>
      {/* Trunks - Static */}
      <Instances range={data.length}>
        <cylinderGeometry args={[0.15, 0.25, 1, 5]} />
        <meshStandardMaterial color="#5c4033" roughness={0.9} />
        {data.map((d, i) => (
          <Instance
            key={`trunk-${i}`}
            position={[
              d.position[0] - 0.5 * d.scale * d.tiltZ,
              d.position[1] + 0.5 * d.scale,
              d.position[2] + 0.5 * d.scale * d.tiltX
            ]}
            scale={[d.scale, d.scale, d.scale]}
            rotation={[d.tiltX, d.rotation, d.tiltZ]}
          />
        ))}
      </Instances>

      {/* Foliage Bottom Layer */}
      <Instances range={data.length} material={foliageMaterial1}>
        <coneGeometry args={[1.0, 2.0, 7]} />
        {data.map((d, i) => (
        <Instance
            key={`fol1-${i}`}
            position={[
              d.position[0] - 1.5 * d.scale * d.tiltZ,
              d.position[1] + 1.5 * d.scale,
              d.position[2] + 1.5 * d.scale * d.tiltX
            ]}
            scale={[d.scale, d.scale, d.scale]}
            rotation={[d.tiltX, d.rotation, d.tiltZ]}
            color={d.color1}
        />
        ))}
      </Instances>

      {/* Foliage Middle Layer */}
      <Instances range={data.length} material={foliageMaterial2}>
        <coneGeometry args={[0.7, 1.5, 7]} />
        {data.map((d, i) => (
        <Instance
            key={`fol2-${i}`}
            position={[
              d.position[0] - 2.5 * d.scale * d.tiltZ,
              d.position[1] + 2.5 * d.scale,
              d.position[2] + 2.5 * d.scale * d.tiltX
            ]}
            scale={[d.scale, d.scale, d.scale]}
            rotation={[d.tiltX, d.rotation + 1, d.tiltZ]}
            color={d.color2}
        />
        ))}
      </Instances>

      {/* Foliage Top Layer */}
      <Instances range={data.length} material={foliageMaterial3}>
        <coneGeometry args={[0.4, 1.2, 7]} />
        {data.map((d, i) => (
        <Instance
            key={`fol3-${i}`}
            position={[
              d.position[0] - 3.2 * d.scale * d.tiltZ,
              d.position[1] + 3.2 * d.scale,
              d.position[2] + 3.2 * d.scale * d.tiltX
            ]}
            scale={[d.scale, d.scale, d.scale]}
            rotation={[d.tiltX, d.rotation + 2, d.tiltZ]}
            color={d.color1}
        />
        ))}
      </Instances>
    </group>
  );
};

const Vegetation = ({ region }) => {
  const treeCount = region.environment === 'forest' ? 2500 : 1000;

  const treeData = useMemo(() => {
    const data = [];
    let attempts = 0;
    // Safety limit to prevent infinite loops
    const maxAttempts = treeCount * 10;

    const baseC1 = new THREE.Color(region.treeColor1);
    const baseC2 = new THREE.Color(region.treeColor2);

    while (data.length < treeCount && attempts < maxAttempts) {
      attempts++;

      // Spread trees over the full terrain area
      const z = (Math.random() - 0.5) * 600;
      const x = (Math.random() - 0.5) * 600;

      // 1. Noise-based Clustering
      const noiseVal = noise2D(x * 0.03, z * 0.03);

      if (noiseVal < -0.2) continue;

      // 2. Path Avoidance
      const pathX = getPathX(z);
      const dist = Math.abs(x - pathX);
      const placementProb = Math.max(0, Math.min(1, (dist - 4) / 10));

      if (Math.random() > placementProb) continue;

      // 3. Placement
      const y = getTerrainHeight(x, z);
      const scale = 0.5 * Math.exp(Math.random() * 1.3);
      const rotation = Math.random() * Math.PI * 2;
      // Random tilt for organic feel (up to ~6 degrees)
      const tiltX = (Math.random() - 0.5) * 0.2;
      const tiltZ = (Math.random() - 0.5) * 0.2;

      const mix = Math.random();
      const variance = 0.9 + Math.random() * 0.2;

      const c1 = baseC1.clone().lerp(baseC2, mix * 0.3).multiplyScalar(variance);
      const c2 = baseC2.clone().lerp(baseC1, mix * 0.3).multiplyScalar(variance);

      data.push({
          position: [x, y, z],
          scale,
          rotation,
          tiltX,
          tiltZ,
          color1: c1,
          color2: c2
      });
    }
    return data;
  }, [region.id, treeCount, region.treeColor1, region.treeColor2]);

  // Split data into chunks
  const clusters = useMemo(() => {
    const chunkSize = Math.ceil(treeData.length / 6);
    return [
        treeData.slice(0, chunkSize),
        treeData.slice(chunkSize, chunkSize * 2),
        treeData.slice(chunkSize * 2, chunkSize * 3),
        treeData.slice(chunkSize * 3, chunkSize * 4),
        treeData.slice(chunkSize * 4, chunkSize * 5),
        treeData.slice(chunkSize * 5)
    ];
  }, [treeData]);

  // Pass different swaySpeeds to create variety in frequency
  return (
    <>
      <TreeCluster data={clusters[0]} region={region} swaySpeed={0.5} />
      <TreeCluster data={clusters[1]} region={region} swaySpeed={0.4} />
      <TreeCluster data={clusters[2]} region={region} swaySpeed={0.6} />
      <TreeCluster data={clusters[3]} region={region} swaySpeed={0.45} />
      <TreeCluster data={clusters[4]} region={region} swaySpeed={0.55} />
      <TreeCluster data={clusters[5]} region={region} swaySpeed={0.35} />
    </>
  );
};

export default Vegetation;
