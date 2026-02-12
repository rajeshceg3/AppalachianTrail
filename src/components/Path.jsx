import React, { useMemo, useEffect } from 'react';
import * as THREE from 'three';
import { getPathX, getTerrainHeight, getTerrainNormal } from '../utils/terrain';
import { generateNoiseTexture } from '../utils/textureGenerator';

const Path = ({ color }) => {
  // Generate texture for path surface (dirt/gravel)
  const texture = useMemo(() => {
      const t = generateNoiseTexture(512, 512);
      // Path is long and narrow, so we repeat texture heavily along V
      t.repeat.set(1, 200);
      t.wrapS = THREE.RepeatWrapping;
      t.wrapT = THREE.RepeatWrapping;
      return t;
  }, []);

  useEffect(() => {
    return () => {
      texture.dispose();
    };
  }, [texture]);

  const curve = useMemo(() => {
    // Generate points along the path
    const points = [];
    const step = 0.5; // Sampling density for smoothness
    for (let z = -350; z <= 350; z += step) {
      const x = getPathX(z);
      // Lift slightly above terrain to avoid z-fighting
      // Reduced offset significantly because we use polygonOffset in material
      const y = getTerrainHeight(x, z) + 0.005;
      points.push(new THREE.Vector3(x, y, z));
    }
    return new THREE.CatmullRomCurve3(points);
  }, []);

  const geometry = useMemo(() => {
      // Create a ribbon geometry by expanding the path points
      const pathPoints = curve.getPoints(1400); // Higher segment count for smoothness
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

        // Use terrain normal to orient the path ribbon (banking)
        const normal = getTerrainNormal(point.x, point.z);
        // Calculate perpendicular vector aligned with terrain slope
        const perp = new THREE.Vector3().crossVectors(tangent, normal).normalize().multiplyScalar(width / 2);

        // Left and Right vertices
        const left = new THREE.Vector3().addVectors(point, perp);
        const right = new THREE.Vector3().subVectors(point, perp);

        // Snap to terrain height to prevent floating/clipping
        // We use the calculated X/Z but sample the exact ground height
        const leftY = getTerrainHeight(left.x, left.z) + 0.02;
        const rightY = getTerrainHeight(right.x, right.z) + 0.02;

        vertices.push(left.x, leftY, left.z);
        vertices.push(right.x, rightY, right.z);

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
        map={texture}
        roughnessMap={texture}
        bumpMap={texture}
        bumpScale={0.05}
        roughness={0.9}
        side={THREE.DoubleSide}
        polygonOffset
        polygonOffsetFactor={-1}
        polygonOffsetUnits={-1}
      />
    </mesh>
  );
};

export default Path;
