import React from 'react';
import { motion } from 'framer-motion';

const Landing = ({ onStart }) => {
  return (
    <div className="flex flex-col items-center justify-center w-full h-screen text-stone-800">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 3, ease: "easeInOut" }}
        className="text-center space-y-12"
      >
        <h1 className="text-4xl font-light tracking-[0.3em] uppercase text-stone-700">
          Walk the Appalachian Trail
        </h1>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 2, duration: 2 }}
        >
          <button
            onClick={onStart}
            className="px-12 py-4 border border-stone-200 rounded-full text-stone-400 hover:text-stone-800 hover:border-stone-400 transition-all duration-1000 ease-in-out cursor-pointer tracking-[0.2em] text-sm uppercase"
          >
            Begin
          </button>
        </motion.div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 3, duration: 2 }}
        className="absolute bottom-12 text-stone-300 text-[10px] font-light tracking-[0.4em] uppercase"
      >
        A meditative journey
      </motion.div>
    </div>
  );
};

export default Landing;
