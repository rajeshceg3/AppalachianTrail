import React, { useMemo } from 'react';
import { Float, Instances, Instance } from '@react-three/drei';
import * as THREE from 'three';
import Controls from './Controls';

const Tree = ({ position, scale = 1, color1, color2 }) => {
  return (
    <group position={position} scale={scale}>
      {/* Trunk */}
      <mesh position={[0, 0.5, 0]}>
        <cylinderGeometry args={[0.15, 0.2, 1, 6]} />
        <meshStandardMaterial color="#4a3728" roughness={0.9} />
      </mesh>
      {/* Foliage - Layer 1 */}
      <mesh position={[0, 1.5, 0]}>
        <coneGeometry args={[0.8, 1.5, 6]} />
        <meshStandardMaterial color={color1} roughness={0.8} />
      </mesh>
      {/* Foliage - Layer 2 */}
      <mesh position={[0, 2.2, 0]}>
        <coneGeometry args={[0.6, 1.2, 6]} />
        <meshStandardMaterial color={color2} roughness={0.8} />
      </mesh>
    </group>
  );
};

const Scene = ({ region }) => {
  const trees = useMemo(() => {
    const count = region.environment === 'forest' ? 100 : 60; // More trees in forest
    return Array.from({ length: count }).map((_, i) => ({
      position: [
        (Math.random() - 0.5) * 60 + (Math.random() > 0.5 ? 8 : -8),
        0,
        (Math.random() - 0.5) * 80
      ],
      scale: 0.8 + Math.random() * 0.8,
      rotation: [0, Math.random() * Math.PI, 0]
    }));
  }, [region.id]);

  const particles = useMemo(() => {
      return Array.from({ length: 30 }).map((_, i) => ({
          position: [
            (Math.random() - 0.5) * 40,
            2 + Math.random() * 5,
            (Math.random() - 0.5) * 40
          ],
          speed: 0.5 + Math.random() * 0.5
      }));
  }, [region.id]);

  return (
    <>
      <Controls />

      {/* Lighting */}
      <ambientLight intensity={0.4} />
      <directionalLight
        position={[10, 15, 10]}
        intensity={1.0}
        castShadow
        shadow-mapSize={[2048, 2048]}
      >
        <orthographicCamera attach="shadow-camera" args={[-30, 30, 30, -30, 0.5, 60]} />
      </directionalLight>

      {/* Ground */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[200, 200, 32, 32]} />
        <meshStandardMaterial color={region.groundColor} roughness={1} />
      </mesh>

      {/* Path */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]} receiveShadow>
        <planeGeometry args={[3, 200]} />
        <meshStandardMaterial color={region.pathColor || '#8b7355'} roughness={0.9} />
      </mesh>

      {/* Trees */}
      {trees.map((props, i) => (
        <Tree
            key={i}
            {...props}
            color1={region.treeColor1}
            color2={region.treeColor2}
        />
      ))}

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
            <sphereGeometry args={[0.03, 8, 8]} />
            <meshBasicMaterial color={region.particles} transparent opacity={0.4} />
          </mesh>
        </Float>
      ))}

      {/* Hero moment marker - soft glow in distance */}
      <mesh position={[0, 0.1, -30]}>
        <cylinderGeometry args={[4, 4, 0.1, 32]} />
        <meshBasicMaterial color="#fffbeb" transparent opacity={0.1} />
      </mesh>
    </>
  );
};

export default Scene;
