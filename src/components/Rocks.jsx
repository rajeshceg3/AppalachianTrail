import React, { useMemo } from 'react';
import { Instances, Instance } from '@react-three/drei';
import * as THREE from 'three';
import { getTerrainHeight, getPathX, noise2D, createSeededRandom, getMinTerrainHeight } from '../utils/terrain';
import { generateHeightMap, generateNormalMap } from '../utils/textureGenerator';
import { applyRockShader } from '../materials/RockShader';

// Helper to hash string to integer
const hashCode = (s) => {
  let h = 0;
  for(let i = 0; i < s.length; i++)
        h = Math.imul(31, h) + s.charCodeAt(i) | 0;
  return h;
}

const Rocks = ({ region }) => {
  const geoParams = region.geologyParams || { rockCount: 1.0, hasMinerals: false };
  const baseRockCount = 1200;
  const rockCount = Math.floor(baseRockCount * geoParams.rockCount);
  const pebbleCount = rockCount * 3; // More pebbles
  const mineralCount = geoParams.hasMinerals ? 200 : 0;

  const { rocks, pebbles, minerals } = useMemo(() => {
    const rocks = [];
    const pebbles = [];
    const minerals = [];
    let attempts = 0;
    const maxAttempts = (rockCount + pebbleCount + mineralCount) * 10;

    // Create a seeded RNG based on region ID (offset by 1 to differ from trees)
    const seed = hashCode(region.id || 'default') + 1;
    const rng = createSeededRandom(seed);

    // Generate Large Rocks
    while (rocks.length < rockCount && attempts < maxAttempts) {
      attempts++;

      const z = (rng() - 0.5) * 1200;
      const x = (rng() - 0.5) * 1200;

      // Noise clustering
      const noiseVal = noise2D(x * 0.1, z * 0.1);

      // Soft probability ramp (transition -0.3 to 0.2)
      const noiseProb = THREE.MathUtils.smoothstep(-0.3, 0.2, noiseVal);

      const pathX = getPathX(z);
      const dist = Math.abs(x - pathX);

      // Soft clearing around path (2.5 to 5.0 units)
      const pathProb = THREE.MathUtils.smoothstep(2.5, 5.0, dist);

      const finalProb = noiseProb * pathProb;

      if (rng() > finalProb) continue;

      // Scale
      const baseScale = 0.3 + rng() * 1.2;
      const scale = [
          baseScale * (0.7 + rng() * 0.6),
          baseScale * (0.7 + rng() * 0.6),
          baseScale * (0.7 + rng() * 0.6)
      ];

      // Grounding: Sample minimum height within the rock's footprint
      // Rock radius is approx 1.0 * scale[0] (icosahedron radius 1)
      const radius = scale[0];
      const minH = getMinTerrainHeight(x, z, radius, region.terrainParams);

      const rotation = [
        rng() * Math.PI * 2,
        rng() * Math.PI * 2,
        rng() * Math.PI * 2
      ];

      // Embed deep: Use minH minus a significant portion of height to look buried
      // Center at minH - 0.3 * height (radius)
      const yPos = minH - (0.3 * scale[1]);

      rocks.push({ position: [x, yPos, z], scale, rotation });
    }

    // Generate Pebbles (scattered more freely, even on path edges)
    attempts = 0;
    while (pebbles.length < pebbleCount && attempts < maxAttempts) {
        attempts++;
        const z = (rng() - 0.5) * 1200;
        const x = (rng() - 0.5) * 1200;

        // Less strict clustering
        const noiseVal = noise2D(x * 0.15, z * 0.15);

        // Soft probability ramp (-0.4 to 0.0)
        const noiseProb = THREE.MathUtils.smoothstep(-0.4, 0.0, noiseVal);

        const pathX = getPathX(z);
        const dist = Math.abs(x - pathX);

        // Soft clearing around path (1.5 to 3.5 units) - pebbles can be closer
        const pathProb = THREE.MathUtils.smoothstep(1.5, 3.5, dist);

        const finalProb = noiseProb * pathProb;

        if (rng() > finalProb) continue;

        const y = getTerrainHeight(x, z, region.terrainParams);
        const baseScale = 0.05 + rng() * 0.15; // Small
        const scale = [
            baseScale * (0.8 + rng() * 0.4),
            baseScale * (0.8 + rng() * 0.4),
            baseScale * (0.8 + rng() * 0.4)
        ];
        const rotation = [rng() * 6, rng() * 6, rng() * 6];
        // Sit on top
        const yPos = y - (0.1 * scale[1]);

        pebbles.push({ position: [x, yPos, z], scale, rotation });
    }

    // Generate Minerals
    attempts = 0;
    while (minerals.length < mineralCount && attempts < maxAttempts) {
        attempts++;
        const z = (rng() - 0.5) * 1200;
        const x = (rng() - 0.5) * 1200;

        const noiseVal = noise2D(x * 0.2, z * 0.2); // Tighter clusters for crystals
        const noiseProb = THREE.MathUtils.smoothstep(-0.2, 0.4, noiseVal);

        const pathX = getPathX(z);
        const dist = Math.abs(x - pathX);
        const pathProb = THREE.MathUtils.smoothstep(1.5, 5.0, dist); // Can be closer to path

        const finalProb = noiseProb * pathProb;

        if (rng() > finalProb) continue;

        const baseScale = 0.2 + rng() * 0.4;
        const scale = [
            baseScale * (0.8 + rng() * 0.4),
            baseScale * (2.0 + rng() * 2.0), // Taller crystals
            baseScale * (0.8 + rng() * 0.4)
        ];

        const radius = scale[0];
        const minH = getMinTerrainHeight(x, z, radius, region.terrainParams);

        // Pointing generally up
        const rotation = [
            (rng() - 0.5) * 0.4,
            rng() * Math.PI * 2,
            (rng() - 0.5) * 0.4
        ];

        const yPos = minH - (0.1 * scale[1]); // Sit mostly on top, slightly buried

        minerals.push({ position: [x, yPos, z], scale, rotation });
    }

    return { rocks, pebbles, minerals };
  }, [region.id, rockCount, pebbleCount, mineralCount, region.terrainParams]);

  const { roughnessMap, normalMap } = useMemo(() => {
    const rMap = generateHeightMap(256, 256, 4.0, 4);
    const nMap = generateNormalMap(256, 256, 4.0, 4, 3.0, rMap.userData.imageData);
    return {
        roughnessMap: rMap,
        normalMap: nMap
    };
  }, []);

  const rockMaterial = useMemo(() => {
    const m = new THREE.MeshStandardMaterial({
        color: "#57534e",
        roughness: 0.9,
        roughnessMap: roughnessMap,
        normalMap: normalMap,
        normalScale: new THREE.Vector2(1, 1),
        flatShading: false
    });
    applyRockShader(m, 0.25); // Apply vertex displacement
    return m;
  }, [roughnessMap, normalMap]);

  React.useEffect(() => {
    return () => {
      roughnessMap.dispose();
      normalMap.dispose();
      rockMaterial.dispose();
    };
  }, [roughnessMap, normalMap, rockMaterial]);

  return (
    <>
        {/* Large Rocks */}
        <Instances range={rockCount} material={rockMaterial}>
          <icosahedronGeometry args={[1, 0]} />
          {rocks.map((d, i) => (
              <Instance
              key={`rock-${i}`}
              position={d.position}
              scale={d.scale}
              rotation={d.rotation}
              />
          ))}
        </Instances>

        {/* Pebbles */}
        <Instances range={pebbleCount}>
          <icosahedronGeometry args={[1, 0]} />
          <meshStandardMaterial
              color="#6b655f"
              roughness={1.0}
              flatShading={true}
          />
          {pebbles.map((d, i) => (
              <Instance
              key={`peb-${i}`}
              position={d.position}
              scale={d.scale}
              rotation={d.rotation}
              />
          ))}
        </Instances>

        {/* Minerals / Crystals */}
        {mineralCount > 0 && (
          <Instances range={mineralCount}>
            <octahedronGeometry args={[1, 0]} />
            <meshStandardMaterial
                color="#00ffff"
                emissive="#00ffff"
                emissiveIntensity={2.0}
                roughness={0.2}
                metalness={0.8}
            />
            {minerals.map((d, i) => (
                <Instance
                key={`min-${i}`}
                position={d.position}
                scale={d.scale}
                rotation={d.rotation}
                />
            ))}
          </Instances>
        )}
    </>
  );
};

export default Rocks;
