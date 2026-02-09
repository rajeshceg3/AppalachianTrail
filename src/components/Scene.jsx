import React, { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { SoftShadows } from '@react-three/drei';
import { EffectComposer, Bloom, Vignette, Noise, DepthOfField } from '@react-three/postprocessing';
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

  // Generate a soft particle texture
  const particleTexture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 32;
    canvas.height = 32;
    const context = canvas.getContext('2d');
    const gradient = context.createRadialGradient(16, 16, 0, 16, 16, 16);
    gradient.addColorStop(0, 'rgba(255,255,255,1)');
    gradient.addColorStop(1, 'rgba(255,255,255,0)');
    context.fillStyle = gradient;
    context.fillRect(0, 0, 32, 32);
    const texture = new THREE.CanvasTexture(canvas);
    return texture;
  }, []);

  // Initial random positions relative to a 100x100 box
  const particles = useMemo(() => {
    return Array.from({ length: count }).map(() => ({
      x: (Math.random() - 0.5) * 100,
      y: Math.random() * 20, // Height 0 to 20
      z: (Math.random() - 0.5) * 100,
      speed: 0.2 + Math.random() * 0.5,
      offset: Math.random() * 100,
      baseScale: 0.5 + Math.random() * 1.5 // Varied size for organic look
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
        // Anchor Y to camera height to ensure particles are always visible around the player
        // particle.y is 0-20, so we center it around the camera (e.g., -10 to +10 relative)
        const relativeY = particle.y - 10;
        const y = camPos.y + relativeY + Math.sin(time * 0.5 + particle.offset) * 0.5;

        dummy.position.set(
            camPos.x + dx,
            y,
            camPos.z + dz
        );

        // Billboard: always face camera
        dummy.quaternion.copy(state.camera.quaternion);

        // Scale pulse for "breathing" effect + base scale variation
        // Desynchronize breathing with particle.offset
        const scale = particle.baseScale * (1.0 + Math.sin(time * 2 + particle.offset) * 0.2);
        // Multiply by 0.1 because plane is 1x1, spheres were 0.04 radius (0.08 diameter)
        dummy.scale.setScalar(scale * 0.1);

        dummy.updateMatrix();
        meshRef.current.setMatrixAt(i, dummy.matrix);
    });
    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[null, null, count]}>
      <planeGeometry args={[1, 1]} />
      <meshBasicMaterial
        color={color}
        map={particleTexture}
        transparent
        opacity={0.3}
        depthWrite={false}
      />
    </instancedMesh>
  );
};

const Scene = ({ region, audioEnabled }) => {
  const audioRef = useRef(null);
  const fogRef = useRef();
  const lightRef = useRef();

  // Dynamic atmosphere
  useFrame((state) => {
    const time = state.clock.getElapsedTime();
    const camY = state.camera.position.y;

    if (fogRef.current) {
      // Breathing fog density
      // Add subtle noise to breathing
      let density = region.fogDensity + Math.sin(time * 0.5) * (region.fogDensity * 0.1) + Math.cos(time * 0.23) * (region.fogDensity * 0.05);

      // Height modulation: Less fog as you go up (climbing out of the valley)
      // Assume typical camera heights are 5-50.
      // Decrease density by up to 60% at height 30 relative to base 5.
      const heightFactor = Math.max(0.4, 1.0 - (Math.max(0, camY - 5) * 0.025));

      fogRef.current.density = density * heightFactor;
    }

    if (lightRef.current) {
      // Sunlight warming effect
      // Start cool white, transition to warm amber over 60s
      const warmColor = new THREE.Color('#fff7ed'); // Warm white/amber tint
      const baseColor = new THREE.Color('#ffffff'); // Cool white

      // Progress over 60 seconds
      const warmProgress = Math.min(1.0, time / 60.0);

      // Lerp color
      lightRef.current.color.lerpColors(baseColor, warmColor, warmProgress);

      // Intensity pulse + slow increase
      lightRef.current.intensity = 1.2 + Math.sin(time * 0.3) * 0.03 + Math.sin(time * 0.7 + 10) * 0.02 + (warmProgress * 0.2);
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

      <EffectComposer disableNormalPass>
        <DepthOfField
            focusDistance={0.02} /* Focus approx 20 units away (assuming far=1000) */
            focalLength={0.15} /* Focal length */
            bokehScale={2} /* Blur intensity */
            height={480}
        />
        <Bloom luminanceThreshold={0.8} mipmapBlur intensity={0.5} radius={0.6} />
        <Vignette eskil={false} offset={0.1} darkness={0.4} />
        <Noise opacity={0.02} />
      </EffectComposer>
    </>
  );
};

export default Scene;
