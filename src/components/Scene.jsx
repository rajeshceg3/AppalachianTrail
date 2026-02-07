import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Float, Instances, Instance, SoftShadows } from '@react-three/drei';
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing';
import * as THREE from 'three';
import Controls from './Controls';
import Terrain from './Terrain';
import Path from './Path';
import AudioController from './AudioController';
import { getTerrainHeight, getPathX } from '../utils/terrain';

const WindMaterial = ({ color, ...props }) => {
  const materialRef = useRef();

  useFrame(({ clock }) => {
    if (materialRef.current && materialRef.current.userData.shader) {
      materialRef.current.userData.shader.uniforms.uTime.value = clock.getElapsedTime();
    }
  });

  const onBeforeCompile = (shader) => {
    shader.uniforms.uTime = { value: 0 };
    materialRef.current.userData.shader = shader;

    shader.vertexShader = `
      uniform float uTime;
    ` + shader.vertexShader;

    shader.vertexShader = shader.vertexShader.replace(
      '#include <begin_vertex>',
      `
      #include <begin_vertex>
      // Access instance position from instanceMatrix
      float instanceX = instanceMatrix[3][0];
      float instanceZ = instanceMatrix[3][2];

      // Simple wind sway
      float windStrength = 0.1;
      float sway = sin(uTime * 1.5 + instanceX * 0.5 + instanceZ * 0.3) * windStrength;

      // Apply more sway to top of geometry
      // Assuming cone/cylinder centered at 0, max height ~1-2
      float heightFactor = max(0.0, position.y + 0.5);

      transformed.x += sway * heightFactor;
      `
    );
  };

  return <meshStandardMaterial ref={materialRef} color={color} onBeforeCompile={onBeforeCompile} {...props} />;
};

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
        <WindMaterial color={region.treeColor1} roughness={0.8} />
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
        <WindMaterial color={region.treeColor2} roughness={0.8} />
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
      <AudioController ref={audioRef} region={region} />
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
