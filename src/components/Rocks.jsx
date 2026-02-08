import React, { useMemo } from 'react';
import { Instances, Instance } from '@react-three/drei';
import { getTerrainHeight, getPathX } from '../utils/terrain';

const Rocks = ({ region }) => {
  // More rocks in rocky regions (Maine, New England)
  const isRocky = region.id === 'maine' || region.id === 'new-england';
  const rockCount = isRocky ? 150 : 50;

  const rockData = useMemo(() => {
    const data = [];
    for (let i = 0; i < rockCount; i++) {
      // Spread along Z
      const z = (Math.random() - 0.5) * 200;
      const pathX = getPathX(z);

      // Random X with rejection sampling to avoid path
      let x, dist;
      let attempts = 0;
      do {
        x = (Math.random() - 0.5) * 120;
        dist = Math.abs(x - pathX);
        attempts++;
      } while (dist < 3 && attempts < 10);

      // Fallback
      if (dist < 3) {
         if (x > pathX) x = pathX + 3 + Math.random();
         else x = pathX - 3 - Math.random();
      }

      const y = getTerrainHeight(x, z);

      // Random scale 0.5 - 1.5
      const scale = 0.5 + Math.random() * 1.0;

      // Random rotation
      const rotation = [
        Math.random() * Math.PI,
        Math.random() * Math.PI,
        Math.random() * Math.PI
      ];

      // Embed in ground slightly
      const yPos = y - (0.2 * scale);

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
