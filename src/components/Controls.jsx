import React, { useRef, useEffect } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { getTerrainHeight, getPathX } from '../utils/terrain';

const Controls = ({ audioRef }) => {
  const { camera } = useThree();
  const moveForward = useRef(false);
  const moveBackward = useRef(false);

  // Camera Rotation State
  // targetEuler tracks the desired rotation from input
  // currentEuler tracks the actual smoothed camera rotation
  const targetEuler = useRef(new THREE.Euler(0, 0, 0, 'YXZ'));
  const currentEuler = useRef(new THREE.Euler(0, 0, 0, 'YXZ'));

  const velocity = useRef(new THREE.Vector3());
  const isInitialized = useRef(false);

  // Footstep tracking
  const lastBobPhase = useRef(0);
  const WALK_SPEED = 1.4; // Relaxing pace

  // Head bobbing state
  const bobRef = useRef(0);
  // Breathing sway state
  const breathRef = useRef(0);
  // Bank (roll) state
  const bankRef = useRef(0);
  const targetBankRef = useRef(0);
  // Uneven footing
  const wobbleRef = useRef(0);

  // Exertion Level (0..1)
  const exertionRef = useRef(0);

  useEffect(() => {
    // Initialize rotation state from current camera
    currentEuler.current.setFromQuaternion(camera.quaternion);
    // Start with a slight downward tilt to see the path immediately
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
        // Update target rotation immediately
        targetEuler.current.y -= deltaX * 0.002;
        targetEuler.current.x -= deltaY * 0.002;

        targetEuler.current.x = Math.max(-Math.PI / 3, Math.min(Math.PI / 3, targetEuler.current.x)); // Limit pitch

        // Add banking impulse to target
        targetBankRef.current -= deltaX * 0.05;
        targetBankRef.current = Math.max(-0.15, Math.min(0.15, targetBankRef.current));
    };

    // Touch Event Handlers
    const onTouchStart = (e) => {
        // Resume audio context on first touch if needed
        if (audioRef?.current) {
            audioRef.current.resume();
        }

        const touch = e.touches[0];
        const { clientX, clientY } = touch;
        const { innerHeight } = window;

        // Bottom 20% for movement
        if (clientY > innerHeight * 0.8) {
            moveForward.current = true;
        } else {
            // Top 80% for looking
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

            // Adjust sensitivity for touch
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
    // --- Smooth Look Rotation ---
    // Interpolate current rotation towards target rotation
    // Lower damping for heavier, smoother feel
    const lookDamping = 5.0;
    currentEuler.current.x = THREE.MathUtils.lerp(currentEuler.current.x, targetEuler.current.x, delta * lookDamping);
    currentEuler.current.y = THREE.MathUtils.lerp(currentEuler.current.y, targetEuler.current.y, delta * lookDamping);


    // --- Movement Logic ---
    // Calculate Forward vector (ignoring Y)
    const forward = new THREE.Vector3(0, 0, -1);
    forward.applyQuaternion(camera.quaternion);
    forward.y = 0;
    forward.normalize();

    // Determine target velocity based on input
    const targetVelocity = new THREE.Vector3();
    if (moveForward.current) targetVelocity.add(forward);
    if (moveBackward.current) targetVelocity.sub(forward);

    // Dynamic Speed based on Slope
    let currentWalkSpeed = WALK_SPEED;
    let currentSlope = 0;

    // Check slope ahead if moving
    if (targetVelocity.lengthSq() > 0) {
        const dir = targetVelocity.clone().normalize();
        const lookAhead = 1.0;
        const nextPos = camera.position.clone().add(dir.multiplyScalar(lookAhead));
        const currH = getTerrainHeight(camera.position.x, camera.position.z);
        const nextH = getTerrainHeight(nextPos.x, nextPos.z);
        currentSlope = (nextH - currH) / lookAhead;

        // Uphill (slope > 0): Slower
        // Downhill (slope < 0): Faster
        if (currentSlope > 0) {
             currentWalkSpeed = WALK_SPEED / (1.0 + currentSlope * 3.0);
        } else {
             currentWalkSpeed = WALK_SPEED * (1.0 - currentSlope * 0.5);
        }
    }

    // Update Exertion Level
    // Base exertion when moving is 0.3
    // + Slope factor (up to 0.7)
    // - Recovery when stopped
    let targetExertion = 0;
    if (velocity.current.lengthSq() > 0.1) {
        targetExertion = 0.3 + Math.max(0, currentSlope * 2.0);
    }
    // Clamp
    targetExertion = Math.min(1.0, targetExertion);

    // Smoothly interpolate exertion
    // Rise fast (short of breath), recover slow
    const exertionSpeed = targetExertion > exertionRef.current ? 0.5 : 0.2;
    exertionRef.current = THREE.MathUtils.lerp(exertionRef.current, targetExertion, delta * exertionSpeed);

    if (audioRef && audioRef.current && audioRef.current.setExertion) {
        audioRef.current.setExertion(exertionRef.current);
    }

    // Normalize and scale to walk speed
    if (targetVelocity.lengthSq() > 0) {
        targetVelocity.normalize().multiplyScalar(currentWalkSpeed);
    }

    // Apply Inertia: Smoothly interpolate current velocity towards target velocity
    // Lower factor = more inertia (slower start/stop)
    velocity.current.lerp(targetVelocity, delta * 1.5);

    // --- Soft Boundaries Logic ---
    // Prevent walking too far from path
    const currentPos = camera.position.clone();
    const pathX = getPathX(currentPos.z);
    const distToPath = currentPos.x - pathX;
    const MAX_DIST = 30.0; // Stay within 30 units of path

    // Push back force if too far
    if (Math.abs(distToPath) > MAX_DIST) {
        const pushDir = distToPath > 0 ? -1 : 1;
        // Strong push back if trying to go further
        // Or just modify velocity x component to resist outward movement
        const resistance = (Math.abs(distToPath) - MAX_DIST) * 10.0;
        velocity.current.x += pushDir * resistance * delta;
    }

    // Prevent walking off the ends of the world
    const MAX_Z = 550.0;
    if (Math.abs(currentPos.z) > MAX_Z) {
         const pushDir = currentPos.z > 0 ? -1 : 1;
         const resistance = (Math.abs(currentPos.z) - MAX_Z) * 10.0;
         velocity.current.z += pushDir * resistance * delta;
    }

    // Apply movement if there is significant velocity
    if (velocity.current.lengthSq() > 0.001) {
        camera.position.addScaledVector(velocity.current, delta);

        // Uneven Footing Wobble
        // Add random small impulses to wobble
        if (Math.random() < 0.05) {
             wobbleRef.current += (Math.random() - 0.5) * 0.015;
        }

        // Head bob logic based on speed
        const speed = velocity.current.length();
        bobRef.current += delta * speed * 4.0;

        // Phase-Synced Footsteps
        // Trigger footstep when head bob reaches trough (sin = -1)
        // This corresponds to phase 3*PI/2 (4.71) in a cycle 0..2PI
        const currentPhase = bobRef.current % (Math.PI * 2);
        const threshold = 4.71;

        // Trigger if we just crossed the threshold
        if (lastBobPhase.current < threshold && currentPhase >= threshold) {
            if (audioRef && audioRef.current) {
                const cx = camera.position.x;
                const cz = camera.position.z;
                const pathX = getPathX(cz);
                const distToPath = Math.abs(cx - pathX);
                const surface = distToPath < 3.5 ? 'gravel' : 'grass';

                audioRef.current.playFootstep(surface);
                audioRef.current.playGearRustle();
            }

            // Add weight transfer roll on footstep
            // Random slight roll left or right to simulate shifting weight
            const rollDir = Math.random() > 0.5 ? 1 : -1;
            targetBankRef.current += rollDir * 0.015;
        }

        lastBobPhase.current = currentPhase;
    } else {
        // Reset bob slowly when stopped
        bobRef.current = THREE.MathUtils.lerp(bobRef.current, Math.round(bobRef.current / Math.PI) * Math.PI, delta * 5);
        lastBobPhase.current = bobRef.current % (Math.PI * 2);
    }

    // Breathing Sway (always active)
    breathRef.current += delta * 0.5;

    // Polyrhythmic breathing
    // Sum of sines with non-integer period ratios (e.g. 1.0, 1.618)
    // This removes the mechanical loop feeling
    const breathY = Math.sin(breathRef.current) * 0.015
                  + Math.sin(breathRef.current * 1.6) * 0.005
                  + Math.sin(breathRef.current * 0.4) * 0.005;

    const breathZ = Math.cos(breathRef.current * 0.4) * 0.003
                  + Math.sin(breathRef.current * 0.7) * 0.002;

    // Head Bob calculation
    const bobAmount = Math.sin(bobRef.current) * 0.05;

    // Terrain following
    const groundHeight = getTerrainHeight(camera.position.x, camera.position.z);

    // Camera height is ground + eye height + bob + breath
    // Smoothly adjust to ground changes
    const targetY = groundHeight + 1.7 + bobAmount + breathY;

    // Initial Snap or Smooth Lerp
    if (!isInitialized.current) {
        camera.position.y = targetY;
        isInitialized.current = true;
    } else {
        camera.position.y = THREE.MathUtils.lerp(camera.position.y, targetY, delta * 10);
    }

    // Apply Rotation with Banking
    // Decay target bank
    targetBankRef.current = THREE.MathUtils.lerp(targetBankRef.current, 0, delta * 5);
    // Smoothly interpolate actual bank towards target
    bankRef.current = THREE.MathUtils.lerp(bankRef.current, targetBankRef.current, delta * 5); // Slower bank smoothing

    // Decay wobble
    wobbleRef.current = THREE.MathUtils.lerp(wobbleRef.current, 0, delta * 4.0);

    // Apply banking (Z) to currentEuler
    currentEuler.current.z = bankRef.current + breathZ + wobbleRef.current;

    // Apply final rotation to camera
    camera.quaternion.setFromEuler(currentEuler.current);
  });

  return null;
};

export default Controls;
