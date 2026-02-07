import React, { useRef, useEffect } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const Controls = () => {
  const { camera } = useThree();
  const moveForward = useRef(false);
  const moveBackward = useRef(false);
  const velocity = useRef(new THREE.Vector3());
  const direction = useRef(new THREE.Vector3());
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

    // Simple look controls
    const onMouseMove = (event) => {
        if (event.buttons === 0) { // Only look if not dragging (optional, or always look)
            // Sensitivity
            const movementX = event.movementX || 0;
            const movementY = event.movementY || 0;

            euler.current.setFromQuaternion(camera.quaternion);

            euler.current.y -= movementX * 0.002;
            euler.current.x -= movementY * 0.002;

            // Clamp pitch
            euler.current.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, euler.current.x));

            camera.quaternion.setFromEuler(euler.current);
        }
    };

    // For touch devices, maybe add touch controls later.
    // For now, let's stick to mouse/keyboard as primary for the "walk" mechanic description.
    // To make it work without pointer lock, we might just want to use the mouse position relative to center
    // but the PRD says "Drag-to-look feels natural".

    // Let's implement a drag-to-look behavior instead of pointer lock style for now
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

        euler.current.x = Math.max(-Math.PI / 3, Math.min(Math.PI / 3, euler.current.x)); // Limit looking up/down

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
    direction.current.z = Number(moveForward.current) - Number(moveBackward.current);
    direction.current.normalize();

    if (moveForward.current || moveBackward.current) {
        // Move in the direction the camera is facing (ignoring Y for grounded movement)
        const forward = new THREE.Vector3(0, 0, -1);
        forward.applyQuaternion(camera.quaternion);
        forward.y = 0;
        forward.normalize();

        const speed = 2.0 * delta; // Slow walk speed

        if (moveForward.current) camera.position.addScaledVector(forward, speed);
        if (moveBackward.current) camera.position.addScaledVector(forward, -speed);

        // Head bob
        bobRef.current += delta * 10;
        camera.position.y = 1.7 + Math.sin(bobRef.current) * 0.05;
    } else {
        // Return to resting height slowly
        camera.position.y = THREE.MathUtils.lerp(camera.position.y, 1.7, delta * 5);
        bobRef.current = 0;
    }
  });

  return null;
};

export default Controls;
