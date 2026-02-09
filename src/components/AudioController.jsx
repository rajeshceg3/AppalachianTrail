import React, { useEffect, useRef, useState, useImperativeHandle, forwardRef } from 'react';
import { useThree } from '@react-three/fiber';

const AudioController = forwardRef(({ region, enabled = true }, ref) => {
  const audioContextRef = useRef(null);
  const { camera } = useThree(); // Access camera for height-based modulation

  // Stereo wind references
  const windLRef = useRef(null); // { src, filter, gain }
  const windRRef = useRef(null); // { src, filter, gain }

  const rustleGainRef = useRef(null);
  const insectsGainRef = useRef(null);

  // Buffers
  const gravelBufferRef = useRef(null);

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
    if (!audioContextRef.current || !gravelBufferRef.current) return;
    const ctx = audioContextRef.current;

    if (ctx.state === 'suspended') {
        ctx.resume().catch(() => {});
    }

    const t = ctx.currentTime;

    // 1. Low Thud (Impact)
    const thudOsc = ctx.createOscillator();
    thudOsc.type = 'sine';
    thudOsc.frequency.setValueAtTime(80, t);
    thudOsc.frequency.exponentialRampToValueAtTime(30, t + 0.1);

    const thudGain = ctx.createGain();
    thudGain.gain.setValueAtTime(0.15, t); // Slightly louder
    thudGain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);

    thudOsc.connect(thudGain);
    thudGain.connect(ctx.destination);

    thudOsc.start(t);
    thudOsc.stop(t + 0.15);

    // 2. Gravel Crunch (High Frequency Noise)
    const crunchSrc = ctx.createBufferSource();
    crunchSrc.buffer = gravelBufferRef.current;

    // Randomize playback rate for variety
    crunchSrc.playbackRate.value = 0.8 + Math.random() * 0.4;

    const crunchFilter = ctx.createBiquadFilter();
    crunchFilter.type = 'bandpass';
    crunchFilter.frequency.value = 1200 + Math.random() * 400;
    crunchFilter.Q.value = 1.0;

    const crunchGain = ctx.createGain();
    crunchGain.gain.setValueAtTime(0.08, t);
    crunchGain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);

    crunchSrc.connect(crunchFilter);
    crunchFilter.connect(crunchGain);
    crunchGain.connect(ctx.destination);

    crunchSrc.start(t);
  };

  // Initialize Audio
  useEffect(() => {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    const ctx = new AudioContext();
    audioContextRef.current = ctx;

    // Create Noise Buffer (shared for wind/ambience)
    const bufferSize = 2 * ctx.sampleRate;
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    let lastOut = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      // Pink-ish noise
      output[i] = (lastOut + (0.02 * white)) / 1.02;
      lastOut = output[i];
      output[i] *= 3.5;
    }

    // Create Gravel Buffer (White noise for crisp crunch)
    const gSize = ctx.sampleRate * 0.2; // 200ms
    const gBuffer = ctx.createBuffer(1, gSize, ctx.sampleRate);
    const gData = gBuffer.getChannelData(0);
    for(let i=0; i<gSize; i++) {
        gData[i] = (Math.random() * 2 - 1) * 0.8; // Slightly quieter base
    }
    gravelBufferRef.current = gBuffer;

    // Helper to create a wind layer
    const createWindLayer = (pan) => {
        const src = ctx.createBufferSource();
        src.buffer = noiseBuffer;
        src.loop = true;

        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 400;

        const gain = ctx.createGain();
        gain.gain.value = 0.001;

        const panner = ctx.createStereoPanner();
        panner.pan.value = pan;

        src.connect(filter).connect(gain).connect(panner).connect(ctx.destination);
        src.start();

        return { src, filter, gain };
    };

    // Stereo Wind
    windLRef.current = createWindLayer(-0.6);
    windRRef.current = createWindLayer(0.6);


    // Rustle Sound Setup (Leaves/Trees) - Stereo
    // Use 2 sources for width
    const createRustleLayer = (pan) => {
        const src = ctx.createBufferSource();
        src.buffer = noiseBuffer;
        src.loop = true;

        const filter = ctx.createBiquadFilter();
        filter.type = 'highpass';
        filter.frequency.value = 1200;

        const gain = ctx.createGain();
        gain.gain.value = 0.0;

        const panner = ctx.createStereoPanner();
        panner.pan.value = pan;

        src.connect(filter).connect(gain).connect(panner).connect(ctx.destination);
        src.start();
        return gain;
    }

    // We'll control one gain ref but apply to both? Or simple center channel?
    // Let's keep it simple: Just one gain ref controlling a center source for now,
    // or maybe create a stereo effect here too.
    // The previous implementation was mono (center). Let's make it stereo-ish.
    const rustleGain = createRustleLayer(0); // Center for now to avoid complexity
    rustleGainRef.current = rustleGain;

    // Insects / Nature Ambience
    const insectSource = ctx.createBufferSource();
    insectSource.buffer = noiseBuffer;
    insectSource.loop = true;

    const insectFilter = ctx.createBiquadFilter();
    insectFilter.type = 'highpass';
    insectFilter.frequency.value = 4000;

    const insectGain = ctx.createGain();
    insectGain.gain.value = 0.0;

    insectSource.connect(insectFilter).connect(insectGain).connect(ctx.destination);
    insectSource.start();
    insectsGainRef.current = insectGain;

    setIsReady(true);

    return () => {
      try {
        windLRef.current?.src.stop();
        windRRef.current?.src.stop();
        insectSource.stop();
        ctx.close();
      } catch (e) {}
      setIsReady(false);
    };
  }, []);

  // Update Ambience
  useEffect(() => {
    if (!isReady || !audioContextRef.current) return;

    let animationFrameId;
    const ctx = audioContextRef.current;

    const updateAudio = () => {
      const time = Date.now() / 1000;
      const fluctuation = Math.sin(time * 0.5) * 0.5 + 0.5;

      // Calculate effective wind intensity based on height
      const camY = camera.position.y;
      // Base assumption: Terrain is roughly 0-20. Peaks might be 50.
      // Boost wind as we go up.
      // At Y=0, factor is 1.0. At Y=50, factor is 2.0.
      const heightFactor = 1.0 + (Math.max(0, camY) / 50.0);

      let windIntensity = (region.windIntensity || 0.5) * heightFactor;
      // Clamp to reasonable max
      windIntensity = Math.min(1.2, windIntensity);

      const now = ctx.currentTime;

      // Stereo Wind Updates
      const flucL = Math.sin(time * 0.4) * 0.5 + 0.5;
      const flucR = Math.sin(time * 0.4 + 2.0) * 0.5 + 0.5;

      const baseGain = enabled ? windIntensity * 0.05 : 0;

      if (windLRef.current) {
         const targetGainL = baseGain * (0.5 + 0.5 * flucL);
         // Wind howls more (higher freq) at intensity
         const targetFreqL = 200 + (windIntensity * 800) * flucL;
         windLRef.current.gain.gain.setTargetAtTime(targetGainL, now, 0.5);
         windLRef.current.filter.frequency.setTargetAtTime(targetFreqL, now, 0.5);
      }

      if (windRRef.current) {
         const targetGainR = baseGain * (0.5 + 0.5 * flucR);
         const targetFreqR = 200 + (windIntensity * 800) * flucR;
         windRRef.current.gain.gain.setTargetAtTime(targetGainR, now, 0.5);
         windRRef.current.filter.frequency.setTargetAtTime(targetFreqR, now, 0.5);
      }

      // Rustle logic
      if (rustleGainRef.current) {
        // Rustle increases with wind, but maybe less at very high altitudes (above treeline)?
        // Assuming treeline is around 40?
        // Let's just keep it coupled to windIntensity for now.
        const rustleBase = enabled ? windIntensity * 0.03 : 0;
        const rustleTarget = rustleBase * Math.pow(fluctuation, 2);
        rustleGainRef.current.gain.setTargetAtTime(rustleTarget, now, 0.2);
      }

      // Insects logic
      if (insectsGainRef.current) {
          const insectBase = enabled ? 0.015 : 0;
          // Fade out insects as wind increases (realism)
          const windSuppress = Math.max(0, 1.0 - windIntensity * 0.8);
          const insectPulse = 0.8 + Math.sin(time * 8) * 0.2;

          const targetInsect = insectBase * windSuppress * insectPulse;
          insectsGainRef.current.gain.setTargetAtTime(targetInsect, now, 0.5);
      }

      animationFrameId = requestAnimationFrame(updateAudio);
    };

    updateAudio();

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [isReady, region, enabled, camera]); // Added camera to deps, though it's stable

  // Birds Logic
  useEffect(() => {
    if (!isReady || !audioContextRef.current) return;

    let timeoutId;
    let isActive = true;

    const playBird = () => {
      if (!isActive) return;

      if (enabled) {
        const birdActivity = region.birdActivity || 0.3;
        // Reduce birds in high wind
        const windIntensity = region.windIntensity || 0.5;
        const probability = birdActivity * (1.0 - windIntensity * 0.5);

        if (Math.random() < probability) {
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

    timeoutId = setTimeout(playBird, 2000);

    return () => {
      isActive = false;
      clearTimeout(timeoutId);
    };
  }, [isReady, region, enabled]);

  return null;
});

export default AudioController;
