import React, { useMemo, useRef, useEffect } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { SoftShadows } from '@react-three/drei';
import { EffectComposer, Bloom, Vignette, Noise, DepthOfField } from '@react-three/postprocessing';
import { createNoise2D } from 'simplex-noise';
import Controls from './Controls';
import Terrain from './Terrain';
import Path from './Path';
import AudioController from './AudioController';
import Vegetation from './Vegetation';
import Rocks from './Rocks';

const AtmosphericParticles = ({ color, type = 'dust', count = 2000, natureRef }) => {
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

  // Initial random positions
  const particles = useMemo(() => {
    return Array.from({ length: count }).map(() => ({
      x: (Math.random() - 0.5) * 100,
      y: Math.random() * 20,
      z: (Math.random() - 0.5) * 100,
      speed: 0.2 + Math.random() * 0.5,
      offset: Math.random() * 100,
      baseScale: 0.5 + Math.random() * 1.5,
      rotationSpeed: (Math.random() - 0.5) * 2
    }));
  }, [count]);

  useFrame((state) => {
    if (!meshRef.current) return;
    const time = state.clock.elapsedTime;
    const camPos = state.camera.position;

    // Get current wind from nature system
    const windInt = natureRef?.current?.windIntensity || 0.5;
    const windDir = natureRef?.current?.windDirection || { x: 1, y: 0 }; // actually x,z but stored as x,y in vec2

    particles.forEach((particle, i) => {
        const range = 200;
        const halfRange = range / 2;

        let z = particle.z;
        let x = particle.x;

        // Apply Unified Wind Drift
        // Use windDir.y as Z component
        // Increased speed based on wind intensity
        const windSpeed = particle.speed * (0.5 + windInt * 1.5);

        x += time * windDir.x * windSpeed;
        z += time * windDir.y * windSpeed;

        // Custom extra drift based on type
        if (type === 'snow') {
             // Heavier fall
        }

        // Wrap Logic
        let dz = (z - camPos.z) % range;
        if (dz < -halfRange) dz += range;
        if (dz > halfRange) dz -= range;

        let dx = (x - camPos.x) % range;
        if (dx < -halfRange) dx += range;
        if (dx > halfRange) dx -= range;

        // Turbulence
        const turbFreq = 0.05;
        const turbAmp = 1.0 + windInt; // More turbulence in high wind
        const tx = Math.sin(time * 0.5 + z * turbFreq + particle.offset) * turbAmp * particle.speed;
        const ty_turb = Math.cos(time * 0.3 + x * turbFreq + particle.offset) * turbAmp * 0.5;

        // Vertical Movement
        let dy;
        if (type === 'snow') {
             const fallSpeed = 3.0 * particle.speed;
             let fallY = -(time * fallSpeed + particle.offset) % 20;
             dy = fallY + 10;
        } else if (type === 'leaves') {
             const fallSpeed = 1.0 * particle.speed + (windInt * 0.5); // Fall faster in wind
             let fallY = -(time * fallSpeed + particle.offset) % 20;
             dy = fallY + 10;
        } else if (type === 'fireflies') {
             dy = (particle.y - 10) + Math.sin(time * 1.0 + particle.offset) * 2.0;
        } else {
             // Dust/Mist floats around
             dy = (particle.y - 10) + Math.sin(time * 0.5 + particle.offset) * 0.5;
        }

        dummy.position.set(
            camPos.x + dx + tx,
            camPos.y + dy + ty_turb,
            camPos.z + dz
        );

        // Rotation
        if (type === 'leaves') {
            dummy.rotation.x = time * particle.rotationSpeed + windInt * time; // Spin faster in wind
            dummy.rotation.z = time * particle.rotationSpeed * 0.5;
            dummy.rotation.y = time * 0.2;
        } else {
            dummy.quaternion.copy(state.camera.quaternion);
        }

        // Scale
        let scale = particle.baseScale * 0.1;
        if (type === 'fireflies') scale *= (0.5 + Math.sin(time * 3 + particle.offset) * 0.5);
        if (type === 'mist') scale *= 3.0;

        dummy.scale.setScalar(scale);
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
        opacity={type === 'mist' ? 0.1 : 0.3}
        depthWrite={false}
        side={THREE.DoubleSide}
      />
    </instancedMesh>
  );
};

const Scene = ({ region, audioEnabled }) => {
  const audioRef = useRef(null);
  const fogRef = useRef();
  const lightRef = useRef();
  const dofRef = useRef();

  const raycaster = useMemo(() => new THREE.Raycaster(), []);
  const screenCenter = useMemo(() => new THREE.Vector2(0, 0), []);
  const dummyTarget = useMemo(() => new THREE.Vector3(0, 0, 20), []);
  const frameCount = useRef(0);
  const targetPointRef = useRef(new THREE.Vector3(0, 0, 20));

  // --- Unified Nature State ---
  const natureRef = useRef({
      windIntensity: 0.5,
      windDirection: new THREE.Vector2(1, 0),
      sunProgress: 0,
      time: 0
  });

  const noise2D = useMemo(() => createNoise2D(), []);

  useFrame((state) => {
    const time = state.clock.getElapsedTime();
    const camY = state.camera.position.y;

    natureRef.current.time = time;

    // --- 1. Calculate Unified Nature State ---

    // Wind Logic: FBM-like layers for organic gusts
    const baseWind = region.windIntensity || 0.5;

    // Slow swell (20s)
    const swell = (Math.sin(time * 0.3) + 1.0) * 0.5;

    // Fast gusts (noise)
    // Scale time for speed, scale result for intensity
    const gustRaw = noise2D(time * 0.5, 0); // -1 to 1
    const gust = Math.max(0, gustRaw); // Only positive gusts add to base

    // Sudden squalls (rare)
    const squall = Math.max(0, noise2D(time * 0.1, 100) - 0.6) * 3.0;

    let currentWind = baseWind + (swell * 0.2) + (gust * 0.4) + squall;
    currentWind = Math.min(1.5, Math.max(0.0, currentWind)); // Clamp

    // Wind Direction: Slowly rotates over time
    const windAngle = time * 0.05 + (region.id === 'maine' ? 2.0 : 0); // Offset based on region
    natureRef.current.windDirection.set(Math.cos(windAngle), Math.sin(windAngle));
    natureRef.current.windIntensity = currentWind;

    // Sun Progress (0 to 1 over 60s)
    const sunProgress = Math.min(1.0, time / 60.0);
    natureRef.current.sunProgress = sunProgress;


    // --- 2. Update Environment based on Nature State ---

    if (fogRef.current) {
      // Breathing fog modulated by WIND now
      // More wind = slightly less fog density variation (blown away?) or more chaos?
      // Let's make it turbulent.
      const fogPulse = Math.sin(time * 0.5) * 0.05 + Math.sin(time * 2.0) * (0.02 * currentWind);

      let density = region.fogDensity + fogPulse;

      // Height modulation
      const heightFactor = Math.max(0.4, 1.0 - (Math.max(0, camY - 5) * 0.025));

      // Cloud shadows affect fog
      const cloudNoise = Math.sin(time * 0.1) * 0.1;
      density *= (1.0 + cloudNoise);

      fogRef.current.density = Math.max(0, density * heightFactor);

      // Dynamic Fog Color (Golden Hour Sync)
      // Start with region fog color, tint towards orange/gold as sunProgress increases (sunrise)
      // Or if region is "sunset", tint towards purple.
      const baseFogColor = new THREE.Color(region.fogColor);
      const warmFogColor = new THREE.Color('#ffecd6'); // Warm morning mist

      // Mix based on sun progress
      const currentFogColor = baseFogColor.clone().lerp(warmFogColor, sunProgress * 0.3);
      fogRef.current.color.copy(currentFogColor);
    }

    if (lightRef.current) {
      // Sunlight warming
      const warmColor = new THREE.Color('#fff7ed');
      const baseColor = new THREE.Color('#ffffff');

      lightRef.current.color.lerpColors(baseColor, warmColor, sunProgress);

      // Sun moves
      const sunX = THREE.MathUtils.lerp(20, -20, time / 300);
      const sunY = THREE.MathUtils.lerp(30, 20, time / 300);
      lightRef.current.position.set(sunX, sunY, 10);

      // Shadow intensity modulated by CLOUDS (noise)
      const cloudNoise = noise2D(time * 0.05, sunX * 0.05); // Use noise lib instead of sine
      const cloudFactor = THREE.MathUtils.mapLinear(cloudNoise, -1, 1, 0.4, 1.2);

      // Intensity pulse
      const baseIntensity = 1.0 + (sunProgress * 0.2);
      lightRef.current.intensity = Math.max(0.1, baseIntensity * cloudFactor);
    }

    // Update Audio System
    if (audioRef.current && audioRef.current.updateNature) {
        audioRef.current.updateNature(natureRef.current);
    }

    // Update Depth of Field logic (unchanged)
    if (dofRef.current) {
        frameCount.current++;
        if (frameCount.current % 15 === 0) {
            raycaster.setFromCamera(screenCenter, state.camera);
            raycaster.far = 50;
            const intersects = raycaster.intersectObjects(state.scene.children, true);
            let hit = null;
            for(let i=0; i<intersects.length; i++) {
                 if (intersects[i].object.visible && intersects[i].object.type !== 'Points') {
                     hit = intersects[i].point;
                     break;
                 }
            }
            if (hit) {
                targetPointRef.current.copy(hit);
            } else {
                const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(state.camera.quaternion).multiplyScalar(50);
                targetPointRef.current.copy(state.camera.position).add(forward);
            }
        }
        if (!dofRef.current.target) dofRef.current.target = dummyTarget.clone();
        dofRef.current.target.lerp(targetPointRef.current, 0.05);
    }
  });

  return (
    <>
      <AudioController ref={audioRef} region={region} enabled={audioEnabled} />
      <Controls audioRef={audioRef} natureRef={natureRef} />
      <fogExp2 ref={fogRef} attach="fog" args={[region.fogColor, region.fogDensity]} />
      <SoftShadows size={25} samples={10} focus={0.5} />

      <ambientLight intensity={0.2} />
      <hemisphereLight groundColor="#504434" skyColor="#b1e1ff" intensity={0.4} />
      <directionalLight
        ref={lightRef}
        position={[20, 30, 10]}
        intensity={1.0}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-bias={-0.0001}
      >
        <orthographicCamera attach="shadow-camera" args={[-50, 50, 50, -50, 0.5, 100]} />
      </directionalLight>

      <Terrain color={region.groundColor} />
      <Path color={region.pathColor || '#8b7355'} />

      <Vegetation region={region} natureRef={natureRef} />
      <Rocks region={region} />

      <AtmosphericParticles color={region.particles} type={region.particleType} natureRef={natureRef} />

      <EffectComposer disableNormalPass>
        <DepthOfField
            ref={dofRef}
            focusDistance={0.02}
            focalLength={0.15}
            bokehScale={2}
            height={480}
        />
        <Bloom luminanceThreshold={1.0} mipmapBlur intensity={0.5} radius={0.6} />
        <Vignette eskil={false} offset={0.1} darkness={0.4} />
        <Noise opacity={0.02} />
      </EffectComposer>
    </>
  );
};

export default Scene;
