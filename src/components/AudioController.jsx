import React, { useEffect, useRef, useState, useImperativeHandle, forwardRef } from 'react';

const AudioController = forwardRef(({ region, enabled = true }, ref) => {
  const audioContextRef = useRef(null);

  // Stereo wind references
  const windLRef = useRef(null); // { src, filter, gain }
  const windRRef = useRef(null); // { src, filter, gain }

  const rustleGainRef = useRef(null);
  const insectsGainRef = useRef(null);

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

    // Create Noise Buffer (shared)
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


    // Rustle Sound Setup (Leaves/Trees) - Center
    const rustleSource = ctx.createBufferSource();
    rustleSource.buffer = noiseBuffer;
    rustleSource.loop = true;

    const rustleFilter = ctx.createBiquadFilter();
    rustleFilter.type = 'highpass';
    rustleFilter.frequency.value = 1200;

    const rustleGain = ctx.createGain();
    rustleGain.gain.value = 0.0;

    rustleSource.connect(rustleFilter);
    rustleFilter.connect(rustleGain);
    rustleGain.connect(ctx.destination);
    rustleSource.start();
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
        rustleSource.stop();
        insectSource.stop();
      } catch (e) {
        // Ignore errors if already stopped
      }
      ctx.close();
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
      const windIntensity = region.windIntensity || 0.5;
      const now = ctx.currentTime;

      // Stereo Wind Updates
      // We offset the fluctuation for L and R to create movement
      const flucL = Math.sin(time * 0.4) * 0.5 + 0.5;
      const flucR = Math.sin(time * 0.4 + 2.0) * 0.5 + 0.5; // Phase shifted

      const baseGain = enabled ? windIntensity * 0.05 : 0;

      if (windLRef.current) {
         const targetGainL = baseGain * (0.5 + 0.5 * flucL);
         const targetFreqL = 200 + (windIntensity * 600) * flucL;
         windLRef.current.gain.gain.setTargetAtTime(targetGainL, now, 0.5);
         windLRef.current.filter.frequency.setTargetAtTime(targetFreqL, now, 0.5);
      }

      if (windRRef.current) {
         const targetGainR = baseGain * (0.5 + 0.5 * flucR);
         const targetFreqR = 200 + (windIntensity * 600) * flucR;
         windRRef.current.gain.gain.setTargetAtTime(targetGainR, now, 0.5);
         windRRef.current.filter.frequency.setTargetAtTime(targetFreqR, now, 0.5);
      }

      // Rustle logic
      if (rustleGainRef.current) {
        const rustleBase = enabled ? windIntensity * 0.03 : 0;
        const rustleTarget = rustleBase * Math.pow(fluctuation, 2);
        rustleGainRef.current.gain.setTargetAtTime(rustleTarget, now, 0.2);
      }

      // Insects logic
      // More insects if low wind intensity? Or based on region?
      // Let's say insects are constant but subtle, fading out in high wind
      if (insectsGainRef.current) {
          const insectBase = enabled ? 0.015 : 0;
          // Fade out insects as wind increases
          const windSuppress = Math.max(0, 1.0 - windIntensity);
          // Pulse insects
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
  }, [isReady, region, enabled]);

  // Birds Logic (kept same but ensured panner is stereo)
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
