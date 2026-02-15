import React, { useMemo, useEffect } from 'react';
import * as THREE from 'three';
import { getPathX, getTerrainHeight, getTerrainNormal } from '../utils/terrain';
import { generateHeightMap, generateNormalMap, generateAlphaMap } from '../utils/textureGenerator';

const Path = ({ color }) => {
  const { roughnessMap, normalMap, alphaMap } = useMemo(() => {
    // Generate textures for path

    // Roughness/Detail: High frequency noise for gravel look
    const rMap = generateHeightMap(512, 512, 10.0, 4);
    rMap.wrapS = THREE.RepeatWrapping;
    rMap.wrapT = THREE.RepeatWrapping;
    rMap.repeat.set(2, 200);

    // Normal Map: Matching frequency but bumping it
    const nMap = generateNormalMap(512, 512, 10.0, 4, 3.0);
    nMap.wrapS = THREE.RepeatWrapping;
    nMap.wrapT = THREE.RepeatWrapping;
    nMap.repeat.set(2, 200);

    // Alpha Map: Fade edges
    const aMap = generateAlphaMap(256, 16); // Low res is fine for gradient
    // Alpha map is mapped to UV. Path UVs are 0..1 across width.
    // generateAlphaMap handles width gradient.

    return { roughnessMap: rMap, normalMap: nMap, alphaMap: aMap };
  }, []);

  useEffect(() => {
    return () => {
      roughnessMap.dispose();
      normalMap.dispose();
      alphaMap.dispose();
    };
  }, [roughnessMap, normalMap, alphaMap]);

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
        roughness={1}
        roughnessMap={roughnessMap}
        normalMap={normalMap}
        normalScale={new THREE.Vector2(1, 1)}
        alphaMap={alphaMap}
        transparent={true}
        side={THREE.DoubleSide}
        polygonOffset
        polygonOffsetFactor={-2} // Increased bias to ensure it sits on top despite transparency
        polygonOffsetUnits={-2}
      />
    </mesh>
  );
};

export default Path;
