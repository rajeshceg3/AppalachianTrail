import React, { useMemo } from 'react';
import { Float, Instances, Instance, SoftShadows } from '@react-three/drei';
import * as THREE from 'three';
import Controls from './Controls';
import Terrain from './Terrain';
import Path from './Path';
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
      const scale = 0.8 + Math.random() * 0.7;
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

const Scene = ({ region }) => {
  // Particles for atmosphere
  const particles = useMemo(() => {
      return Array.from({ length: 40 }).map((_, i) => ({
          position: [
            (Math.random() - 0.5) * 60,
            2 + Math.random() * 5,
            (Math.random() - 0.5) * 60
          ],
          speed: 0.2 + Math.random() * 0.3
      }));
  }, [region.id]);

  return (
    <>
      <Controls />
      <fogExp2 attach="fog" args={[region.fogColor, region.fogDensity]} />
      <SoftShadows size={25} samples={10} focus={0.5} />

      {/* Lighting */}
      <ambientLight intensity={0.5} />
      <directionalLight
        position={[20, 30, 10]}
        intensity={1.2}
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-bias={-0.0001}
      >
        <orthographicCamera attach="shadow-camera" args={[-50, 50, 50, -50, 0.5, 100]} />
      </directionalLight>

      <Terrain color={region.groundColor} />
      <Path color={region.pathColor || '#8b7355'} />

      <Vegetation region={region} />

      {/* Atmospheric particles */}
      {particles.map((props, i) => (
        <Float
          key={i}
          speed={props.speed}
          rotationIntensity={0.5}
          floatIntensity={0.5}
          position={props.position}
        >
          <mesh>
            <sphereGeometry args={[0.04, 6, 6]} />
            <meshBasicMaterial color={region.particles} transparent opacity={0.3} />
          </mesh>
        </Float>
      ))}

      {/* Hero moment marker - positioned relative to terrain */}
      <mesh position={[0, getTerrainHeight(0, -40) + 0.1, -40]}>
        <cylinderGeometry args={[4, 4, 0.1, 32]} />
        <meshBasicMaterial color="#fffbeb" transparent opacity={0.1} />
      </mesh>
    </>
  );
};

export default Scene;
