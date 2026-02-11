import React, { useEffect, useRef, useState, useImperativeHandle, forwardRef } from 'react';
import { useThree, useFrame } from '@react-three/fiber';

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


    // Rustle Sound Setup (Leaves/Trees) - "Canopy Layer"
    // Use stereo width but centered logic
    const createRustleLayer = () => {
        const src = ctx.createBufferSource();
        src.buffer = noiseBuffer;
        src.loop = true;

        // Bandpass for "leafy" texture (cutting lows and harsh highs)
        const highPass = ctx.createBiquadFilter();
        highPass.type = 'highpass';
        highPass.frequency.value = 800;

        const lowPass = ctx.createBiquadFilter();
        lowPass.type = 'lowpass';
        lowPass.frequency.value = 6000;

        const gain = ctx.createGain();
        gain.gain.value = 0.0;

        // Slight stereo width
        const panner = ctx.createStereoPanner();
        panner.pan.value = 0;

        src.connect(highPass).connect(lowPass).connect(gain).connect(panner).connect(ctx.destination);
        src.start();
        return gain;
    }

    const rustleGain = createRustleLayer();
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

  // Update Ambience (Synced with useFrame)
  useFrame((state) => {
    if (!isReady || !audioContextRef.current) return;

    const ctx = audioContextRef.current;
    const time = state.clock.elapsedTime; // Use visual time for sync
    const camPos = camera.position;

    // Calculate effective wind intensity based on height
    const heightFactor = 1.0 + (Math.max(0, camPos.y) / 50.0);

    let windIntensity = (region.windIntensity || 0.5) * heightFactor;
    windIntensity = Math.min(1.2, windIntensity);

    const now = ctx.currentTime;

    // --- Wind Gust Logic (Synced with Visual Shader) ---
    // Matches src/materials/WindShader.js logic exactly
    // gust = sin(worldPos.x * 0.05 + time * 0.5) ...
    // We use camera position as "worldPos" so the wind sounds like it's WHERE YOU ARE.

    // Shader uses:
    // float gust = sin(worldPos.x * 0.05 + time * 0.5)
    //            + sin(worldPos.z * 0.03 + time * 0.3)
    //            + sin(worldPos.x * 0.1 + worldPos.z * 0.1 + time * 0.8) * 0.5;

    // Adjust speed factors slightly if needed, but keeping identical ensures sync.
    // Note: Shader time is uTime * uSwaySpeed. Default swaySpeed is 1.0 (approx).

    // We use the same multipliers as the shader:
    const gustVal = Math.sin(camPos.x * 0.05 + time * 0.5)
                  + Math.sin(camPos.z * 0.03 + time * 0.3)
                  + Math.sin(camPos.x * 0.1 + camPos.z * 0.1 + time * 0.8) * 0.5;

    // Shader maps gust (-2.5 to 2.5) to a multiplier (0.5 to 1.5)
    // float gustFactor = 1.0 + (gust * 0.2);
    const gustFactor = 1.0 + (gustVal * 0.2);

    // Stereo Wind Updates
    // Left/Right fluctuation (independent of gust logic, just for stereo width)
    const flucL = Math.sin(time * 0.4) * 0.5 + 0.5;
    const flucR = Math.sin(time * 0.4 + 2.0) * 0.5 + 0.5;

    const baseGain = enabled ? windIntensity * 0.05 : 0;

    if (windLRef.current) {
        // Modulate gain by gustFactor to swell with visual wind
        const targetGainL = baseGain * (0.5 + 0.5 * flucL) * gustFactor;
        // Pitch/Filter also follows gust (wind screams higher in gusts)
        const targetFreqL = 200 + (windIntensity * 800) * flucL * gustFactor;

        windLRef.current.gain.gain.setTargetAtTime(targetGainL, now, 0.1); // Fast response
        windLRef.current.filter.frequency.setTargetAtTime(targetFreqL, now, 0.1);
    }

    if (windRRef.current) {
        const targetGainR = baseGain * (0.5 + 0.5 * flucR) * gustFactor;
        const targetFreqR = 200 + (windIntensity * 800) * flucR * gustFactor;

        windRRef.current.gain.gain.setTargetAtTime(targetGainR, now, 0.1);
        windRRef.current.filter.frequency.setTargetAtTime(targetFreqR, now, 0.1);
    }

    // Rustle Logic (Canopy)
    if (rustleGainRef.current) {
      // Rustle volume follows the gust intensity strongly
      // Trees make noise when wind changes/peaks
      const rustleBase = enabled ? windIntensity * 0.04 : 0;

      // Peak rustle at high gust factors
      // Use square to accentuate peaks
      const rustleTarget = rustleBase * (gustFactor * gustFactor);

      rustleGainRef.current.gain.setTargetAtTime(rustleTarget, now, 0.2);
    }

    // Insects logic
    if (insectsGainRef.current) {
        const insectBase = enabled ? 0.015 : 0;
        // Fade out insects as wind increases (realism)
        // High gust = less insects
        const windSuppress = Math.max(0, 1.0 - (windIntensity * gustFactor) * 0.8);
        const insectPulse = 0.8 + Math.sin(time * 8) * 0.2;

        const targetInsect = insectBase * windSuppress * insectPulse;
        insectsGainRef.current.gain.setTargetAtTime(targetInsect, now, 0.5);
    }
  });

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

          // --- Spatial Distance Simulation ---
          // Random distance 0 (Close) to 1 (Far)
          // Bias towards medium-far (square root distribution)
          const distance = Math.sqrt(Math.random());

          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          const panner = ctx.createStereoPanner();
          const distFilter = ctx.createBiquadFilter();

          // Panning (Random L/R)
          panner.pan.value = (Math.random() * 2) - 1;

          // Distance Filtering (Lowpass)
          // Close = 12kHz, Far = 800Hz
          const cutoff = 800 + (11200 * (1.0 - distance));
          distFilter.type = 'lowpass';
          distFilter.frequency.setValueAtTime(cutoff, t);

          // Distance Attenuation
          // Close = 0.03, Far = 0.005
          const peakVol = 0.005 + (0.025 * (1.0 - distance));

          osc.connect(distFilter);
          distFilter.connect(gain);
          gain.connect(panner);
          panner.connect(ctx.destination);

          // Bird Chirp Logic
          const baseFreq = 2000 + Math.random() * 3000;
          osc.frequency.setValueAtTime(baseFreq, t);
          // Slight chirp (pitch drop or rise)
          osc.frequency.exponentialRampToValueAtTime(baseFreq * (0.9 + Math.random() * 0.2), t + 0.1);

          gain.gain.setValueAtTime(0, t);
          gain.gain.linearRampToValueAtTime(peakVol, t + 0.05);
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
