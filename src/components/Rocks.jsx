import React, { useMemo } from 'react';
import { Instances, Instance } from '@react-three/drei';
import { getTerrainHeight, getPathX } from '../utils/terrain';

const Rocks = ({ region }) => {
  const rockCount = region.environment === 'alpine' ? 200 : 50; // More rocks in alpine/Maine

  const rockData = useMemo(() => {
    const data = [];
    for (let i = 0; i < rockCount; i++) {
      // Spread rocks along a long strip of Z
      const z = (Math.random() - 0.5) * 200;
      const pathX = getPathX(z);

      // Random X, but avoid path slightly less strictly than trees
      let x = (Math.random() - 0.5) * 120;

      // If too close to path, push it away
      const dist = Math.abs(x - pathX);
      if (dist < 2.5) {
         if (x > pathX) x += 2.5;
         else x -= 2.5;
      }

      const y = getTerrainHeight(x, z);
      const scale = 0.2 + Math.random() * 0.5; // Small to medium rocks
      const rotation = [
        Math.random() * Math.PI,
        Math.random() * Math.PI,
        Math.random() * Math.PI
      ];

      data.push({ position: [x, y, z], scale, rotation });
    }
    return data;
  }, [region.id, rockCount]);

  return (
    <Instances range={rockCount}>
      <dodecahedronGeometry args={[1, 0]} />
      <meshStandardMaterial color={region.groundColor} roughness={0.9} />
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
