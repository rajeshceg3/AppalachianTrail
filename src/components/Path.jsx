import React, { useMemo } from 'react';
import * as THREE from 'three';
import { getPathX, getTerrainHeight } from '../utils/terrain';

const Path = ({ color }) => {
  const curve = useMemo(() => {
    // Generate points along the path
    const points = [];
    const step = 0.5; // Sampling density for smoothness
    for (let z = -100; z <= 100; z += step) {
      const x = getPathX(z);
      // Lift slightly above terrain to avoid z-fighting
      const y = getTerrainHeight(x, z) + 0.04;
      points.push(new THREE.Vector3(x, y, z));
    }
    return new THREE.CatmullRomCurve3(points);
  }, []);

  const geometry = useMemo(() => {
      // Create a ribbon geometry by expanding the path points
      const pathPoints = curve.getPoints(400); // Higher segment count for smoothness
      const geo = new THREE.BufferGeometry();
      const vertices = [];
      const uvs = [];
      const indices = [];

      const width = 2.0; // Width of the trail

      for (let i = 0; i < pathPoints.length; i++) {
        const point = pathPoints[i];

        // Calculate tangent to find perpendicular vector
        let tangent;
        if (i === 0) {
            tangent = new THREE.Vector3().subVectors(pathPoints[1], pathPoints[0]).normalize();
        } else if (i === pathPoints.length - 1) {
            tangent = new THREE.Vector3().subVectors(pathPoints[i], pathPoints[i-1]).normalize();
        } else {
            // Average tangent
            tangent = new THREE.Vector3().subVectors(pathPoints[i+1], pathPoints[i-1]).normalize();
        }

        // Perpendicular vector (assuming UP is Y)
        // This keeps the path flat relative to the ground plane
        const up = new THREE.Vector3(0, 1, 0);
        const perp = new THREE.Vector3().crossVectors(tangent, up).normalize().multiplyScalar(width / 2);

        // Left and Right vertices
        const left = new THREE.Vector3().addVectors(point, perp);
        const right = new THREE.Vector3().subVectors(point, perp);

        vertices.push(left.x, left.y, left.z);
        vertices.push(right.x, right.y, right.z);

        // UVs for texture mapping if needed
        const v = i / (pathPoints.length - 1);
        uvs.push(0, v);
        uvs.push(1, v);

        if (i < pathPoints.length - 1) {
          const base = i * 2;
          // Triangle 1
          indices.push(base, base + 1, base + 2);
          // Triangle 2
          indices.push(base + 1, base + 3, base + 2);
        }
      }

      geo.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
      geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
      geo.setIndex(indices);
      geo.computeVertexNormals();

      return geo;
  }, [curve]);

  return (
    <mesh geometry={geometry} receiveShadow>
      <meshStandardMaterial
        color={color}
        roughness={0.9}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
};

export default Path;
