import React, { Suspense, useState, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { Environment, PerspectiveCamera, Loader } from '@react-three/drei';
import Scene from './Scene';
import AudioController from './AudioController';
import { motion, AnimatePresence } from 'framer-motion';

const Experience = ({ selectedRegion, onBackToMap }) => {
  const [loaded, setLoaded] = useState(false);
  const [audioEnabled, setAudioEnabled] = useState(false);

  useEffect(() => {
    // Reset loaded state when region changes
    setLoaded(false);
    const timer = setTimeout(() => setLoaded(true), 1500);
    return () => clearTimeout(timer);
  }, [selectedRegion]);

  return (
    <div className="w-full h-full relative" style={{ backgroundColor: selectedRegion.color }}>
      <Canvas shadows>
        <PerspectiveCamera makeDefault position={[0, 1.7, 8]} fov={40} />

        <color attach="background" args={[selectedRegion.fogColor]} />

        <Suspense fallback={null}>
          <Scene region={selectedRegion} />
          <Environment preset={selectedRegion.environment} />
        </Suspense>
      </Canvas>

      <AnimatePresence mode='wait'>
        {!loaded && (
          <motion.div
            key="loader"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.5 }}
            className="absolute inset-0 z-50 flex items-center justify-center bg-stone-100"
          >
            <div className="text-[10px] tracking-[0.5em] uppercase text-stone-400">Entering {selectedRegion.name}</div>
          </motion.div>
        )}
      </AnimatePresence>

      <AudioController
        windIntensity={selectedRegion.windIntensity}
        birdActivity={selectedRegion.birdActivity}
        enabled={audioEnabled}
      />

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
        initial={{ opacity: 0 }}
        animate={{ opacity: loaded ? 1 : 0 }}
        transition={{ delay: 1.2, duration: 2 }}
        className="absolute top-8 right-8 z-10"
      >
        <button
          onClick={() => setAudioEnabled(!audioEnabled)}
          className="text-[10px] tracking-[0.4em] uppercase text-stone-500 hover:text-stone-800 transition-colors duration-700 cursor-pointer"
        >
          {audioEnabled ? 'MUTE' : 'AUDIO'}
        </button>
      </motion.div>

      <motion.div
        key={selectedRegion.id} // Re-animate when region changes
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: loaded ? 1 : 0, y: 0 }}
        transition={{ delay: 2, duration: 3 }}
        className="absolute bottom-12 left-1/2 -translate-x-1/2 pointer-events-none text-center z-10 w-full px-4"
      >
        <h3 className="text-stone-600 text-sm tracking-[0.5em] uppercase font-light">{selectedRegion.name}</h3>
        <p className="text-stone-400 text-[9px] tracking-[0.3em] uppercase mt-4">{selectedRegion.details}</p>
      </motion.div>

      <Loader />
    </div>
  );
};

export default Experience;
