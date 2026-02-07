import React from 'react';
import { motion } from 'framer-motion';

const MapView = ({ regions, onSelectRegion }) => {
  return (
    <div className="w-full h-full flex items-center justify-center bg-[#fcfaf7] overflow-hidden">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 3 }}
        className="relative w-full max-w-5xl h-[85vh] flex flex-col items-center justify-center"
      >
        {/* Abstract Topographic Background */}
        <div className="absolute inset-0 flex items-center justify-center opacity-20 pointer-events-none">
          <svg width="100%" height="100%" viewBox="0 0 800 600" fill="none" xmlns="http://www.w3.org/2000/svg">
            <motion.path
              d="M100 300C150 250 250 350 350 300C450 250 550 350 650 300"
              stroke="#d6d3d1"
              strokeWidth="0.5"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 4, ease: "easeInOut" }}
            />
            <motion.path
              d="M100 320C150 270 250 370 350 320C450 270 550 370 650 320"
              stroke="#d6d3d1"
              strokeWidth="0.5"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 4, delay: 0.5, ease: "easeInOut" }}
            />
            <motion.path
              d="M100 280C150 230 250 330 350 280C450 230 550 330 650 280"
              stroke="#d6d3d1"
              strokeWidth="0.5"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 4, delay: 0.2, ease: "easeInOut" }}
            />
          </svg>
        </div>

        <div className="z-10 flex flex-col space-y-16 items-center">
          <motion.h2
            initial={{ opacity: 0, letterSpacing: "0.2em" }}
            animate={{ opacity: 1, letterSpacing: "0.5em" }}
            transition={{ duration: 2, delay: 1 }}
            className="text-xs font-light uppercase text-stone-400"
          >
            The Trail Path
          </motion.h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-32 gap-y-16">
            {regions.map((region, index) => (
              <motion.div
                key={region.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.5 + index * 0.2, duration: 2 }}
                className="group relative flex flex-col items-center cursor-pointer p-6"
                onClick={() => onSelectRegion(region.id)}
              >
                {/* Soft Glow Background */}
                <motion.div
                  className="absolute inset-0 bg-stone-200 blur-xl rounded-full opacity-0 group-hover:opacity-40 transition-opacity duration-700"
                  layoutId={`glow-${region.id}`}
                />

                <div className="relative z-10 flex flex-col items-center">
                  <div className="relative">
                    <div className="text-xs tracking-[0.4em] uppercase transition-all duration-1000 text-stone-300 group-hover:text-stone-900 group-hover:tracking-[0.5em]">
                      {region.name}
                    </div>
                    <motion.div
                        className="absolute -left-6 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-stone-400 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                      />
                  </div>
                  <div className="h-4 overflow-hidden mt-2">
                    <div className="text-[9px] tracking-[0.2em] uppercase text-stone-400 opacity-0 group-hover:opacity-100 transition-all duration-700 transform translate-y-2 group-hover:translate-y-0">
                      {region.desc}
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        <motion.div
          className="absolute bottom-0 w-px h-16 bg-gradient-to-t from-stone-300 to-transparent"
          initial={{ scaleY: 0 }}
          animate={{ scaleY: 1 }}
          transition={{ delay: 2.5, duration: 2 }}
        />
      </motion.div>
    </div>
  );
};

export default MapView;
