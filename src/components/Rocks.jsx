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

  const logCount = geoParams.hasLogs ? 150 : 0;
  const driftwoodCount = geoParams.hasDriftwood ? 150 : 0;
  const debrisCount = geoParams.hasDebris ? 250 : 0;
  const floatingIslandCount = geoParams.floatingIslands ? 15 : 0;
  const utilityLineCount = geoParams.hasUtilityLines ? 80 : 0;

  const { rocks, pebbles, minerals, logs, driftwood, debris, floatingIslands, utilityLines } = useMemo(() => {
    const rocks = [];
    const pebbles = [];
    const minerals = [];
    const logs = [];
    const driftwood = [];
    const debris = [];
    const floatingIslands = [];
    const utilityLines = [];
    let attempts = 0;
    const maxAttempts = (rockCount + pebbleCount + mineralCount + logCount + driftwoodCount + debrisCount + floatingIslandCount + utilityLineCount) * 10;

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

    // Generate Logs
    attempts = 0;
    while (logs.length < logCount && attempts < maxAttempts) {
        attempts++;
        const z = (rng() - 0.5) * 1200;
        const x = (rng() - 0.5) * 1200;

        const pathX = getPathX(z);
        const dist = Math.abs(x - pathX);
        if (dist < 4.0) continue; // Keep clear of path

        const baseScale = 0.5 + rng() * 1.0;
        const scale = [
            baseScale * 0.4,
            baseScale * (2.0 + rng() * 3.0), // Length
            baseScale * 0.4
        ];

        const radius = scale[0];
        const minH = getMinTerrainHeight(x, z, radius, region.terrainParams);
        const yPos = minH + (scale[0] * 0.5); // Lying on the ground

        const rotation = [
            Math.PI / 2 + (rng() - 0.5) * 0.4, // Mostly flat
            rng() * Math.PI * 2,
            (rng() - 0.5) * 0.4
        ];

        logs.push({ position: [x, yPos, z], scale, rotation });
    }

    // Generate Driftwood
    attempts = 0;
    while (driftwood.length < driftwoodCount && attempts < maxAttempts) {
        attempts++;
        const z = (rng() - 0.5) * 1200;
        const x = (rng() - 0.5) * 1200;

        const y = getTerrainHeight(x, z, region.terrainParams);
        const seaLevel = region.terrainParams.baseHeight || 0;
        // Driftwood mostly near the shore
        if (y > seaLevel + 3.0 || y < seaLevel - 1.0) continue;

        const pathX = getPathX(z);
        const dist = Math.abs(x - pathX);
        if (dist < 3.0) continue;

        const baseScale = 0.4 + rng() * 0.8;
        const scale = [
            baseScale * 0.3,
            baseScale * (1.5 + rng() * 2.0),
            baseScale * 0.3
        ];

        const yPos = y + (scale[0] * 0.4);

        const rotation = [
            Math.PI / 2 + (rng() - 0.5) * 0.3,
            rng() * Math.PI * 2,
            (rng() - 0.5) * 0.3
        ];

        driftwood.push({ position: [x, yPos, z], scale, rotation });
    }

    // Generate Debris (concrete chunks, rebar, etc)
    attempts = 0;
    while (debris.length < debrisCount && attempts < maxAttempts) {
        attempts++;
        const z = (rng() - 0.5) * 1200;
        const x = (rng() - 0.5) * 1200;

        const pathX = getPathX(z);
        const dist = Math.abs(x - pathX);
        if (dist < 2.0) continue;

        const baseScale = 0.3 + rng() * 1.5;
        const scale = [
            baseScale * (0.5 + rng() * 0.8),
            baseScale * (0.5 + rng() * 0.8),
            baseScale * (0.5 + rng() * 0.8)
        ];

        const minH = getMinTerrainHeight(x, z, scale[0], region.terrainParams);
        const yPos = minH - (0.2 * scale[1]); // Slightly buried

        const rotation = [rng() * 6, rng() * 6, rng() * 6];

        debris.push({ position: [x, yPos, z], scale, rotation });
    }

    // Generate Floating Islands
    attempts = 0;
    while (floatingIslands.length < floatingIslandCount && attempts < maxAttempts) {
        attempts++;
        const z = (rng() - 0.5) * 800; // Keep slightly more central
        const x = (rng() - 0.5) * 800;

        const pathX = getPathX(z);
        const dist = Math.abs(x - pathX);
        if (dist < 10.0) continue; // Don't float directly over the main path

        const baseScale = 2.0 + rng() * 4.0;
        const scale = [
            baseScale * (0.8 + rng() * 0.4),
            baseScale * (0.4 + rng() * 0.4), // Flatter
            baseScale * (0.8 + rng() * 0.4)
        ];

        const minH = getMinTerrainHeight(x, z, scale[0], region.terrainParams);
        // Float 15 to 35 units above the ground
        const yPos = minH + 15.0 + (rng() * 20.0);

        const rotation = [rng() * 0.5, rng() * Math.PI * 2, rng() * 0.5];

        floatingIslands.push({ position: [x, yPos, z], scale, rotation });
    }

    // Generate Utility Lines (Pipes)
    attempts = 0;
    while (utilityLines.length < utilityLineCount && attempts < maxAttempts) {
        attempts++;
        const z = (rng() - 0.5) * 1200;
        const x = (rng() - 0.5) * 1200;

        const baseScale = 0.5 + rng() * 0.5;
        const scale = [
            baseScale * 0.2, // thin radius
            baseScale * (5.0 + rng() * 10.0), // long length
            baseScale * 0.2
        ];

        const minH = getMinTerrainHeight(x, z, scale[1] / 2, region.terrainParams);
        // Sometimes buried, sometimes sticking out
        const yPos = minH + (rng() - 0.5) * 1.5;

        // Often lying flat or slightly angled
        const rotation = [
            Math.PI / 2 + (rng() - 0.5) * 0.2,
            rng() * Math.PI * 2,
            0
        ];

        utilityLines.push({ position: [x, yPos, z], scale, rotation });
    }

    return { rocks, pebbles, minerals, logs, driftwood, debris, floatingIslands, utilityLines };
  }, [region.id, rockCount, pebbleCount, mineralCount, logCount, driftwoodCount, debrisCount, floatingIslandCount, utilityLineCount, region.terrainParams]);

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

        {/* Logs */}
        {logCount > 0 && (
          <Instances range={logCount}>
            <cylinderGeometry args={[1, 1, 1, 7]} />
            <meshStandardMaterial
                color="#4a3b2c"
                roughness={0.9}
            />
            {logs.map((d, i) => (
                <Instance
                key={`log-${i}`}
                position={d.position}
                scale={d.scale}
                rotation={d.rotation}
                />
            ))}
          </Instances>
        )}

        {/* Driftwood */}
        {driftwoodCount > 0 && (
          <Instances range={driftwoodCount}>
            <cylinderGeometry args={[1, 0.7, 1, 6]} />
            <meshStandardMaterial
                color="#b5aead"
                roughness={0.8}
            />
            {driftwood.map((d, i) => (
                <Instance
                key={`drift-${i}`}
                position={d.position}
                scale={d.scale}
                rotation={d.rotation}
                />
            ))}
          </Instances>
        )}

        {/* Debris */}
        {debrisCount > 0 && (
          <Instances range={debrisCount}>
            <boxGeometry args={[1, 1, 1]} />
            <meshStandardMaterial
                color="#595959"
                roughness={0.7}
            />
            {debris.map((d, i) => (
                <Instance
                key={`deb-${i}`}
                position={d.position}
                scale={d.scale}
                rotation={d.rotation}
                />
            ))}
          </Instances>
        )}

        {/* Floating Islands */}
        {floatingIslandCount > 0 && (
          <Instances range={floatingIslandCount} material={rockMaterial}>
            <icosahedronGeometry args={[1, 0]} />
            {floatingIslands.map((d, i) => (
                <Instance
                key={`float-${i}`}
                position={d.position}
                scale={d.scale}
                rotation={d.rotation}
                />
            ))}
          </Instances>
        )}

        {/* Utility Lines (Pipes) */}
        {utilityLineCount > 0 && (
          <Instances range={utilityLineCount}>
            <cylinderGeometry args={[1, 1, 1, 8]} />
            <meshStandardMaterial
                color="#475569" // slate grey metal
                roughness={0.6}
                metalness={0.3}
            />
            {utilityLines.map((d, i) => (
                <Instance
                key={`util-${i}`}
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
