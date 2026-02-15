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
import GPUAtmosphere from './GPUAtmosphere';
import { getTerrainHeight } from '../utils/terrain';

const Scene = ({ region, audioEnabled }) => {
  const audioRef = useRef(null);
  const fogRef = useRef();
  const lightRef = useRef();
  const dofRef = useRef();

  const raycaster = useMemo(() => new THREE.Raycaster(), []);
  const screenCenter = useMemo(() => new THREE.Vector2(0, 0), []);
  const dummyTarget = useMemo(() => new THREE.Vector3(0, 0, 20), []);

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

      // Cloud Shadows: Modulate intensity
      const cloudNoise = Math.sin(time * 0.15) * 0.2 + Math.sin(time * 0.05 + 4.0) * 0.15;
      // Map noise -0.35..0.35 to factor 0.7..1.1
      const cloudFactor = THREE.MathUtils.mapLinear(cloudNoise, -0.35, 0.35, 0.7, 1.1);

      // Intensity pulse + slow increase + clouds
      const baseIntensity = 1.0 + Math.sin(time * 0.3) * 0.03 + (warmProgress * 0.2);
      lightRef.current.intensity = baseIntensity * cloudFactor;
    }

    // Dynamic Depth of Field Focus
    if (dofRef.current) {
        // Set raycaster from camera to center of screen
        raycaster.setFromCamera(screenCenter, state.camera);

        // Intersect only checking first hit
        // Note: Intersection can be expensive. We limit ray far to 50 units for performance/relevance.
        raycaster.far = 50;
        const intersects = raycaster.intersectObjects(state.scene.children, true);

        let targetPoint = null;

        // Find first visible object
        for(let i=0; i<intersects.length; i++) {
             // Basic visibility check (not perfect but helpful)
             if (intersects[i].object.visible) {
                 targetPoint = intersects[i].point;
                 break;
             }
        }

        // If nothing hit (sky), focus far away
        if (!targetPoint) {
            // Point 50 units ahead
            const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(state.camera.quaternion).multiplyScalar(50);
            targetPoint = state.camera.position.clone().add(forward);
        }

        // Smoothly interpolate current target towards hit point
        // If dofRef.current.target is undefined, we initialize it
        if (!dofRef.current.target) dofRef.current.target = dummyTarget.clone();

        dofRef.current.target.lerp(targetPoint, 0.1);
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
      <GPUAtmosphere color={region.particles} type={region.particleType} />

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
