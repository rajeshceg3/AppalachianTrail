import React, { useMemo } from 'react';
import { Instances, Instance } from '@react-three/drei';
import { getTerrainHeight, getPathX } from '../utils/terrain';

const Vegetation = ({ region }) => {
  const treeCount = region.environment === 'forest' ? 400 : 150;

  const treeData = useMemo(() => {
    const data = [];
    for (let i = 0; i < treeCount; i++) {
      // Spread trees along a long strip of Z
      const z = (Math.random() - 0.5) * 200;
      const pathX = getPathX(z);

      // Random X, but avoid path
      let x = (Math.random() - 0.5) * 120;

      // If too close to path, push it away
      const dist = Math.abs(x - pathX);
      if (dist < 4) {
         if (x > pathX) x += 4;
         else x -= 4;
      }

      const y = getTerrainHeight(x, z);

      // Enhanced: Randomize scale
      const scale = 0.5 + Math.random() * 1.0; // 0.5 to 1.5
      const rotation = Math.random() * Math.PI * 2;

      data.push({ position: [x, y, z], scale, rotation });
    }
    return data;
  }, [region.id, treeCount]);

  return (
    <group>
      {/* Trunks */}
      <Instances range={treeCount}>
        <cylinderGeometry args={[0.15, 0.25, 1, 5]} />
        <meshStandardMaterial color="#5c4033" roughness={0.9} />
        {treeData.map((d, i) => (
          <Instance
            key={`trunk-${i}`}
            position={[d.position[0], d.position[1] + 0.5 * d.scale, d.position[2]]}
            scale={[d.scale, d.scale, d.scale]}
            rotation={[0, d.rotation, 0]}
          />
        ))}
      </Instances>

      {/* Foliage Bottom Layer */}
      <Instances range={treeCount}>
        <coneGeometry args={[1.0, 2.0, 7]} />
        <meshStandardMaterial color={region.treeColor1} roughness={0.8} />
        {treeData.map((d, i) => (
          <Instance
            key={`fol1-${i}`}
            position={[d.position[0], d.position[1] + 1.5 * d.scale, d.position[2]]}
            scale={[d.scale, d.scale, d.scale]}
            rotation={[0, d.rotation, 0]}
          />
        ))}
      </Instances>

      {/* Foliage Top Layer */}
      <Instances range={treeCount}>
        <coneGeometry args={[0.7, 1.5, 7]} />
        <meshStandardMaterial color={region.treeColor2} roughness={0.8} />
        {treeData.map((d, i) => (
          <Instance
            key={`fol2-${i}`}
            position={[d.position[0], d.position[1] + 2.5 * d.scale, d.position[2]]}
            scale={[d.scale, d.scale, d.scale]}
            rotation={[0, d.rotation + 1, 0]}
          />
        ))}
      </Instances>
    </group>
  );
};

export default Vegetation;
