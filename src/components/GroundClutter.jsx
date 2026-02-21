import React, { useMemo } from 'react';
import { Instances, Instance } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { getTerrainHeight, getPathX, createSeededRandom, noise2D } from '../utils/terrain';
import { applyWindShader } from '../materials/WindShader';

const GroundClutter = ({ region }) => {
  // Config based on region
  const grassCount = region.environment === 'forest' ? 8000 : 3000;
  const pebbleCount = 800;
  const range = 1200; // Match terrain range

  // 1. Grass Material (Wind Shader)
  const grassMaterial = useMemo(() => {
    const m = new THREE.MeshStandardMaterial({
      color: region.treeColor1 || '#4a6741',
      roughness: 0.8,
      side: THREE.DoubleSide
    });
    // Stronger sway for grass
    applyWindShader(m, 1.5, 0.3);
    return m;
  }, [region.treeColor1]);

  useFrame((state) => {
    const time = state.clock.elapsedTime;
    if (grassMaterial.userData.update) grassMaterial.userData.update(time);
  });

  // Grass Geometry with correct pivot
  const grassGeometry = useMemo(() => {
      const g = new THREE.ConeGeometry(0.05, 0.8, 3);
      g.translate(0, 0.4, 0);
      return g;
  }, []);

  // Pebble Geometry
  const pebbleGeometry = useMemo(() => {
      return new THREE.IcosahedronGeometry(0.5, 0);
  }, []);

  // 2. Generate Grass Data
  const grassData = useMemo(() => {
    const data = [];
    const rng = createSeededRandom(12345);
    const baseColor = new THREE.Color(region.treeColor1 || '#4a6741');
    const tipColor = new THREE.Color(region.treeColor2 || '#6c8c5c');

    let attempts = 0;
    while (data.length < grassCount && attempts < grassCount * 5) {
      attempts++;
      const z = (rng() - 0.5) * range;
      const pathX = getPathX(z);

      const side = rng() > 0.5 ? 1 : -1;
      const dist = 1.5 + (rng() * rng()) * 12.0;
      const x = pathX + side * dist;

      const y = getTerrainHeight(x, z);

      const n = noise2D(x * 0.05, z * 0.05);
      if (n < -0.1) continue;

      const scale = 0.5 + rng() * 0.8;
      const rotation = rng() * Math.PI * 2;

      const mix = rng();
      const c = baseColor.clone().lerp(tipColor, mix).offsetHSL(0, 0, (rng() - 0.5) * 0.1);

      data.push({ position: [x, y, z], scale, rotation, color: c });
    }
    return data;
  }, [grassCount, region.treeColor1, region.treeColor2]);

  // 3. Generate Pebble Data
  const pebbleData = useMemo(() => {
    const data = [];
    const rng = createSeededRandom(67890);
    const stoneColor = new THREE.Color('#5d5040'); // Dirt/Stone

    let attempts = 0;
    while (data.length < pebbleCount && attempts < pebbleCount * 5) {
      attempts++;
      const z = (rng() - 0.5) * range;
      const pathX = getPathX(z);

      const offset = (rng() - 0.5) * 5.0;
      const x = pathX + offset;

      const y = getTerrainHeight(x, z);

      const scale = 0.05 + rng() * 0.15;
      const rotation = [rng() * Math.PI, rng() * Math.PI, rng() * Math.PI];

      const c = stoneColor.clone().offsetHSL(0, 0, (rng() - 0.5) * 0.2);

      data.push({ position: [x, y + 0.05, z], scale, rotation, color: c });
    }
    return data;
  }, [pebbleCount]);

  return (
    <group>
      {/* Grass Instances */}
      <Instances range={grassData.length} material={grassMaterial} geometry={grassGeometry}>
        {grassData.map((d, i) => (
        <Instance
            key={`grass-${i}`}
            position={d.position}
            scale={[d.scale, d.scale, d.scale]}
            rotation={[0, d.rotation, 0]}
            color={d.color}
        />
        ))}
      </Instances>

      {/* Pebble Instances */}
      <Instances range={pebbleData.length} geometry={pebbleGeometry}>
        <meshStandardMaterial color="#555555" roughness={0.9} />
        {pebbleData.map((d, i) => (
          <Instance
            key={`pebble-${i}`}
            position={d.position}
            scale={[d.scale, d.scale, d.scale]}
            rotation={d.rotation}
            color={d.color}
          />
        ))}
      </Instances>
    </group>
  );
};

export default GroundClutter;
