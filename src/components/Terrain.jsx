import React, { useLayoutEffect, useRef } from 'react';
import * as THREE from 'three';
import { getTerrainHeight } from '../utils/terrain';

const Terrain = ({ color }) => {
  const meshRef = useRef();

  useLayoutEffect(() => {
    if (!meshRef.current) return;

    const geometry = meshRef.current.geometry;
    const positions = geometry.attributes.position;
    const count = positions.count;

    for (let i = 0; i < count; i++) {
      // PlaneGeometry creates a flat grid on X/Y plane (before rotation)
      // We displace along Z (which becomes Y after rotation)
      const x = positions.getX(i);
      const y = positions.getY(i); // This corresponds to -Z in world space due to rotation

      // We want to calculate height at World (x, z).
      // Since World Z = -y (due to rotation), we use -y as the z coordinate for noise.
      const height = getTerrainHeight(x, -y);
      positions.setZ(i, height);
    }

    positions.needsUpdate = true;
    geometry.computeVertexNormals();
  }, []);

  return (
    <mesh
      ref={meshRef}
      rotation={[-Math.PI / 2, 0, 0]}
      receiveShadow
    >
      <planeGeometry args={[600, 600, 512, 512]} />
      <meshStandardMaterial
        color={color}
        roughness={1}
        flatShading={false} // Smooth shading for organic look
      />
    </mesh>
  );
};

export default Terrain;
