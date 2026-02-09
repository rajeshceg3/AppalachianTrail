import React, { useMemo, useRef } from 'react';
import { Instances, Instance } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { createNoise2D } from 'simplex-noise';
import * as THREE from 'three';
import { getTerrainHeight, getPathX } from '../utils/terrain';

// Create a seeded noise instance for consistent vegetation patterns
const noise2D = createNoise2D(Math.random);

const TreeCluster = ({ data, region, swayOffset, swaySpeed }) => {
  const fol1Ref = useRef();
  const fol2Ref = useRef();

  // Reactive sway based on wind intensity
  const windIntensity = region.windIntensity || 0.4;
  const speed = swaySpeed * (0.8 + windIntensity);
  const amp = 0.02 * (0.5 + windIntensity * 2.0); // More noticeable sway

  useFrame((state) => {
    const time = state.clock.elapsedTime;
    // Independent sway per cluster
    if (fol1Ref.current) {
        fol1Ref.current.rotation.x = Math.sin(time * speed + swayOffset) * amp;
        fol1Ref.current.rotation.z = Math.cos(time * (speed * 0.7) + swayOffset) * amp;
    }
    if (fol2Ref.current) {
        fol2Ref.current.rotation.x = Math.sin(time * speed + swayOffset + 1) * (amp * 1.5);
        fol2Ref.current.rotation.z = Math.cos(time * (speed * 0.7) + swayOffset + 1) * (amp * 1.5);
    }
  });

  return (
    <group>
      {/* Trunks - Static relative to sway, but part of the cluster */}
      <Instances range={data.length}>
        <cylinderGeometry args={[0.15, 0.25, 1, 5]} />
        <meshStandardMaterial color="#5c4033" roughness={0.9} />
        {data.map((d, i) => (
          <Instance
            key={`trunk-${i}`}
            position={[d.position[0], d.position[1] + 0.5 * d.scale, d.position[2]]}
            scale={[d.scale, d.scale, d.scale]}
            rotation={[0, d.rotation, 0]}
          />
        ))}
      </Instances>

      {/* Foliage Bottom Layer */}
      <group ref={fol1Ref}>
        <Instances range={data.length}>
            <coneGeometry args={[1.0, 2.0, 7]} />
            <meshStandardMaterial color="#ffffff" roughness={0.8} />
            {data.map((d, i) => (
            <Instance
                key={`fol1-${i}`}
                position={[d.position[0], d.position[1] + 1.5 * d.scale, d.position[2]]}
                scale={[d.scale, d.scale, d.scale]}
                rotation={[0, d.rotation, 0]}
                color={d.color1}
            />
            ))}
        </Instances>
      </group>

      {/* Foliage Top Layer */}
      <group ref={fol2Ref}>
        <Instances range={data.length}>
            <coneGeometry args={[0.7, 1.5, 7]} />
            <meshStandardMaterial color="#ffffff" roughness={0.8} />
            {data.map((d, i) => (
            <Instance
                key={`fol2-${i}`}
                position={[d.position[0], d.position[1] + 2.5 * d.scale, d.position[2]]}
                scale={[d.scale, d.scale, d.scale]}
                rotation={[0, d.rotation + 1, 0]}
                color={d.color2}
            />
            ))}
        </Instances>
      </group>
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
      // Use noise to determine density. Trees grow in groves.
      // noise2D returns -1 to 1.
      // Scale coordinates (0.03) determines the size of the groves.
      const noiseVal = noise2D(x * 0.03, z * 0.03);

      // Threshold: Only place trees in "fertile" areas (noise > -0.2).
      // This creates empty clearings naturally.
      if (noiseVal < -0.2) continue;

      // 2. Path Avoidance
      const pathX = getPathX(z);
      const dist = Math.abs(x - pathX);

      // Probabilistic rejection for organic edge
      // Probability increases as distance increases.
      // 0% chance at dist <= 4, 100% chance at dist >= 14
      const placementProb = Math.max(0, Math.min(1, (dist - 4) / 10));

      // If random roll is greater than probability, skip this tree
      if (Math.random() > placementProb) continue;

      // 3. Placement
      const y = getTerrainHeight(x, z);

      // Log-normal scale distribution for natural variety (many small/medium, few large)
      // Range roughly 0.5 to 2.0
      const scale = 0.5 * Math.exp(Math.random() * 1.3);
      const rotation = Math.random() * Math.PI * 2;

      // Color variation
      const mix = Math.random();
      const variance = 0.9 + Math.random() * 0.2; // 0.9 to 1.1 brightness

      const c1 = baseC1.clone().lerp(baseC2, mix * 0.3).multiplyScalar(variance);
      const c2 = baseC2.clone().lerp(baseC1, mix * 0.3).multiplyScalar(variance);

      data.push({
          position: [x, y, z],
          scale,
          rotation,
          color1: c1,
          color2: c2
      });
    }
    return data;
  }, [region.id, treeCount, region.treeColor1, region.treeColor2]);

  // Split data into 6 chunks for more varied swaying to break synchronization
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

  return (
    <>
      <TreeCluster data={clusters[0]} region={region} swayOffset={0} swaySpeed={0.5} />
      <TreeCluster data={clusters[1]} region={region} swayOffset={2.1} swaySpeed={0.4} />
      <TreeCluster data={clusters[2]} region={region} swayOffset={4.2} swaySpeed={0.6} />
      <TreeCluster data={clusters[3]} region={region} swayOffset={1.1} swaySpeed={0.45} />
      <TreeCluster data={clusters[4]} region={region} swayOffset={3.3} swaySpeed={0.55} />
      <TreeCluster data={clusters[5]} region={region} swayOffset={5.4} swaySpeed={0.35} />
    </>
  );
};

export default Vegetation;
