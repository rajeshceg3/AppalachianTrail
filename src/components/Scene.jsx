import React, { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { SoftShadows } from '@react-three/drei';
import { EffectComposer, Bloom, Vignette, Noise } from '@react-three/postprocessing';
import Controls from './Controls';
import Terrain from './Terrain';
import Path from './Path';
import AudioController from './AudioController';
import Vegetation from './Vegetation';
import Rocks from './Rocks';
import { getTerrainHeight } from '../utils/terrain';

const AtmosphericParticles = ({ color, count = 2000 }) => {
  const meshRef = useRef();
  const dummy = useMemo(() => new THREE.Object3D(), []);

  // Initial random positions relative to a 100x100 box
  const particles = useMemo(() => {
    return Array.from({ length: count }).map(() => ({
      x: (Math.random() - 0.5) * 100,
      y: Math.random() * 20, // Height 0 to 20
      z: (Math.random() - 0.5) * 100,
      speed: 0.2 + Math.random() * 0.5,
      offset: Math.random() * 100
    }));
  }, [count]);

  useFrame((state) => {
    if (!meshRef.current) return;
    const time = state.clock.elapsedTime;
    const camPos = state.camera.position;

    particles.forEach((particle, i) => {
        // Calculate position relative to camera to create infinite field
        // Box size 200x200 to ensure particles don't pop in/out visibly within fog
        const range = 200;
        const halfRange = range / 2;

        // Move particle along Z based on time (wind direction)
        let z = particle.z + time * particle.speed;

        // Wrap Z relative to camera
        // (z - camPos.z) gives distance. Modulo wraps it.
        let dz = (z - camPos.z) % range;
        // Adjust to be centered around 0 (-50 to 50)
        if (dz < -halfRange) dz += range;
        if (dz > halfRange) dz -= range;

        // Wrap X relative to camera
        let dx = (particle.x - camPos.x) % range;
        if (dx < -halfRange) dx += range;
        if (dx > halfRange) dx -= range;

        // Vertical sway
        const y = particle.y + Math.sin(time * 0.5 + particle.offset) * 0.5;

        dummy.position.set(
            camPos.x + dx,
            y,
            camPos.z + dz
        );

        // Scale pulse for "breathing" effect
        const scale = 1.0 + Math.sin(time * 2 + particle.offset) * 0.2;
        dummy.scale.setScalar(scale);

        dummy.updateMatrix();
        meshRef.current.setMatrixAt(i, dummy.matrix);
    });
    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[null, null, count]}>
      <sphereGeometry args={[0.04, 6, 6]} />
      <meshBasicMaterial color={color} transparent opacity={0.3} />
    </instancedMesh>
  );
};

const Scene = ({ region, audioEnabled }) => {
  const audioRef = useRef(null);
  const fogRef = useRef();
  const lightRef = useRef();

  // Dynamic atmosphere
  useFrame(({ clock }) => {
    const time = clock.getElapsedTime();
    if (fogRef.current) {
      // Breathing fog density
      fogRef.current.density = region.fogDensity + Math.sin(time * 0.5) * (region.fogDensity * 0.1);
    }
    if (lightRef.current) {
      // Subtle light intensity shift
      lightRef.current.intensity = 1.2 + Math.sin(time * 0.3) * 0.05;
    }
  });

  return (
    <>
      <AudioController ref={audioRef} region={region} enabled={audioEnabled} />
      <Controls audioRef={audioRef} />
      <fogExp2 ref={fogRef} attach="fog" args={[region.fogColor, region.fogDensity]} />
      <SoftShadows size={25} samples={10} focus={0.5} />

      {/* Lighting */}
      <ambientLight intensity={0.5} />
      <directionalLight
        ref={lightRef}
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
      <Rocks region={region} />

      {/* Atmospheric particles */}
      <AtmosphericParticles color={region.particles} />

      {/* Hero moment marker - positioned relative to terrain */}
      <mesh position={[0, getTerrainHeight(0, -40) + 0.1, -40]}>
        <cylinderGeometry args={[4, 4, 0.1, 32]} />
        <meshBasicMaterial color="#fffbeb" transparent opacity={0.1} />
      </mesh>

      <EffectComposer disableNormalPass>
        <Bloom luminanceThreshold={0.8} mipmapBlur intensity={0.5} radius={0.6} />
        <Vignette eskil={false} offset={0.1} darkness={0.4} />
        <Noise opacity={0.02} />
      </EffectComposer>
    </>
  );
};

export default Scene;
