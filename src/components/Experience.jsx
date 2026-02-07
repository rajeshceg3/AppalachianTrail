import React, { Suspense, useState, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment, PerspectiveCamera, Loader } from '@react-three/drei';
import Scene from './Scene';
import { motion, AnimatePresence } from 'framer-motion';

const Experience = ({ onBackToMap }) => {
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setLoaded(true), 1000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="w-full h-full relative bg-[#d6d3d1]">
      <Canvas shadows>
        <PerspectiveCamera makeDefault position={[0, 1.7, 8]} fov={40} />

        {/* Georgia: Warm morning fog, golden sunlight */}
        <color attach="background" args={['#e7e5e4']} />
        <fog attach="fog" args={['#e7e5e4', 2, 25]} />

        <Suspense fallback={null}>
          <Scene />
          <Environment preset="forest" />
        </Suspense>

        <OrbitControls
          enablePan={false}
          enableZoom={false}
          maxPolarAngle={Math.PI / 1.8}
          minPolarAngle={Math.PI / 2.2}
          maxAzimuthAngle={Math.PI / 6}
          minAzimuthAngle={-Math.PI / 6}
          rotateSpeed={0.3}
        />
      </Canvas>

      <AnimatePresence>
        {!loaded && (
          <motion.div
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 2 }}
            className="absolute inset-0 z-50 bg-stone-100 flex items-center justify-center"
          >
            <div className="text-[10px] tracking-[0.5em] uppercase text-stone-400">Entering Georgia</div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: loaded ? 1 : 0 }}
        transition={{ delay: 1, duration: 2 }}
        className="absolute top-8 left-8 z-10"
      >
        <button
          onClick={onBackToMap}
          className="text-[10px] tracking-[0.4em] uppercase text-stone-500 hover:text-stone-800 transition-colors duration-700 cursor-pointer"
        >
          ← Map
        </button>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: loaded ? 1 : 0, y: 0 }}
        transition={{ delay: 2, duration: 3 }}
        className="absolute bottom-12 left-1/2 -translate-x-1/2 pointer-events-none text-center z-10"
      >
        <h3 className="text-stone-600 text-sm tracking-[0.5em] uppercase font-light">Springer Mountain</h3>
        <p className="text-stone-400 text-[9px] tracking-[0.3em] uppercase mt-4">Morning air. The trail begins.</p>
      </motion.div>

      <Loader />
    </div>
  );
};

export default Experience;
