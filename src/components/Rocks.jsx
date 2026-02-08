import React, { useMemo } from 'react';
import { Instances, Instance } from '@react-three/drei';
import { createNoise2D } from 'simplex-noise';
import { getTerrainHeight, getPathX } from '../utils/terrain';

// Independent noise instance for rock distribution
const noise2D = createNoise2D(Math.random);

const Rocks = ({ region }) => {
  // More rocks in rocky regions (Maine, New England)
  const isRocky = region.id === 'maine' || region.id === 'new-england';
  const rockCount = isRocky ? 250 : 80;

  const rockData = useMemo(() => {
    const data = [];
    let attempts = 0;
    const maxAttempts = rockCount * 20;

    while (data.length < rockCount && attempts < maxAttempts) {
      attempts++;

      // Spread along Z and X
      const z = (Math.random() - 0.5) * 250;
      const x = (Math.random() - 0.5) * 150;

      // Noise clustering for natural rock formations
      // Higher frequency (0.1) than trees creates smaller, tighter clusters
      const noiseVal = noise2D(x * 0.1, z * 0.1);

      // Threshold: Rocks appear in patches
      if (noiseVal < -0.1) continue;

      const pathX = getPathX(z);
      const dist = Math.abs(x - pathX);

      // Avoid path
      if (dist < 4) continue;

      // Get terrain height
      const y = getTerrainHeight(x, z);

      // Random scale with more variety
      const scale = 0.3 + Math.random() * 1.5; // 0.3 to 1.8

      // Random rotation
      const rotation = [
        Math.random() * Math.PI * 2,
        Math.random() * Math.PI * 2,
        Math.random() * Math.PI * 2
      ];

      // Embed in ground to look natural (not floating)
      // Larger rocks are buried deeper
      const yPos = y - (0.3 * scale);

      data.push({ position: [x, yPos, z], scale, rotation });
    }
    return data;
  }, [region.id, rockCount]);

  return (
    <Instances range={rockCount}>
      <dodecahedronGeometry args={[1, 0]} />
      <meshStandardMaterial color="#57534e" roughness={0.9} flatShading />
      {rockData.map((d, i) => (
        <Instance
          key={`rock-${i}`}
          position={d.position}
          scale={[d.scale, d.scale, d.scale]}
          rotation={d.rotation}
        />
      ))}
    </Instances>
  );
};

export default Rocks;
