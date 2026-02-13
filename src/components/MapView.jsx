import React, { useRef, useEffect, useMemo, useState } from 'react';
import { motion, useScroll, useSpring, useTransform } from 'framer-motion';
import MapAmbience from './MapAmbience';

const RegionNode = ({ region, index, onSelect, isEven }) => {
  return (
    <div className={`relative flex w-full max-w-5xl py-32 ${isEven ? 'justify-start' : 'justify-end'}`}>
      {/* Node Content */}
      <motion.div
        initial={{ opacity: 0, x: isEven ? -50 : 50 }}
        whileInView={{ opacity: 1, x: 0 }}
        viewport={{ once: true, margin: "-20%" }}
        transition={{ duration: 1, ease: "easeOut" }}
        className={`w-1/2 flex ${isEven ? 'flex-row' : 'flex-row-reverse'} items-center gap-8 px-12`}
        onClick={() => onSelect(region.id)}
      >
        {/* Circle Marker */}
        <motion.div
            whileHover={{ scale: 1.2 }}
            className="relative shrink-0 cursor-pointer"
        >
            <div className="w-6 h-6 rounded-full border-2 border-stone-300 bg-stone-100 relative z-10" />
            <motion.div
                className="absolute inset-0 rounded-full bg-stone-200 blur-md"
                animate={{ scale: [1, 1.5, 1] }}
                transition={{ duration: 3, repeat: Infinity }}
            />
        </motion.div>

        {/* Text Info */}
        <div className={`flex flex-col ${isEven ? 'items-start text-left' : 'items-end text-right'} cursor-pointer group`}>
             <h3 className="text-2xl font-light tracking-[0.2em] uppercase text-stone-600 group-hover:text-stone-900 transition-colors duration-500">
                {region.name}
             </h3>
             <p className="text-xs tracking-[0.15em] text-stone-400 mt-2 uppercase max-w-xs leading-relaxed group-hover:text-stone-600 transition-colors duration-500">
                {region.desc}
             </p>
        </div>
      </motion.div>
    </div>
  );
};

const MapView = ({ regions, onSelectRegion }) => {
  const containerRef = useRef(null);
  const [isZooming, setIsZooming] = useState(false);

  // Reverse regions to show Maine (North) at top, Georgia (South) at bottom
  // The user will start at the bottom and scroll up.
  const reversedRegions = useMemo(() => [...regions].reverse(), [regions]);

  useEffect(() => {
    // Start at the bottom (South / Georgia)
    window.scrollTo(0, document.body.scrollHeight);
  }, []);

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start end", "end start"]
  });

  const smoothProgress = useSpring(scrollYProgress, { stiffness: 400, damping: 90 });
  // Map scroll (1 -> 0) to path drawing (0 -> 1)
  // 1 is bottom (start), 0 is top (end)
  const pathLength = useTransform(smoothProgress, [0.99, 0.01], [0, 1]);

  const handleSelect = (id) => {
      setIsZooming(true);
      setTimeout(() => {
          onSelectRegion(id);
      }, 1500);
  };

  // Generate path points dynamically based on reversedRegions (Maine at Top, Georgia at Bottom)
  // We construct the path from Bottom (Georgia) to Top (Maine) so it draws upwards.
  const heightPerStep = 400;
  const totalHeight = reversedRegions.length * heightPerStep;

  const generatePath = () => {
      const points = [];
      const steps = reversedRegions.length;

      // Start from the Bottom (Last Index)
      for (let i = steps - 1; i >= 0; i--) {
          const isEven = i % 2 === 0;
          const x = isEven ? 25 : 75;
          const y = (i * heightPerStep) + 200;

          if (i === steps - 1) {
              // Start point (Bottom most node)
              points.push(`M ${x} ${y + 200}`);
              points.push(`L ${x} ${y}`);
          } else {
              // Curve from previous point (which was i+1, lower on screen) to current (i)
              const prevY = ((i+1) * heightPerStep) + 200;
              const prevX = (i+1) % 2 === 0 ? 25 : 75;

              const midY = (prevY + y) / 2;
              points.push(`C ${prevX} ${midY}, ${x} ${midY}, ${x} ${y}`);
          }
      }

      // End line fading out at Top
      const topX = 0 % 2 === 0 ? 25 : 75;
      const topY = 200;
      points.push(`L ${topX} ${topY - 200}`);

      return points.join(" ");
  };

  return (
    <div ref={containerRef} className="w-full relative bg-[#fcfaf7] min-h-screen overflow-hidden">
        <MapAmbience scrollYProgress={scrollYProgress} />

        <motion.div
            className="relative w-full h-full"
            animate={isZooming ? { scale: 1.5, opacity: 0, filter: "blur(10px)" } : { scale: 1, opacity: 1, filter: "blur(0px)" }}
            transition={{ duration: 1.5, ease: "easeInOut" }}
        >
            {/* Atmospheric Background Gradient */}
            <div className="fixed inset-0 bg-gradient-to-b from-stone-50 via-stone-100 to-stone-200 opacity-50 pointer-events-none" />

            <div className="relative max-w-5xl mx-auto pt-32 pb-64">
                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 2 }}
                    className="text-center mb-32 relative z-10"
                >
                    <h2 className="text-xs font-light tracking-[0.5em] uppercase text-stone-400">The Path North</h2>
                    <div className="w-px h-16 bg-stone-300 mx-auto mt-8" />
                </motion.div>

                {/* SVG Path Layer */}
                <div className="absolute top-0 left-0 w-full h-full pointer-events-none z-0">
                    <svg
                        width="100%"
                        height="100%"
                        viewBox={`0 0 100 ${totalHeight}`}
                        preserveAspectRatio="none"
                        className="opacity-40"
                    >
                        <motion.path
                            d={generatePath()}
                            stroke="#a8a29e"
                            strokeWidth="0.5"
                            fill="none"
                            style={{ pathLength }}
                        />
                    </svg>
                </div>

                {/* Regions List */}
                <div className="relative z-10 space-y-32">
                    {reversedRegions.map((region, index) => (
                        <RegionNode
                            key={region.id}
                            region={region}
                            index={index}
                            onSelect={handleSelect}
                            isEven={index % 2 === 0}
                        />
                    ))}
                </div>

                {/* Footer */}
                <div className="text-center mt-32">
                    <div className="text-[10px] tracking-[0.3em] uppercase text-stone-400">Katahdin Awaits</div>
                </div>
            </div>
        </motion.div>
    </div>
  );
};

export default MapView;
