import React, { useMemo, useRef } from 'react';
import { Instances, Instance } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { getTerrainHeight, getPathX } from '../utils/terrain';

const TreeCluster = ({ data, region, swayOffset, swaySpeed }) => {
  const fol1Ref = useRef();
  const fol2Ref = useRef();

  useFrame((state) => {
    const time = state.clock.elapsedTime;
    // Independent sway per cluster
    if (fol1Ref.current) {
        fol1Ref.current.rotation.x = Math.sin(time * swaySpeed + swayOffset) * 0.02;
        fol1Ref.current.rotation.z = Math.cos(time * (swaySpeed * 0.6) + swayOffset) * 0.02;
    }
    if (fol2Ref.current) {
        fol2Ref.current.rotation.x = Math.sin(time * swaySpeed + swayOffset + 1) * 0.03;
        fol2Ref.current.rotation.z = Math.cos(time * (swaySpeed * 0.6) + swayOffset + 1) * 0.03;
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
            <meshStandardMaterial color={region.treeColor1} roughness={0.8} />
            {data.map((d, i) => (
            <Instance
                key={`fol1-${i}`}
                position={[d.position[0], d.position[1] + 1.5 * d.scale, d.position[2]]}
                scale={[d.scale, d.scale, d.scale]}
                rotation={[0, d.rotation, 0]}
            />
            ))}
        </Instances>
      </group>

      {/* Foliage Top Layer */}
      <group ref={fol2Ref}>
        <Instances range={data.length}>
            <coneGeometry args={[0.7, 1.5, 7]} />
            <meshStandardMaterial color={region.treeColor2} roughness={0.8} />
            {data.map((d, i) => (
            <Instance
                key={`fol2-${i}`}
                position={[d.position[0], d.position[1] + 2.5 * d.scale, d.position[2]]}
                scale={[d.scale, d.scale, d.scale]}
                rotation={[0, d.rotation + 1, 0]}
            />
            ))}
        </Instances>
      </group>
    </group>
  );
};

const Vegetation = ({ region }) => {
  const treeCount = region.environment === 'forest' ? 400 : 150;

  const treeData = useMemo(() => {
    const data = [];
    for (let i = 0; i < treeCount; i++) {
      // Spread trees along a long strip of Z
      const z = (Math.random() - 0.5) * 200;
      const pathX = getPathX(z);

      // Random X, but avoid path using rejection sampling
      let x, dist;
      let attempts = 0;

      do {
        x = (Math.random() - 0.5) * 120;
        dist = Math.abs(x - pathX);
        attempts++;
      } while (dist < 4 && attempts < 10);

      // Fallback if placement failed (rare)
      if (dist < 4) {
         if (x > pathX) x = pathX + 4 + Math.random() * 2;
         else x = pathX - 4 - Math.random() * 2;
      }

      const y = getTerrainHeight(x, z);

      // Enhanced: Randomize scale
      const scale = 0.5 + Math.random() * 1.0; // 0.5 to 1.5
      const rotation = Math.random() * Math.PI * 2;

      data.push({ position: [x, y, z], scale, rotation });
    }
    return data;
  }, [region.id, treeCount]);

  // Split data into 3 chunks for varied swaying
  const clusters = useMemo(() => {
    const chunkSize = Math.ceil(treeData.length / 3);
    return [
        treeData.slice(0, chunkSize),
        treeData.slice(chunkSize, chunkSize * 2),
        treeData.slice(chunkSize * 2)
    ];
  }, [treeData]);

  return (
    <>
      <TreeCluster data={clusters[0]} region={region} swayOffset={0} swaySpeed={0.5} />
      <TreeCluster data={clusters[1]} region={region} swayOffset={2} swaySpeed={0.4} />
      <TreeCluster data={clusters[2]} region={region} swayOffset={4} swaySpeed={0.6} />
    </>
  );
};

export default Vegetation;
