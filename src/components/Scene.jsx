import React, { useMemo } from 'react';
import { Float, Instances, Instance } from '@react-three/drei';
import * as THREE from 'three';

const Tree = ({ position, scale = 1 }) => {
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
        <meshStandardMaterial color="#2d3a22" roughness={0.8} />
      </mesh>
      {/* Foliage - Layer 2 */}
      <mesh position={[0, 2.2, 0]}>
        <coneGeometry args={[0.6, 1.2, 6]} />
        <meshStandardMaterial color="#36452a" roughness={0.8} />
      </mesh>
    </group>
  );
};

const Scene = () => {
  const trees = useMemo(() => {
    return Array.from({ length: 60 }).map((_, i) => ({
      position: [
        (Math.random() - 0.5) * 40 + (Math.random() > 0.5 ? 6 : -6),
        0,
        (Math.random() - 0.5) * 60
      ],
      scale: 0.8 + Math.random() * 0.5,
      rotation: [0, Math.random() * Math.PI, 0]
    }));
  }, []);

  return (
    <>
      {/* Lighting */}
      <ambientLight intensity={0.4} />
      <directionalLight
        position={[10, 15, 10]}
        intensity={1.2}
        castShadow
        shadow-mapSize={[2048, 2048]}
      >
        <orthographicCamera attach="shadow-camera" args={[-20, 20, 20, -20, 0.5, 50]} />
      </directionalLight>

      {/* Ground */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[100, 100, 20, 20]} />
        <meshStandardMaterial color="#7c8a6d" roughness={1} />
      </mesh>

      {/* Path */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]} receiveShadow>
        <planeGeometry args={[2.5, 100]} />
        <meshStandardMaterial color="#8b7355" roughness={0.9} />
      </mesh>

      {/* Trees - Not using Instances yet for different parts of tree, keeping it simple for now */}
      {trees.map((props, i) => (
        <Tree key={i} {...props} />
      ))}

      {/* Atmospheric particles */}
      {Array.from({ length: 20 }).map((_, i) => (
        <Float
          key={i}
          speed={1 + Math.random()}
          rotationIntensity={0.5}
          floatIntensity={0.5}
          position={[
            (Math.random() - 0.5) * 20,
            2 + Math.random() * 3,
            (Math.random() - 0.5) * 20
          ]}
        >
          <mesh>
            <sphereGeometry args={[0.02, 8, 8]} />
            <meshBasicMaterial color="#ffffff" transparent opacity={0.3} />
          </mesh>
        </Float>
      ))}

      {/* Hero moment marker - soft glow in distance */}
      <mesh position={[0, 0.1, -25]}>
        <cylinderGeometry args={[3, 3, 0.1, 32]} />
        <meshBasicMaterial color="#fffbeb" transparent opacity={0.1} />
      </mesh>
    </>
  );
};

export default Scene;
