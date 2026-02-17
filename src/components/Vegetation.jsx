import React, { useMemo, useRef, useLayoutEffect } from 'react';
import { Instances, Instance } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { getTerrainHeight, getPathX, noise2D, createSeededRandom } from '../utils/terrain';
import { applyWindShader } from '../materials/WindShader';

// Helper to hash string to integer
const hashCode = (s) => {
  let h = 0;
  for(let i = 0; i < s.length; i++)
        h = Math.imul(31, h) + s.charCodeAt(i) | 0;
  return h;
}

const TreeCluster = ({ data, region, swaySpeed, natureRef }) => {
  // Reactive sway based on wind intensity (initial setup)
  // Shader uses uniforms for dynamic updates
  const windIntensity = region.windIntensity || 0.4;
  const speed = swaySpeed * (0.8 + windIntensity);
  const amp = 0.2 * (0.5 + windIntensity * 2.0); // Base magnitude for shader

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
    const nature = natureRef?.current;

    if (foliageMaterial1.userData.update) foliageMaterial1.userData.update(time, nature);
    if (foliageMaterial2.userData.update) foliageMaterial2.userData.update(time, nature);
    if (foliageMaterial3.userData.update) foliageMaterial3.userData.update(time, nature);
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

      {/* Foliage Bottom Layer - Wide Branches */}
      <Instances range={data.length} material={foliageMaterial1}>
        <dodecahedronGeometry args={[1.5, 0]} />
        {data.map((d, i) => (
        <Instance
            key={`fol1-${i}`}
            position={[
              d.position[0] - 1.2 * d.scale * d.tiltZ,
              d.position[1] + 1.2 * d.scale,
              d.position[2] + 1.2 * d.scale * d.tiltX
            ]}
            scale={[d.scale * 1.2, d.scale * 0.5, d.scale * 1.2]}
            rotation={[d.tiltX, d.rotation, d.tiltZ]}
            color={d.color1}
        />
        ))}
      </Instances>

      {/* Foliage Middle Layer - Medium Branches */}
      <Instances range={data.length} material={foliageMaterial2}>
        <dodecahedronGeometry args={[1.1, 0]} />
        {data.map((d, i) => (
        <Instance
            key={`fol2-${i}`}
            position={[
              d.position[0] - 2.2 * d.scale * d.tiltZ,
              d.position[1] + 2.2 * d.scale,
              d.position[2] + 2.2 * d.scale * d.tiltX
            ]}
            scale={[d.scale * 1.0, d.scale * 0.6, d.scale * 1.0]}
            rotation={[d.tiltX, d.rotation + 1, d.tiltZ]}
            color={d.color2}
        />
        ))}
      </Instances>

      {/* Foliage Top Layer - Top Cone/Branches */}
      <Instances range={data.length} material={foliageMaterial3}>
        <dodecahedronGeometry args={[0.8, 0]} />
        {data.map((d, i) => (
        <Instance
            key={`fol3-${i}`}
            position={[
              d.position[0] - 3.2 * d.scale * d.tiltZ,
              d.position[1] + 3.2 * d.scale,
              d.position[2] + 3.2 * d.scale * d.tiltX
            ]}
            scale={[d.scale * 0.8, d.scale * 0.8, d.scale * 0.8]}
            rotation={[d.tiltX, d.rotation + 2, d.tiltZ]}
            color={d.color1}
        />
        ))}
      </Instances>
    </group>
  );
};

const BroadleafCluster = ({ data, region, swaySpeed, natureRef }) => {
  const windIntensity = region.windIntensity || 0.4;
  const speed = swaySpeed * (0.8 + windIntensity);
  const amp = 0.15 * (0.5 + windIntensity * 2.0);

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

  useFrame((state) => {
    const time = state.clock.elapsedTime;
    const nature = natureRef?.current;

    if (foliageMaterial1.userData.update) foliageMaterial1.userData.update(time, nature);
    if (foliageMaterial2.userData.update) foliageMaterial2.userData.update(time, nature);
  });

  return (
    <group>
      {/* Trunks - Stouter */}
      <Instances range={data.length}>
        <cylinderGeometry args={[0.2, 0.3, 1.5, 6]} />
        <meshStandardMaterial color="#5c4033" roughness={0.9} />
        {data.map((d, i) => (
          <Instance
            key={`trunk-${i}`}
            position={[
              d.position[0],
              d.position[1] + 0.75 * d.scale,
              d.position[2]
            ]}
            scale={[d.scale, d.scale, d.scale]}
            rotation={[d.tiltX, d.rotation, d.tiltZ]}
          />
        ))}
      </Instances>

      {/* Foliage Main Clump */}
      <Instances range={data.length} material={foliageMaterial1}>
        <icosahedronGeometry args={[1.5, 0]} />
        {data.map((d, i) => (
        <Instance
            key={`fol1-${i}`}
            position={[
              d.position[0],
              d.position[1] + 2.0 * d.scale,
              d.position[2]
            ]}
            scale={[d.scale, d.scale * 0.8, d.scale]}
            rotation={[d.tiltX, d.rotation, d.tiltZ]}
            color={d.color1}
        />
        ))}
      </Instances>

      {/* Foliage Top Clump */}
      <Instances range={data.length} material={foliageMaterial2}>
        <icosahedronGeometry args={[1.0, 0]} />
        {data.map((d, i) => (
        <Instance
            key={`fol2-${i}`}
            position={[
              d.position[0],
              d.position[1] + 3.0 * d.scale,
              d.position[2]
            ]}
            scale={[d.scale, d.scale, d.scale]}
            rotation={[d.tiltX, d.rotation + 1, d.tiltZ]}
            color={d.color2}
        />
        ))}
      </Instances>
    </group>
  );
};

const Vegetation = ({ region, natureRef }) => {
  const treeCount = region.environment === 'forest' ? 2500 : 1000;

  const { conifer, broadleaf } = useMemo(() => {
    const conifer = [];
    const broadleaf = [];
    let attempts = 0;
    const maxAttempts = treeCount * 10;

    const seed = hashCode(region.id || 'default');
    const rng = createSeededRandom(seed);

    const baseC1 = new THREE.Color(region.treeColor1);
    const baseC2 = new THREE.Color(region.treeColor2);

    while ((conifer.length + broadleaf.length) < treeCount && attempts < maxAttempts) {
      attempts++;

      const z = (rng() - 0.5) * 600;
      const x = (rng() - 0.5) * 600;

      const noiseVal = noise2D(x * 0.03, z * 0.03);
      if (noiseVal < -0.2) continue;

      const pathX = getPathX(z);
      const dist = Math.abs(x - pathX);
      const placementProb = Math.max(0, Math.min(1, (dist - 4) / 10));

      if (rng() > placementProb) continue;

      // Sink deeper to hide intersection
      const y = getTerrainHeight(x, z) - (0.1 + rng() * 0.3);
      const scale = 0.5 * Math.exp(rng() * 1.3);
      const rotation = rng() * Math.PI * 2;
      const tiltX = (rng() - 0.5) * 0.2;
      const tiltZ = (rng() - 0.5) * 0.2;

      const mix = rng();
      const variance = 0.9 + rng() * 0.2;
      const hueShift = (rng() - 0.5) * 0.08; // Subtle hue shift

      const c1 = baseC1.clone().lerp(baseC2, mix * 0.3).multiplyScalar(variance).offsetHSL(hueShift, 0, 0);
      const c2 = baseC2.clone().lerp(baseC1, mix * 0.3).multiplyScalar(variance).offsetHSL(hueShift, 0, 0);

      const tree = {
          position: [x, y, z],
          scale,
          rotation,
          tiltX,
          tiltZ,
          color1: c1,
          color2: c2
      };

      // Determine type based on region and randomness
      // Default to 70% conifer, 30% broadleaf
      // Adjust per region if needed (hardcoded for now to prove concept)
      if (rng() > 0.3) {
        conifer.push(tree);
      } else {
        broadleaf.push(tree);
      }
    }
    return { conifer, broadleaf };
  }, [region.id, treeCount, region.treeColor1, region.treeColor2]);

  // Split conifer data into chunks for variety
  const coniferClusters = useMemo(() => {
    if (!conifer) return [[], [], [], []];
    const chunkSize = Math.ceil(conifer.length / 4);
    return [
        conifer.slice(0, chunkSize),
        conifer.slice(chunkSize, chunkSize * 2),
        conifer.slice(chunkSize * 2, chunkSize * 3),
        conifer.slice(chunkSize * 3)
    ];
  }, [conifer]);

  // Split broadleaf data
  const broadleafClusters = useMemo(() => {
    if (!broadleaf) return [[], []];
    const chunkSize = Math.ceil(broadleaf.length / 2);
    return [
        broadleaf.slice(0, chunkSize),
        broadleaf.slice(chunkSize)
    ];
  }, [broadleaf]);

  return (
    <>
      <TreeCluster data={coniferClusters[0]} region={region} swaySpeed={0.5} natureRef={natureRef} />
      <TreeCluster data={coniferClusters[1]} region={region} swaySpeed={0.4} natureRef={natureRef} />
      <TreeCluster data={coniferClusters[2]} region={region} swaySpeed={0.6} natureRef={natureRef} />
      <TreeCluster data={coniferClusters[3]} region={region} swaySpeed={0.45} natureRef={natureRef} />

      <BroadleafCluster data={broadleafClusters[0]} region={region} swaySpeed={0.55} natureRef={natureRef} />
      <BroadleafCluster data={broadleafClusters[1]} region={region} swaySpeed={0.35} natureRef={natureRef} />
    </>
  );
};

export default Vegetation;
