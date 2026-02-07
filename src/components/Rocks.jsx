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

      // Random X
      let x = (Math.random() - 0.5) * 120;

      // Avoid path
      const dist = Math.abs(x - pathX);
      if (dist < 3) {
         if (x > pathX) x += 3;
         else x -= 3;
      }

      const y = getTerrainHeight(x, z);

      // Random scale 0.4 - 1.0
      const scale = 0.4 + Math.random() * 0.6;

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
