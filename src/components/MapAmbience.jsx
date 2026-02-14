import React, { useEffect, useRef } from 'react';

const MapAmbience = ({ scrollYProgress }) => {
  const audioContextRef = useRef(null);
  const windNodeRef = useRef(null); // { source, filter, gain }
  const warmthNodeRef = useRef(null); // { osc, gain }
  const isStarted = useRef(false);

  useEffect(() => {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    const ctx = new AudioContext();
    audioContextRef.current = ctx;

    // --- Pink Noise Generation ---
    const bufferSize = 2 * ctx.sampleRate;
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      b3 = 0.86650 * b3 + white * 0.3104856;
      b4 = 0.55000 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.0168980;
      output[i] = b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362;
      output[i] *= 0.11; // (roughly) compensate for gain
      b6 = white * 0.115926;
    }

    // --- Wind Node Setup ---
    const windSource = ctx.createBufferSource();
    windSource.buffer = noiseBuffer;
    windSource.loop = true;

    const windFilter = ctx.createBiquadFilter();
    windFilter.type = 'lowpass';
    windFilter.frequency.value = 200; // Start low

    const windGain = ctx.createGain();
    windGain.gain.value = 0.0; // Start silent

    windSource.connect(windFilter).connect(windGain).connect(ctx.destination);
    windSource.start();
    windNodeRef.current = { source: windSource, filter: windFilter, gain: windGain };

    // --- Warmth Node (Southern Drone) Setup ---
    const warmthOsc = ctx.createOscillator();
    warmthOsc.type = 'sine';
    warmthOsc.frequency.value = 60; // Low hum

    const warmthGain = ctx.createGain();
    warmthGain.gain.value = 0.0;

    warmthOsc.connect(warmthGain).connect(ctx.destination);
    warmthOsc.start();
    warmthNodeRef.current = { osc: warmthOsc, gain: warmthGain };

    // Fade In
    windGain.gain.setTargetAtTime(0.05, ctx.currentTime, 2.0);
    warmthGain.gain.setTargetAtTime(0.1, ctx.currentTime, 2.0);

    isStarted.current = true;

    const unlockAudio = () => {
        if (ctx.state === 'suspended') {
            ctx.resume().catch(() => {});
        }
    };

    window.addEventListener('click', unlockAudio);
    window.addEventListener('touchstart', unlockAudio);
    window.addEventListener('keydown', unlockAudio);

    return () => {
      window.removeEventListener('click', unlockAudio);
      window.removeEventListener('touchstart', unlockAudio);
      window.removeEventListener('keydown', unlockAudio);

      try {
        windGain.gain.setTargetAtTime(0, ctx.currentTime, 0.5);
        warmthGain.gain.setTargetAtTime(0, ctx.currentTime, 0.5);
      } catch (e) {}

      setTimeout(() => {
          try {
            windSource.stop();
            warmthOsc.stop();
            ctx.close();
          } catch (e) {}
      }, 600);
      isStarted.current = false;
    };
  }, []);

  // Modulate Sound based on Scroll
  useEffect(() => {
    if (!scrollYProgress) return;

    const unsubscribe = scrollYProgress.on("change", (latest) => {
      if (!audioContextRef.current || !isStarted.current) return;
      const ctx = audioContextRef.current;
      const t = ctx.currentTime;

      // latest: 0 (Top/Maine/North) -> 1 (Bottom/Georgia/South)
      // Visuals are reversed, but scroll is standard.
      // Top of page (latest=0) is Maine.
      // Bottom of page (latest=1) is Georgia.

      // We want:
      // North (0): Windy, Cold. High filter frequency. Less warmth drone.
      // South (1): Calm, Warm. Low filter frequency. More warmth drone.

      const southFactor = latest; // 1.0 = Georgia, 0.0 = Maine

      // Wind Filter:
      // South: 200Hz (Muffled)
      // North: 800Hz (Gusty)
      const targetFreq = 800 - (southFactor * 600);
      windNodeRef.current.filter.frequency.setTargetAtTime(targetFreq, t, 0.2);

      // Wind Volume:
      // North: Louder (0.08)
      // South: Quieter (0.02)
      const targetWindVol = 0.08 - (southFactor * 0.06);
      windNodeRef.current.gain.gain.setTargetAtTime(targetWindVol, t, 0.2);

      // Warmth Drone Volume:
      // North: Silent (0.0)
      // South: Audible (0.15)
      const targetWarmthVol = southFactor * 0.15;
      warmthNodeRef.current.gain.gain.setTargetAtTime(targetWarmthVol, t, 0.2);

      // Warmth Pitch:
      // Slight variation? Maybe steady 60Hz is fine.
    });

    return () => unsubscribe();
  }, [scrollYProgress]);

  return null;
};

export default MapAmbience;
