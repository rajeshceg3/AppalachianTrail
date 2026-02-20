import React, { useEffect, useRef, useState, useImperativeHandle, forwardRef } from 'react';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { getWindGustFactor } from '../utils/wind';

const AudioController = forwardRef(({ region, enabled = true, windRef }, ref) => {
  const audioContextRef = useRef(null);
  const { camera } = useThree(); // Access camera for height-based modulation

  // Stereo wind references
  const windLRef = useRef(null); // { src, filter, gain }
  const windRRef = useRef(null); // { src, filter, gain }

  const droneRef = useRef(null); // { osc, filter, gain }
  const reverbRef = useRef(null); // ConvolverNode

  const rustleGainRef = useRef(null);
  const insectsGainRef = useRef(null);
  const waterGainRef = useRef(null);
  const windBassRef = useRef(null); // { gain }

  // Breathing Refs
  const breathLfoRef = useRef(null); // Oscillator
  const breathGainRef = useRef(null); // Main volume
  const breathFilterRef = useRef(null); // Tone

  // Buffers
  const gravelBufferRef = useRef(null);

  const [isReady, setIsReady] = useState(false);

  // Expose methods to parent
  useImperativeHandle(ref, () => ({
    playFootstep: (surface = 'gravel') => {
      if (enabled) triggerFootstep(surface);
    },
    playGearRustle: () => {
      if (enabled) triggerGearRustle();
    },
    setExertion: (level) => {
        // level 0..1
        if (!breathLfoRef.current || !enabled || !audioContextRef.current) return;
        const now = audioContextRef.current.currentTime;

        // Map exertion to breathing rate (Hz)
        // Rest: 0.2 Hz (5s cycle)
        // Max: 0.6 Hz (1.6s cycle)
        const targetRate = 0.2 + (level * 0.4);

        // Map exertion to volume
        // Rest: Very quiet (0.005)
        // Max: Audible (0.04)
        const targetVol = 0.005 + (level * 0.035);

        breathLfoRef.current.frequency.setTargetAtTime(targetRate, now, 2.0);

        // Adjust the base gain ref
        if (breathGainRef.current) {
             breathGainRef.current.gain.setTargetAtTime(targetVol, now, 2.0);
        }
    },
    resume: () => {
      if (audioContextRef.current?.state === 'suspended') {
        audioContextRef.current.resume();
      }
    }
  }));

  const triggerGearRustle = () => {
    if (!audioContextRef.current || !gravelBufferRef.current) return;
    const ctx = audioContextRef.current;
    const t = ctx.currentTime;

    // Filtered noise for fabric/gear movement
    const src = ctx.createBufferSource();
    src.buffer = gravelBufferRef.current;
    // Lower playback rate for deeper "shhh" sound
    src.playbackRate.value = 0.4 + Math.random() * 0.2;

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 400 + Math.random() * 100;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, t);
    // Double bump envelope for "swish-swish" effect sometimes? No, simple swish.
    gain.gain.linearRampToValueAtTime(0.03 + Math.random() * 0.02, t + 0.1);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);

    // Subtle pan
    const panner = ctx.createStereoPanner();
    panner.pan.value = (Math.random() - 0.5) * 0.3;

    src.connect(filter).connect(gain).connect(panner).connect(ctx.destination);
    // Minimal reverb for gear (close to body)
    if (reverbRef.current) {
        const gearRevGain = ctx.createGain();
        gearRevGain.gain.value = 0.1;
        panner.connect(gearRevGain).connect(reverbRef.current);
    }
    src.start(t);
  };

  const triggerFootstep = (surface) => {
    if (!audioContextRef.current || !gravelBufferRef.current) return;
    const ctx = audioContextRef.current;

    if (ctx.state === 'suspended') {
        ctx.resume().catch(() => {});
    }

    const t = ctx.currentTime;

    // 1. Low Thud (Impact) - Shared but tweaked by surface
    const thudOsc = ctx.createOscillator();
    thudOsc.type = 'sine';

    const thudGain = ctx.createGain();

    if (surface === 'grass') {
        // Softer, deeper thud
        thudOsc.frequency.setValueAtTime(60, t);
        thudOsc.frequency.exponentialRampToValueAtTime(20, t + 0.15);
        thudGain.gain.setValueAtTime(0.1, t);
        thudGain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
    } else {
        // Harder gravel thud
        thudOsc.frequency.setValueAtTime(80, t);
        thudOsc.frequency.exponentialRampToValueAtTime(30, t + 0.1);
        thudGain.gain.setValueAtTime(0.15, t);
        thudGain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
    }

    thudOsc.connect(thudGain);
    thudGain.connect(ctx.destination);

    thudOsc.start(t);
    thudOsc.stop(t + 0.2);

    // 2. Surface Texture
    const crunchSrc = ctx.createBufferSource();
    crunchSrc.buffer = gravelBufferRef.current;

    const crunchFilter = ctx.createBiquadFilter();
    const crunchGain = ctx.createGain();

    if (surface === 'grass') {
        // Grass: Muffled, lower pitch, less gain
        crunchSrc.playbackRate.value = 0.5 + Math.random() * 0.3;

        crunchFilter.type = 'lowpass';
        crunchFilter.frequency.value = 600 + Math.random() * 200;

        crunchGain.gain.setValueAtTime(0.04, t);
        crunchGain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
    } else {
        // Gravel: Crisp, bandpass, higher gain
        crunchSrc.playbackRate.value = 0.7 + Math.random() * 0.6;

        crunchFilter.type = 'bandpass';
        crunchFilter.frequency.value = 1000 + Math.random() * 600;
        crunchFilter.Q.value = 1.0;

        crunchGain.gain.setValueAtTime(0.08, t);
        crunchGain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
    }

    // Subtle stereo spread for footsteps
    const crunchPanner = ctx.createStereoPanner();
    crunchPanner.pan.value = (Math.random() - 0.5) * 0.2;

    crunchSrc.connect(crunchFilter).connect(crunchGain).connect(crunchPanner).connect(ctx.destination);

    // Send footsteps to reverb
    if (reverbRef.current) {
        crunchPanner.connect(reverbRef.current);
        thudGain.connect(reverbRef.current);
    }

    crunchSrc.start(t);
  };

  // Initialize Audio
  useEffect(() => {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    const ctx = new AudioContext();
    audioContextRef.current = ctx;

    // --- Convolution Reverb Setup ---
    const convolver = ctx.createConvolver();
    const reverbGain = ctx.createGain();
    reverbGain.gain.value = 0.4; // Wet mix

    // Generate Impulse Response (Forest Decay)
    const irDuration = 2.5;
    const irRate = ctx.sampleRate;
    const irLength = irRate * irDuration;
    const irBuffer = ctx.createBuffer(2, irLength, irRate);
    const leftIR = irBuffer.getChannelData(0);
    const rightIR = irBuffer.getChannelData(1);

    for (let i = 0; i < irLength; i++) {
        // Exponential decay
        const t = i / irRate;
        // -3.0 decay constant is roughly -60dB over 2.3s
        const decay = Math.exp(-3.0 * t);

        // Noise burst
        leftIR[i] = (Math.random() * 2 - 1) * decay;
        rightIR[i] = (Math.random() * 2 - 1) * decay;
    }
    convolver.buffer = irBuffer;

    // Route reverb to destination
    convolver.connect(reverbGain).connect(ctx.destination);
    reverbRef.current = convolver;


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
        // Send wind to reverb (subtle)
        const send = ctx.createGain();
        send.gain.value = 0.2;
        panner.connect(send).connect(convolver);

        src.start();

        return { src, filter, gain };
    };

    // Stereo Wind
    windLRef.current = createWindLayer(-0.6);
    windRRef.current = createWindLayer(0.6);

    // Drone Layer (Atmospheric Tonal Center)
    const droneOsc = ctx.createOscillator();
    droneOsc.type = 'triangle'; // Richer than sine
    // Frequency based on region type? Initial default.
    droneOsc.frequency.value = 55;

    const droneFilter = ctx.createBiquadFilter();
    droneFilter.type = 'lowpass';
    droneFilter.frequency.value = 120; // Dark tone

    const droneGain = ctx.createGain();
    droneGain.gain.value = 0.0;

    droneOsc.connect(droneFilter).connect(droneGain).connect(ctx.destination);
    // Send drone to reverb for huge space
    const droneSend = ctx.createGain();
    droneSend.gain.value = 0.5;
    droneGain.connect(droneSend).connect(convolver);

    droneOsc.start();
    droneRef.current = { osc: droneOsc, filter: droneFilter, gain: droneGain };

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
        // Send rustle to reverb
        const send = ctx.createGain();
        send.gain.value = 0.3;
        panner.connect(send).connect(convolver);

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
    // Insects reverb
    const insectSend = ctx.createGain();
    insectSend.gain.value = 0.2;
    insectGain.connect(insectSend).connect(convolver);

    insectSource.start();
    insectsGainRef.current = insectGain;

    // Water Sound Setup (Stream/Brook)
    // Uses modulated filter on noise to create "gurgle"
    const waterSrc = ctx.createBufferSource();
    waterSrc.buffer = noiseBuffer;
    waterSrc.loop = true;

    const waterFilter = ctx.createBiquadFilter();
    waterFilter.type = 'lowpass';
    waterFilter.frequency.value = 500;
    waterFilter.Q.value = 0.5;

    const waterGain = ctx.createGain();
    waterGain.gain.value = 0.0;

    // LFO for "Flow" texture
    const waterLFO = ctx.createOscillator();
    waterLFO.type = 'sine';
    waterLFO.frequency.value = 0.2; // Slow flow

    const waterLFOGain = ctx.createGain();
    waterLFOGain.gain.value = 150; // Modulate filter cutoff

    waterLFO.connect(waterLFOGain).connect(waterFilter.frequency);
    waterLFO.start();

    // Random placement
    const waterPanner = ctx.createStereoPanner();
    waterPanner.pan.value = (Math.random() - 0.5) * 0.6;

    waterSrc.connect(waterFilter).connect(waterGain).connect(waterPanner).connect(ctx.destination);

    // Send water to reverb
    const waterSend = ctx.createGain();
    waterSend.gain.value = 0.3;
    waterPanner.connect(waterSend).connect(convolver);

    waterSrc.start();
    waterGainRef.current = waterGain;

    // Wind Bass Layer (Rumble/Pressure)
    const bassSrc = ctx.createBufferSource();
    bassSrc.buffer = noiseBuffer;
    bassSrc.loop = true;

    const bassFilter = ctx.createBiquadFilter();
    bassFilter.type = 'lowpass';
    bassFilter.frequency.value = 80;

    const bassGain = ctx.createGain();
    bassGain.gain.value = 0.0;

    bassSrc.connect(bassFilter).connect(bassGain).connect(ctx.destination);
    bassSrc.start();
    windBassRef.current = bassGain;

    // --- Breathing Synthesis ---
    // Source: Pink Noise (reusing noiseBuffer)
    const breathSrc = ctx.createBufferSource();
    breathSrc.buffer = noiseBuffer;
    breathSrc.loop = true;

    // Filter: Lowpass to make it sound like air
    const breathFilter = ctx.createBiquadFilter();
    breathFilter.type = 'lowpass';
    breathFilter.frequency.value = 400; // Base cutoff
    breathFilter.Q.value = 0.5;

    // Gain: Envelope
    const breathGain = ctx.createGain();
    breathGain.gain.value = 0.005; // Base low volume

    // LFO for Breathing Cycle
    const breathLfo = ctx.createOscillator();
    breathLfo.type = 'sine';
    breathLfo.frequency.value = 0.2; // 5s cycle

    // LFO -> Filter Frequency Modulation
    const lfoFilterGain = ctx.createGain();
    lfoFilterGain.gain.value = 100; // Modulate +/- 100Hz
    breathLfo.connect(lfoFilterGain).connect(breathFilter.frequency);

    // LFO -> Volume Modulation (Respiration Cycle)
    // We want the volume to oscillate 0..1 based on LFO
    // We construct a signal 0..1 from the sine wave: (Sine + 1) / 2
    const bias = ctx.createConstantSource();
    bias.offset.value = 1.0;

    const mixer = ctx.createGain();
    mixer.gain.value = 0.5;

    breathLfo.connect(mixer);
    bias.connect(mixer);

    // Modulate a secondary gain node
    const breathCycleGain = ctx.createGain();
    breathCycleGain.gain.value = 0; // Driven by mixer
    mixer.connect(breathCycleGain.gain);

    // Signal Path: Source -> Filter -> CycleGain -> MasterGain -> Destination
    breathSrc.connect(breathFilter).connect(breathCycleGain).connect(breathGain).connect(ctx.destination);

    // Internal resonance (Reverb)
    const breathReverbSend = ctx.createGain();
    breathReverbSend.gain.value = 0.2;
    breathGain.connect(breathReverbSend).connect(convolver);

    breathSrc.start();
    breathLfo.start();
    bias.start();

    breathLfoRef.current = breathLfo;
    breathGainRef.current = breathGain;
    breathFilterRef.current = breathFilter;

    setIsReady(true);

    return () => {
      try {
        windLRef.current?.src.stop();
        windRRef.current?.src.stop();
        droneOsc.stop();
        insectSource.stop();
        waterSrc.stop();
        waterLFO.stop();
        bassSrc.stop();
        breathSrc.stop();
        breathLfo.stop();
        bias.stop();
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

      // Calculate effective wind intensity based on height
      const camY = camera.position.y;
      const heightFactor = 1.0 + (Math.max(0, camY) / 50.0);

      let windIntensity = (region.windIntensity || 0.5) * heightFactor;
      windIntensity = Math.min(1.2, windIntensity);

      // Retrieve shared wind state if available
      let gustFactor = 1.0;
      let cloudFactor = 0.0; // 0 is neutral

      if (windRef && windRef.current) {
          // Use shared gust factor for perfect sync
          gustFactor = windRef.current.gust;
          cloudFactor = windRef.current.cloud;
      } else {
          // Fallback
          gustFactor = getWindGustFactor(camera.position.x, camera.position.z, time);
      }

      const now = ctx.currentTime;

      // Modulate ambience based on cloud cover (darker = quieter)
      // cloudFactor is approx -0.6 to 0.6
      const sunMod = THREE.MathUtils.mapLinear(cloudFactor, -0.6, 0.6, 0.5, 1.0);

      // Update Drone
      if (droneRef.current) {
          const droneBase = enabled ? 0.03 : 0;
          // Deeper drone for mountains/high wind
          const targetFreq = region.environment === 'sunset' ? 65 : (region.environment === 'forest' ? 55 : 45);
          droneRef.current.osc.frequency.setTargetAtTime(targetFreq, now, 0.5);
          droneRef.current.gain.gain.setTargetAtTime(droneBase * sunMod, now, 1.0);
      }

      // Stereo Wind Updates
      // Left/Right fluctuation
      const flucL = Math.sin(time * 0.4) * 0.5 + 0.5;
      const flucR = Math.sin(time * 0.4 + 2.0) * 0.5 + 0.5;

      const baseGain = enabled ? windIntensity * 0.05 : 0;

      if (windLRef.current) {
         const targetGainL = baseGain * (0.5 + 0.5 * flucL) * gustFactor;
         const targetFreqL = 200 + (windIntensity * 800) * flucL * gustFactor;
         windLRef.current.gain.gain.setTargetAtTime(targetGainL, now, 0.5);
         windLRef.current.filter.frequency.setTargetAtTime(targetFreqL, now, 0.5);
      }

      if (windRRef.current) {
         const targetGainR = baseGain * (0.5 + 0.5 * flucR) * gustFactor;
         const targetFreqR = 200 + (windIntensity * 800) * flucR * gustFactor;
         windRRef.current.gain.gain.setTargetAtTime(targetGainR, now, 0.5);
         windRRef.current.filter.frequency.setTargetAtTime(targetFreqR, now, 0.5);
      }

      // Wind Bass (Rumble)
      if (windBassRef.current) {
          // Only audible when wind is strong (>0.4)
          const bassBase = enabled ? Math.max(0, (windIntensity - 0.4) * 0.15) : 0;
          const bassTarget = bassBase * (gustFactor * gustFactor);
          windBassRef.current.gain.setTargetAtTime(bassTarget, now, 0.4);
      }

      // Rustle Logic (Canopy)
      if (rustleGainRef.current) {
        // Rustle volume follows the gust intensity strongly
        // Trees make noise when wind changes/peaks
        const rustleBase = enabled ? windIntensity * 0.04 : 0;

        // Use the derivative of gust? Or just magnitude?
        // Magnitude is fine.
        // Gust factor peaks are when wind is strongest.
        const rustleTarget = rustleBase * (gustFactor * gustFactor); // Square for more dynamic range

        rustleGainRef.current.gain.setTargetAtTime(rustleTarget, now, 0.3);
      }

      // Insects logic
      if (insectsGainRef.current) {
          const insectBase = enabled ? 0.015 : 0;
          // Fade out insects as wind increases (realism)
          const windSuppress = Math.max(0, 1.0 - windIntensity * 0.8);
          const insectPulse = 0.8 + Math.sin(time * 8) * 0.2;

          // Insects also quiet down when a cloud passes
          const targetInsect = insectBase * windSuppress * insectPulse * sunMod;
          insectsGainRef.current.gain.setTargetAtTime(targetInsect, now, 0.5);
      }

      // Water Logic
      if (waterGainRef.current) {
          const waterBase = enabled ? (region.waterProbability || 0) * 0.06 : 0;
          // Water volume fluctuates slightly
          const flow = 1.0 + Math.sin(time * 0.3) * 0.2;

          waterGainRef.current.gain.setTargetAtTime(waterBase * flow, now, 1.0);
      }

      animationFrameId = requestAnimationFrame(updateAudio);
    };

    updateAudio();

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [isReady, region, enabled, camera]);

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

          // Panning (Dynamic Movement - Flyby)
          const startPan = (Math.random() * 2) - 1;
          const endPan = startPan + (Math.random() - 0.5) * 0.8; // Move slightly
          panner.pan.setValueAtTime(startPan, t);
          panner.pan.linearRampToValueAtTime(endPan, t + 4.0); // Fly across over 4s

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

          if (reverbRef.current) {
              // Birds get lots of reverb (far away)
              panner.connect(reverbRef.current);
          }

          // FM Synthesis Bird Logic
          // Carrier Frequency: Fundamental tone
          const carrierFreq = 800 + Math.random() * 2000;
          // Harmonic Ratio (random integer or half-integer often sounds best)
          const ratio = 2 + Math.floor(Math.random() * 6) * 0.5;
          const modFreq = carrierFreq * ratio;

          // Modulator (the "texture")
          const modOsc = ctx.createOscillator();
          modOsc.type = 'sine';
          modOsc.frequency.setValueAtTime(modFreq, t);

          const modGain = ctx.createGain();
          // Modulation Index (depth): dynamic
          const modDepth = carrierFreq * (0.5 + Math.random());
          modGain.gain.setValueAtTime(modDepth, t);
          // Envelope modulation depth for "chirp" shape
          modGain.gain.exponentialRampToValueAtTime(modDepth * 0.1, t + 0.2);

          // Carrier
          osc.frequency.setValueAtTime(carrierFreq, t);
          // Frequency slide
          osc.frequency.exponentialRampToValueAtTime(carrierFreq * (0.8 + Math.random() * 0.4), t + 0.2);

          // Connect: Mod -> ModGain -> Carrier.frequency
          modOsc.connect(modGain);
          modGain.connect(osc.frequency);

          gain.gain.setValueAtTime(0, t);
          gain.gain.linearRampToValueAtTime(peakVol, t + 0.05);
          gain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);

          modOsc.start(t);
          modOsc.stop(t + 0.25);
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
