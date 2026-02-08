import React, { useRef, useEffect } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { getTerrainHeight } from '../utils/terrain';

const Controls = ({ audioRef }) => {
  const { camera, gl } = useThree();
  const moveForward = useRef(false);
  const moveBackward = useRef(false);
  const euler = useRef(new THREE.Euler(0, 0, 0, 'YXZ'));
  const velocity = useRef(new THREE.Vector3());
  const isInitialized = useRef(false);

  // Footstep tracking
  const lastStepPosition = useRef(new THREE.Vector3());
  const STEP_DISTANCE = 1.5;
  const WALK_SPEED = 2.5;

  // Head bobbing state
  const bobRef = useRef(0);
  // Breathing sway state
  const breathRef = useRef(0);
  // Bank (roll) state
  const bankRef = useRef(0);

  useEffect(() => {
    // Initialize last step position
    lastStepPosition.current.copy(camera.position);
    // Initialize rotation state
    euler.current.setFromQuaternion(camera.quaternion);

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
        euler.current.y -= deltaX * 0.002;
        euler.current.x -= deltaY * 0.002;

        euler.current.x = Math.max(-Math.PI / 3, Math.min(Math.PI / 3, euler.current.x)); // Limit pitch

        // Add banking impulse
        bankRef.current -= deltaX * 0.05;
        bankRef.current = Math.max(-0.15, Math.min(0.15, bankRef.current));
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

    // Mouse listeners on canvas (gl.domElement) usually better, but document covers full screen
    document.addEventListener('mousedown', onMouseDown);
    document.addEventListener('mouseup', onMouseUp);
    document.addEventListener('mousemove', onMouseMoveDrag);

    // Touch listeners
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
    // Calculate Forward vector (ignoring Y)
    const forward = new THREE.Vector3(0, 0, -1);
    forward.applyQuaternion(camera.quaternion);
    forward.y = 0;
    forward.normalize();

    // Determine target velocity based on input
    const targetVelocity = new THREE.Vector3();
    if (moveForward.current) targetVelocity.add(forward);
    if (moveBackward.current) targetVelocity.sub(forward);

    // Normalize and scale to walk speed
    if (targetVelocity.lengthSq() > 0) {
        targetVelocity.normalize().multiplyScalar(WALK_SPEED);
    }

    // Apply Inertia: Smoothly interpolate current velocity towards target velocity
    // Lower factor = more inertia (slower start/stop)
    velocity.current.lerp(targetVelocity, delta * 3.0);

    // Apply movement if there is significant velocity
    if (velocity.current.lengthSq() > 0.001) {
        camera.position.addScaledVector(velocity.current, delta);

        // Head bob logic based on speed
        const speed = velocity.current.length();
        bobRef.current += delta * speed * 4.0;

        // Check footsteps
        const dist = camera.position.distanceTo(lastStepPosition.current);
        if (dist > STEP_DISTANCE) {
            if (audioRef && audioRef.current) {
                audioRef.current.playFootstep();
            }
            lastStepPosition.current.copy(camera.position);
        }
    } else {
        // Reset bob slowly when stopped
        bobRef.current = THREE.MathUtils.lerp(bobRef.current, Math.round(bobRef.current / Math.PI) * Math.PI, delta * 5);
    }

    // Breathing Sway (always active)
    breathRef.current += delta * 0.5;
    const breathY = Math.sin(breathRef.current) * 0.02; // Very subtle up/down

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
    // Decay bank
    bankRef.current = THREE.MathUtils.lerp(bankRef.current, 0, delta * 5);

    // Apply to camera
    euler.current.z = bankRef.current;
    camera.quaternion.setFromEuler(euler.current);
  });

  return null;
};

export default Controls;
