import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Float, SoftShadows } from '@react-three/drei';
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing';
import * as THREE from 'three';
import Controls from './Controls';
import Terrain from './Terrain';
import Path from './Path';
import AudioController from './AudioController';
import Vegetation from './Vegetation';
import Rocks from './Rocks';
import { getTerrainHeight } from '../utils/terrain';

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
      lightRef.current.intensity = 1.2 + Math.sin(time * 0.3) * 0.1;
    }
  });

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

      <EffectComposer disableNormalPass>
        <Bloom luminanceThreshold={0.8} mipmapBlur intensity={0.5} radius={0.6} />
        <Vignette eskil={false} offset={0.1} darkness={0.4} />
      </EffectComposer>
    </>
  );
};

export default Scene;
