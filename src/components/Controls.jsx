import React, { useRef, useEffect } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { getTerrainHeight } from '../utils/terrain';

const Controls = () => {
  const { camera } = useThree();
  const moveForward = useRef(false);
  const moveBackward = useRef(false);
  const euler = useRef(new THREE.Euler(0, 0, 0, 'YXZ'));

  // Head bobbing state
  const bobRef = useRef(0);

  useEffect(() => {
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

        euler.current.setFromQuaternion(camera.quaternion);

        euler.current.y -= deltaX * 0.002;
        euler.current.x -= deltaY * 0.002;

        euler.current.x = Math.max(-Math.PI / 3, Math.min(Math.PI / 3, euler.current.x)); // Limit pitch

        camera.quaternion.setFromEuler(euler.current);

        previousMousePosition = { x: e.clientX, y: e.clientY };
      }
    };

    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('keyup', onKeyUp);
    document.addEventListener('mousedown', onMouseDown);
    document.addEventListener('mouseup', onMouseUp);
    document.addEventListener('mousemove', onMouseMoveDrag);

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('keyup', onKeyUp);
      document.removeEventListener('mousedown', onMouseDown);
      document.removeEventListener('mouseup', onMouseUp);
      document.removeEventListener('mousemove', onMouseMoveDrag);
    };
  }, [camera]);

  useFrame((state, delta) => {
    // Movement
    if (moveForward.current || moveBackward.current) {
        // Move in the direction the camera is facing (ignoring Y for grounded movement)
        const forward = new THREE.Vector3(0, 0, -1);
        forward.applyQuaternion(camera.quaternion);
        forward.y = 0;
        forward.normalize();

        const speed = 2.0 * delta; // Walk speed

        if (moveForward.current) camera.position.addScaledVector(forward, speed);
        if (moveBackward.current) camera.position.addScaledVector(forward, -speed);

        // Head bob
        bobRef.current += delta * 10;
        const bobAmount = Math.sin(bobRef.current) * 0.05;

        // Terrain following
        const groundHeight = getTerrainHeight(camera.position.x, camera.position.z);
        camera.position.y = groundHeight + 1.7 + bobAmount;
    } else {
        // Return to resting height slowly (and handle being pushed by terrain if we were moving and stopped?)
        // Actually, just ensure we are at correct height for current position
        bobRef.current = 0;

        const groundHeight = getTerrainHeight(camera.position.x, camera.position.z);
        // Smoothly interpolate to standing height
        camera.position.y = THREE.MathUtils.lerp(camera.position.y, groundHeight + 1.7, delta * 5);
    }
  });

  return null;
};

export default Controls;
