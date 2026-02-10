import React, { useMemo } from 'react';
import { Instances, Instance } from '@react-three/drei';
import { getTerrainHeight, getPathX, noise2D } from '../utils/terrain';

const Rocks = ({ region }) => {
  // More rocks in rocky regions (Maine, New England)
  const isRocky = region.id === 'maine' || region.id === 'new-england';
  const rockCount = isRocky ? 1000 : 300;

  const rockData = useMemo(() => {
    const data = [];
    let attempts = 0;
    const maxAttempts = rockCount * 20;

    while (data.length < rockCount && attempts < maxAttempts) {
      attempts++;

      // Spread rocks over the full terrain area
      const z = (Math.random() - 0.5) * 600;
      const x = (Math.random() - 0.5) * 600;

      // Noise clustering for natural rock formations
      // Higher frequency (0.1) than trees creates smaller, tighter clusters
      const noiseVal = noise2D(x * 0.1, z * 0.1);

      // Threshold: Rocks appear in patches
      if (noiseVal < -0.1) continue;

      const pathX = getPathX(z);
      const dist = Math.abs(x - pathX);

      // Probabilistic path avoidance
      const prob = Math.max(0, Math.min(1, (dist - 3) / 6));
      if (Math.random() > prob) continue;

      // Get terrain height
      const y = getTerrainHeight(x, z);

      // Random non-uniform scale for organic look
      const baseScale = 0.3 + Math.random() * 1.2;
      // Vary x, y, z scales independently by +/- 20-30%
      const scale = [
          baseScale * (0.7 + Math.random() * 0.6),
          baseScale * (0.7 + Math.random() * 0.6),
          baseScale * (0.7 + Math.random() * 0.6)
      ];

      // Random rotation
      const rotation = [
        Math.random() * Math.PI * 2,
        Math.random() * Math.PI * 2,
        Math.random() * Math.PI * 2
      ];

      // Embed in ground to look natural (not floating)
      // Embed based on the Y scale to ensure it's anchored
      const yPos = y - (0.4 * scale[1]);

      data.push({ position: [x, yPos, z], scale, rotation });
    }
    return data;
  }, [region.id, rockCount]);

  return (
    <Instances range={rockCount}>
      <icosahedronGeometry args={[1, 0]} />
      <meshStandardMaterial color="#57534e" roughness={0.9} flatShading />
      {rockData.map((d, i) => (
        <Instance
          key={`rock-${i}`}
          position={d.position}
          scale={d.scale}
          rotation={d.rotation}
        />
      ))}
    </Instances>
  );
};

export default Rocks;
