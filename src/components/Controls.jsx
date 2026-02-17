import React, { useRef, useEffect } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { getTerrainHeight, getPathX } from '../utils/terrain';

const Controls = ({ audioRef, natureRef }) => {
  const { camera } = useThree();
  const moveForward = useRef(false);
  const moveBackward = useRef(false);

  // Camera Rotation State
  const targetEuler = useRef(new THREE.Euler(0, 0, 0, 'YXZ'));
  const currentEuler = useRef(new THREE.Euler(0, 0, 0, 'YXZ'));

  const velocity = useRef(new THREE.Vector3());
  const isInitialized = useRef(false);

  // Footstep tracking
  const lastBobPhase = useRef(0);
  const STEP_DISTANCE = 1.5; // Used for speed calc, not trigger
  const WALK_SPEED = 2.5;

  // Head bobbing state
  const bobRef = useRef(0);
  // Breathing sway state
  const breathRef = useRef(0);
  // Bank (roll) state
  const bankRef = useRef(0);
  const targetBankRef = useRef(0);
  // Uneven footing
  const wobbleRef = useRef(0);

  useEffect(() => {
    // Initialize rotation state from current camera
    currentEuler.current.setFromQuaternion(camera.quaternion);
    currentEuler.current.x = -0.1;
    targetEuler.current.copy(currentEuler.current);

    const onKeyDown = (event) => {
      switch (event.code) {
        case 'ArrowUp':
        case 'KeyW':
          moveForward.current = true;
          break;
        case 'ArrowDown':
        case 'KeyS':
          moveBackward.current = true;
          break;
      }
    };

    const onKeyUp = (event) => {
      switch (event.code) {
        case 'ArrowUp':
        case 'KeyW':
          moveForward.current = false;
          break;
        case 'ArrowDown':
        case 'KeyS':
          moveBackward.current = false;
          break;
      }
    };

    // Drag-to-look logic
    let isDragging = false;
    let previousMousePosition = { x: 0, y: 0 };

    const onMouseDown = (e) => {
      isDragging = true;
      previousMousePosition = { x: e.clientX, y: e.clientY };
    };

    const onMouseUp = () => {
      isDragging = false;
    };

    const onMouseMoveDrag = (e) => {
      if (isDragging) {
        const deltaX = e.clientX - previousMousePosition.x;
        const deltaY = e.clientY - previousMousePosition.y;

        handleLook(deltaX, deltaY);

        previousMousePosition = { x: e.clientX, y: e.clientY };
      }
    };

    const handleLook = (deltaX, deltaY) => {
        targetEuler.current.y -= deltaX * 0.002;
        targetEuler.current.x -= deltaY * 0.002;

        targetEuler.current.x = Math.max(-Math.PI / 3, Math.min(Math.PI / 3, targetEuler.current.x));

        targetBankRef.current -= deltaX * 0.05;
        targetBankRef.current = Math.max(-0.15, Math.min(0.15, targetBankRef.current));
    };

    const onTouchStart = (e) => {
        if (audioRef?.current) {
            audioRef.current.resume();
        }

        const touch = e.touches[0];
        const { clientX, clientY } = touch;
        const { innerHeight } = window;

        if (clientY > innerHeight * 0.8) {
            moveForward.current = true;
        } else {
            isDragging = true;
            previousMousePosition = { x: clientX, y: clientY };
        }
    };

    const onTouchMove = (e) => {
        const touch = e.touches[0];
        const { clientX, clientY } = touch;

        if (isDragging) {
            const deltaX = clientX - previousMousePosition.x;
            const deltaY = clientY - previousMousePosition.y;

            handleLook(deltaX * 1.5, deltaY * 1.5);

            previousMousePosition = { x: clientX, y: clientY };
        }
    };

    const onTouchEnd = () => {
        moveForward.current = false;
        isDragging = false;
    };


    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('keyup', onKeyUp);
    document.addEventListener('mousedown', onMouseDown);
    document.addEventListener('mouseup', onMouseUp);
    document.addEventListener('mousemove', onMouseMoveDrag);
    document.addEventListener('touchstart', onTouchStart, { passive: false });
    document.addEventListener('touchmove', onTouchMove, { passive: false });
    document.addEventListener('touchend', onTouchEnd);


    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('keyup', onKeyUp);
      document.removeEventListener('mousedown', onMouseDown);
      document.removeEventListener('mouseup', onMouseUp);
      document.removeEventListener('mousemove', onMouseMoveDrag);
      document.removeEventListener('touchstart', onTouchStart);
      document.removeEventListener('touchmove', onTouchMove);
      document.removeEventListener('touchend', onTouchEnd);
    };
  }, [camera, audioRef]);

  useFrame((state, delta) => {
    // Clamp delta to prevent physics explosions on lag spikes
    const safeDelta = Math.min(delta, 0.1);

    // 1. Unified Nature Interaction
    const windInt = natureRef?.current?.windIntensity || 0.0;

    // Wind Buffeting (Camera Shake)
    // Increases with wind intensity
    // Applied to rotation for "head pushed by wind" feel
    const buffetX = (Math.random() - 0.5) * windInt * 0.002;
    const buffetY = (Math.random() - 0.5) * windInt * 0.002;


    // --- Smooth Look Rotation ---
    const lookDamping = 10.0;
    currentEuler.current.x = THREE.MathUtils.lerp(currentEuler.current.x, targetEuler.current.x + buffetY, safeDelta * lookDamping);
    currentEuler.current.y = THREE.MathUtils.lerp(currentEuler.current.y, targetEuler.current.y + buffetX, safeDelta * lookDamping);


    // --- Movement Logic ---
    const forward = new THREE.Vector3(0, 0, -1);
    forward.applyQuaternion(camera.quaternion);
    forward.y = 0;
    forward.normalize();

    const targetVelocity = new THREE.Vector3();
    if (moveForward.current) targetVelocity.add(forward);
    if (moveBackward.current) targetVelocity.sub(forward);

    let currentWalkSpeed = WALK_SPEED;
    if (targetVelocity.lengthSq() > 0) {
        const dir = targetVelocity.clone().normalize();
        const lookAhead = 1.0;
        const nextPos = camera.position.clone().add(dir.multiplyScalar(lookAhead));
        const currH = getTerrainHeight(camera.position.x, camera.position.z);
        const nextH = getTerrainHeight(nextPos.x, nextPos.z);
        const slope = (nextH - currH) / lookAhead;

        if (slope > 0) {
             currentWalkSpeed = WALK_SPEED / (1.0 + slope * 3.0);
        } else {
             currentWalkSpeed = WALK_SPEED * (1.0 - slope * 0.5);
        }
    }

    if (targetVelocity.lengthSq() > 0) {
        targetVelocity.normalize().multiplyScalar(currentWalkSpeed);
    }

    velocity.current.lerp(targetVelocity, safeDelta * 3.0);

    if (velocity.current.lengthSq() > 0.001) {
        // Wind resistance? Maybe later.
        camera.position.addScaledVector(velocity.current, safeDelta);

        if (Math.random() < 0.05) {
             wobbleRef.current += (Math.random() - 0.5) * 0.015;
        }

        const speed = velocity.current.length();
        bobRef.current += safeDelta * speed * 4.0;

        // --- Synced Footsteps ---
        // Trigger on Sine Trough (Phase ~ 4.71 or 3PI/2)
        // We normalize phase to 0..2PI
        const phase = bobRef.current % (Math.PI * 2);
        const targetPhase = Math.PI * 1.5;

        // If we crossed the target phase since last frame
        // Wrap around handling
        let crossed = false;
        if (lastBobPhase.current < targetPhase && phase >= targetPhase) crossed = true;
        if (lastBobPhase.current > targetPhase && phase < lastBobPhase.current && phase >= targetPhase) crossed = true; // Wrapped? No, this logic is tricky.

        // Simpler: Check if sine derivative changed sign? No.
        // Check if value is close to min and we haven't triggered yet for this cycle?
        // Easiest: Just check if we crossed the threshold in positive direction? No.
        // Let's use the crossing logic with unwrapped values or delta.

        // Robust crossing check:
        const prevDist = lastBobPhase.current - targetPhase;
        const currDist = phase - targetPhase;

        // If sign changed from negative to positive (or wrapped)
        // Actually, just checking if we passed 4.71
        if ((lastBobPhase.current < 4.71 && phase >= 4.71) || (lastBobPhase.current > 5.0 && phase < 1.0)) {
            if (audioRef && audioRef.current) {
                const cx = camera.position.x;
                const cz = camera.position.z;
                const pathX = getPathX(cz);
                const distToPath = Math.abs(cx - pathX);
                const surface = distToPath < 3.5 ? 'gravel' : 'grass';

                audioRef.current.playFootstep(surface);
                audioRef.current.playGearRustle();
            }
        }

        lastBobPhase.current = phase;

    } else {
        bobRef.current = THREE.MathUtils.lerp(bobRef.current, Math.round(bobRef.current / Math.PI) * Math.PI, safeDelta * 5);
        lastBobPhase.current = bobRef.current % (Math.PI * 2);
    }

    breathRef.current += safeDelta * 0.5;

    const breathY = Math.sin(breathRef.current) * 0.015
                  + Math.sin(breathRef.current * 1.6) * 0.005
                  + Math.sin(breathRef.current * 0.4) * 0.005;

    const breathZ = Math.cos(breathRef.current * 0.4) * 0.003
                  + Math.sin(breathRef.current * 0.7) * 0.002;

    const bobAmount = Math.sin(bobRef.current) * 0.05;

    const groundHeight = getTerrainHeight(camera.position.x, camera.position.z);
    const targetY = groundHeight + 1.7 + bobAmount + breathY;

    if (!isInitialized.current) {
        camera.position.y = targetY;
        isInitialized.current = true;
    } else {
        camera.position.y = THREE.MathUtils.lerp(camera.position.y, targetY, safeDelta * 10);
    }

    targetBankRef.current = THREE.MathUtils.lerp(targetBankRef.current, 0, safeDelta * 5);
    bankRef.current = THREE.MathUtils.lerp(bankRef.current, targetBankRef.current, safeDelta * 5);
    wobbleRef.current = THREE.MathUtils.lerp(wobbleRef.current, 0, safeDelta * 4.0);

    // Apply wind buffeting to roll as well
    const windRoll = (Math.sin(safeDelta * 10) + Math.cos(safeDelta * 23)) * windInt * 0.002;

    currentEuler.current.z = bankRef.current + breathZ + wobbleRef.current + windRoll;

    camera.quaternion.setFromEuler(currentEuler.current);
  });

  return null;
};

export default Controls;
