import React, { useEffect, useRef, useState, useImperativeHandle, forwardRef } from 'react';

const AudioController = forwardRef(({ region, enabled = true }, ref) => {
  const audioContextRef = useRef(null);
  const windNodeRef = useRef(null);
  const windGainRef = useRef(null);
  const windFilterRef = useRef(null);
  const rustleGainRef = useRef(null);

  const [isReady, setIsReady] = useState(false);

  // Expose methods to parent
  useImperativeHandle(ref, () => ({
    playFootstep: () => {
      if (enabled) triggerFootstep();
    },
    resume: () => {
      if (audioContextRef.current?.state === 'suspended') {
        audioContextRef.current.resume();
      }
    }
  }));

  const triggerFootstep = () => {
    if (!audioContextRef.current) return;
    const ctx = audioContextRef.current;

    if (ctx.state === 'suspended') {
        ctx.resume().catch(() => {});
    }

    const t = ctx.currentTime;
    const bufferSize = ctx.sampleRate * 0.1; // 100ms
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 600 + Math.random() * 200;
    filter.Q.value = 1.0;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.05, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.1);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    noise.start(t);

    // Add low-frequency "thud" for impact
    const thudOsc = ctx.createOscillator();
    thudOsc.type = 'sine';
    thudOsc.frequency.setValueAtTime(100, t);
    thudOsc.frequency.exponentialRampToValueAtTime(40, t + 0.1);

    const thudGain = ctx.createGain();
    thudGain.gain.setValueAtTime(0.08, t);
    thudGain.gain.exponentialRampToValueAtTime(0.001, t + 0.1);

    thudOsc.connect(thudGain);
    thudGain.connect(ctx.destination);

    thudOsc.start(t);
    thudOsc.stop(t + 0.15);
  };

  // Initialize Audio
  useEffect(() => {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    const ctx = new AudioContext();
    audioContextRef.current = ctx;

    // Wind Sound Setup
    const bufferSize = 2 * ctx.sampleRate;
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    let lastOut = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      output[i] = (lastOut + (0.02 * white)) / 1.02;
      lastOut = output[i];
      output[i] *= 3.5;
    }

    const windSource = ctx.createBufferSource();
    windSource.buffer = noiseBuffer;
    windSource.loop = true;

    const windFilter = ctx.createBiquadFilter();
    windFilter.type = 'lowpass';
    windFilter.frequency.value = 400;

    const windGain = ctx.createGain();
    windGain.gain.value = 0.001;

    windSource.connect(windFilter);
    windFilter.connect(windGain);
    windGain.connect(ctx.destination);

    windSource.start();

    windNodeRef.current = windSource;
    windFilterRef.current = windFilter;
    windGainRef.current = windGain;

    // Rustle Sound Setup (Leaves/Trees)
    const rustleSource = ctx.createBufferSource();
    rustleSource.buffer = noiseBuffer;
    rustleSource.loop = true;

    const rustleFilter = ctx.createBiquadFilter();
    rustleFilter.type = 'highpass';
    rustleFilter.frequency.value = 1200; // Higher frequency for leaves

    const rustleGain = ctx.createGain();
    rustleGain.gain.value = 0.0;

    rustleSource.connect(rustleFilter);
    rustleFilter.connect(rustleGain);
    rustleGain.connect(ctx.destination);

    rustleSource.start();
    rustleGainRef.current = rustleGain;

    setIsReady(true);

    return () => {
      try {
        windSource.stop();
        rustleSource.stop();
      } catch (e) {
        // Ignore errors if already stopped
      }
      ctx.close();
      setIsReady(false);
    };
  }, []);

  // Update Wind
  useEffect(() => {
    if (!isReady || !audioContextRef.current) return;

    let animationFrameId;
    const ctx = audioContextRef.current;

    const updateWind = () => {
      if (!windGainRef.current || !windFilterRef.current) return;

      const time = Date.now() / 1000;
      const fluctuation = Math.sin(time * 0.5) * 0.5 + 0.5;

      const windIntensity = region.windIntensity || 0.5;
      const baseGain = enabled ? windIntensity * 0.05 : 0;

      const targetGain = baseGain * (0.5 + 0.5 * fluctuation);
      const targetFreq = 200 + (windIntensity * 600) * fluctuation;

      const now = ctx.currentTime;
      windGainRef.current.gain.setTargetAtTime(targetGain, now, 0.5);
      windFilterRef.current.frequency.setTargetAtTime(targetFreq, now, 0.5);

      // Rustle logic (more reactive to wind)
      if (rustleGainRef.current) {
        const rustleBase = enabled ? windIntensity * 0.03 : 0;
        // Rustle happens more at peak wind
        const rustleTarget = rustleBase * Math.pow(fluctuation, 2);
        rustleGainRef.current.gain.setTargetAtTime(rustleTarget, now, 0.2);
      }

      animationFrameId = requestAnimationFrame(updateWind);
    };

    updateWind();

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [isReady, region, enabled]);

  // Birds Logic
  useEffect(() => {
    if (!isReady || !audioContextRef.current) return;

    let timeoutId;
    let isActive = true;

    const playBird = () => {
      if (!isActive) return;

      if (enabled) {
        const birdActivity = region.birdActivity || 0.3;

        if (Math.random() < birdActivity) {
          const ctx = audioContextRef.current;
          if (ctx.state === 'suspended') ctx.resume().catch(() => {});

          const t = ctx.currentTime;
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          const panner = ctx.createStereoPanner();

          panner.pan.value = (Math.random() * 2) - 1;

          osc.connect(gain);
          gain.connect(panner);
          panner.connect(ctx.destination);

          const freq = 2000 + Math.random() * 3000;
          osc.frequency.setValueAtTime(freq, t);

          gain.gain.setValueAtTime(0, t);
          gain.gain.linearRampToValueAtTime(0.02, t + 0.05);
          gain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);

          osc.start(t);
          osc.stop(t + 0.25);
        }
      }

      const nextDelay = 3000 + Math.random() * 5000;
      timeoutId = setTimeout(playBird, nextDelay);
    };

    // Initial delay
    timeoutId = setTimeout(playBird, 2000);

    return () => {
      isActive = false;
      clearTimeout(timeoutId);
    };
  }, [isReady, region, enabled]);

  return null;
});

export default AudioController;
