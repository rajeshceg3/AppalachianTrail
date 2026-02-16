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

const AtmosphericParticles = ({ color, type = 'dust', count = 2000 }) => {
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
      baseScale: 0.5 + Math.random() * 1.5, // Varied size for organic look
      rotationSpeed: (Math.random() - 0.5) * 2
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

        let z = particle.z;
        let x = particle.x;

        // Custom Movement Logic
        if (type === 'snow' || type === 'leaves') {
             // Wind drift
             z += time * particle.speed;
        } else {
             // Default wind
             z += time * particle.speed;
        }

        // Wrap Z relative to camera
        let dz = (z - camPos.z) % range;
        if (dz < -halfRange) dz += range;
        if (dz > halfRange) dz -= range;

        // Wrap X relative to camera
        let dx = (x - camPos.x) % range;
        if (dx < -halfRange) dx += range;
        if (dx > halfRange) dx -= range;

        // Turbulence/Curl Noise approximation
        const turbFreq = 0.05;
        const turbAmp = 2.0;
        const tx = Math.sin(time * 0.5 + z * turbFreq + particle.offset) * turbAmp * particle.speed;
        const ty_turb = Math.cos(time * 0.3 + x * turbFreq + particle.offset) * turbAmp * 0.5;

        // Add Sway to X for leaves
        if (type === 'leaves') {
             dx += Math.sin(time + particle.offset) * 2.0;
        }

        // Vertical Movement (Y)
        // We calculate 'dy' relative to camera height (camPos.y)
        let dy;

        if (type === 'snow') {
             // Fast falling
             const fallSpeed = 3.0 * particle.speed;
             // Modulo 20 window centered on camera
             let fallY = -(time * fallSpeed + particle.offset) % 20;
             // fallY is 0 to -20. Shift to +10 to -10
             dy = fallY + 10;
        } else if (type === 'leaves') {
             // Slow falling
             const fallSpeed = 1.0 * particle.speed;
             let fallY = -(time * fallSpeed + particle.offset) % 20;
             dy = fallY + 10;
        } else if (type === 'fireflies') {
             // Floating sine wave
             // Centered around 0 (-5 to +5 range)
             dy = (particle.y - 10) + Math.sin(time * 1.0 + particle.offset) * 2.0;
        } else {
             // Dust / Mist
             // Gentle sway
             dy = (particle.y - 10) + Math.sin(time * 0.5 + particle.offset) * 0.5;
        }

        dummy.position.set(
            camPos.x + dx + tx,
            camPos.y + dy + ty_turb,
            camPos.z + dz
        );

        // Rotation
        if (type === 'leaves') {
            dummy.rotation.x = time * particle.rotationSpeed;
            dummy.rotation.z = time * particle.rotationSpeed * 0.5;
            dummy.rotation.y = time * 0.2;
        } else {
            // Billboard: always face camera
            dummy.quaternion.copy(state.camera.quaternion);
        }

        // Scale
        let scale = particle.baseScale * 0.1;

        if (type === 'fireflies') {
             // Blinking
             scale *= (0.5 + Math.sin(time * 3 + particle.offset) * 0.5);
        } else if (type === 'mist') {
             scale *= 3.0; // Mist is larger
        }

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

      // Clouds shadow effect on fog (density varies slowly)
      const cloudNoise = Math.sin(time * 0.1) * 0.1 + Math.sin(time * 0.05 + 10) * 0.1;
      density *= (1.0 + cloudNoise);

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

      // Dynamic Sun Position (Simulate passage of time)
      // Start at [20, 30, 10], Move slowly towards [-20, 20, 10]
      const sunX = THREE.MathUtils.lerp(20, -20, time / 300); // 5 minutes to cross
      const sunY = THREE.MathUtils.lerp(30, 20, time / 300);
      lightRef.current.position.set(sunX, sunY, 10);

      // Cloud Shadows: Modulate intensity
      // Increased contrast for dynamic lighting
      const cloudNoise = Math.sin(time * 0.1) * 0.3 + Math.sin(time * 0.03 + 4.0) * 0.3;
      // Map noise -0.6..0.6 to factor 0.4..1.2
      // 0.4 = deep shadow, 1.2 = bright sun burst
      const cloudFactor = THREE.MathUtils.mapLinear(cloudNoise, -0.6, 0.6, 0.4, 1.2);

      // Intensity pulse + slow increase + clouds
      const baseIntensity = 1.0 + Math.sin(time * 0.3) * 0.03 + (warmProgress * 0.2);
      lightRef.current.intensity = Math.max(0.1, baseIntensity * cloudFactor);
    }

    // Dynamic Depth of Field Focus
    if (dofRef.current) {
        frameCount.current++;

        // Raycast only every 15 frames for performance
        if (frameCount.current % 15 === 0) {
            // Set raycaster from camera to center of screen
            raycaster.setFromCamera(screenCenter, state.camera);
            raycaster.far = 50;
            const intersects = raycaster.intersectObjects(state.scene.children, true);

            let hit = null;
            // Find first visible object
            for(let i=0; i<intersects.length; i++) {
                 // Ignore particles or invisible objects
                 if (intersects[i].object.visible && intersects[i].object.type !== 'Points') {
                     hit = intersects[i].point;
                     break;
                 }
            }

            if (hit) {
                targetPointRef.current.copy(hit);
            } else {
                // Default far focus if looking at sky
                const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(state.camera.quaternion).multiplyScalar(50);
                targetPointRef.current.copy(state.camera.position).add(forward);
            }
        }

        // Smoothly interpolate current target towards hit point every frame
        if (!dofRef.current.target) dofRef.current.target = dummyTarget.clone();

        // Slower lerp (0.05) for very stable focus
        dofRef.current.target.lerp(targetPointRef.current, 0.05);
    }
  });

  return (
    <>
      <AudioController ref={audioRef} region={region} enabled={audioEnabled} />
      <Controls audioRef={audioRef} />
      <fogExp2 ref={fogRef} attach="fog" args={[region.fogColor, region.fogDensity]} />
      <SoftShadows size={25} samples={10} focus={0.5} />

      {/* Lighting */}
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

      <Vegetation region={region} />
      <Rocks region={region} />

      {/* Atmospheric particles */}
      <AtmosphericParticles color={region.particles} type={region.particleType} />

      <EffectComposer disableNormalPass>
        <DepthOfField
            ref={dofRef}
            focusDistance={0.02} /* Fallback/Initial */
            focalLength={0.15} /* Focal length */
            bokehScale={2} /* Blur intensity */
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
