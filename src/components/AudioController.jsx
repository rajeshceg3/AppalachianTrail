import React, { useEffect, useRef, useState, useImperativeHandle, forwardRef } from 'react';
import { useThree } from '@react-three/fiber';

const AudioController = forwardRef(({ region, enabled = true }, ref) => {
  const audioContextRef = useRef(null);
  const { camera } = useThree();

  // Stereo wind references
  const windLRef = useRef(null);
  const windRRef = useRef(null);

  const droneRef = useRef(null);
  const reverbRef = useRef(null);

  const rustleGainRef = useRef(null);
  const insectsGainRef = useRef(null);
  const waterGainRef = useRef(null);
  const windBassRef = useRef(null);

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
    resume: () => {
      if (audioContextRef.current?.state === 'suspended') {
        audioContextRef.current.resume();
      }
    },
    // Unified Nature Update Method - Called by Scene.jsx every frame
    updateNature: (natureState) => {
        if (!isReady || !audioContextRef.current || !enabled) return;

        const ctx = audioContextRef.current;
        const now = ctx.currentTime;
        // Use unified time from Scene
        const time = natureState.time || 0;

        const { windIntensity: globalWind, windDirection, sunProgress } = natureState;

        // 1. Calculate Local Wind Intensity based on Camera Height
        // Wind is stronger higher up
        const camY = camera.position.y;
        // Clamp height factor to prevent explosion if camera flies away
        const safeCamY = Math.max(0, Math.min(1000, camY));
        const heightFactor = 1.0 + (safeCamY / 50.0);

        // Combine global wind (which includes gusts) with height
        let localWind = globalWind * heightFactor;

        // Safety Clamp: Prevent audio system explosion
        localWind = Math.min(5.0, localWind);

        // 2. Update Drone
        if (droneRef.current) {
            const droneBase = 0.03;
            // Deeper drone for mountains/high wind
            const targetFreq = region.environment === 'sunset' ? 65 : (region.environment === 'forest' ? 55 : 45);
            droneRef.current.osc.frequency.setTargetAtTime(targetFreq, now, 0.5);
            droneRef.current.gain.gain.setTargetAtTime(droneBase, now, 1.0);
        }

        // 3. Stereo Wind Updates
        // Map localWind (0.0 to ~2.0) to gain
        const flucL = Math.sin(time * 0.4) * 0.5 + 0.5;
        const flucR = Math.sin(time * 0.4 + 2.0) * 0.5 + 0.5;

        // Base gain follows wind intensity strongly
        const baseGain = Math.min(1.0, localWind * 0.08);

        if (windLRef.current) {
           // Modulate pitch with wind intensity (whistling wind)
           // Clamp target frequency to safe range
           const targetFreqL = Math.min(12000, 200 + (localWind * 600) * flucL);
           const targetGainL = baseGain * (0.8 + 0.4 * flucL);

           windLRef.current.gain.gain.setTargetAtTime(targetGainL, now, 0.1);
           windLRef.current.filter.frequency.setTargetAtTime(targetFreqL, now, 0.1);
        }

        if (windRRef.current) {
           const targetFreqR = Math.min(12000, 200 + (localWind * 600) * flucR);
           const targetGainR = baseGain * (0.8 + 0.4 * flucR);

           windRRef.current.gain.gain.setTargetAtTime(targetGainR, now, 0.1);
           windRRef.current.filter.frequency.setTargetAtTime(targetFreqR, now, 0.1);
        }

        // 4. Wind Bass (Pressure/Rumble)
        if (windBassRef.current) {
            // Only audible when wind is strong
            // Use squared response for dramatic "pressure" feel
            const bassTarget = Math.max(0, (localWind - 0.5) * 0.15);
            windBassRef.current.gain.setTargetAtTime(bassTarget * bassTarget, now, 0.2);
        }

        // 5. Rustle (Canopy)
        if (rustleGainRef.current) {
            // Rustle follows gusts instantly
            const rustleTarget = Math.min(0.5, (localWind * localWind) * 0.05);
            rustleGainRef.current.gain.setTargetAtTime(rustleTarget, now, 0.1);
        }

        // 6. Insects
        if (insectsGainRef.current) {
            const insectBase = 0.015;
            // Fade out insects as wind increases (they hide)
            const windSuppress = Math.max(0, 1.0 - localWind * 0.8);
            const insectPulse = 0.8 + Math.sin(time * 8) * 0.2;

            const targetInsect = insectBase * windSuppress * insectPulse;
            insectsGainRef.current.gain.setTargetAtTime(targetInsect, now, 0.5);
        }

        // 7. Water
        if (waterGainRef.current) {
            const waterBase = (region.waterProbability || 0) * 0.06;
            const flow = 1.0 + Math.sin(time * 0.3) * 0.2;
            waterGainRef.current.gain.setTargetAtTime(waterBase * flow, now, 1.0);
        }
    }
  }));

  const triggerGearRustle = () => {
    if (!audioContextRef.current || !gravelBufferRef.current) return;
    const ctx = audioContextRef.current;
    const t = ctx.currentTime;

    const src = ctx.createBufferSource();
    src.buffer = gravelBufferRef.current;
    src.playbackRate.value = 0.4 + Math.random() * 0.2;

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 400 + Math.random() * 100;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.03 + Math.random() * 0.02, t + 0.1);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);

    const panner = ctx.createStereoPanner();
    panner.pan.value = (Math.random() - 0.5) * 0.3;

    src.connect(filter).connect(gain).connect(panner).connect(ctx.destination);
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

    const thudOsc = ctx.createOscillator();
    thudOsc.type = 'sine';

    const thudGain = ctx.createGain();

    if (surface === 'grass') {
        thudOsc.frequency.setValueAtTime(60, t);
        thudOsc.frequency.exponentialRampToValueAtTime(20, t + 0.15);
        thudGain.gain.setValueAtTime(0.1, t);
        thudGain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
    } else {
        thudOsc.frequency.setValueAtTime(80, t);
        thudOsc.frequency.exponentialRampToValueAtTime(30, t + 0.1);
        thudGain.gain.setValueAtTime(0.15, t);
        thudGain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
    }

    thudOsc.connect(thudGain);
    thudGain.connect(ctx.destination);

    thudOsc.start(t);
    thudOsc.stop(t + 0.2);

    const crunchSrc = ctx.createBufferSource();
    crunchSrc.buffer = gravelBufferRef.current;

    const crunchFilter = ctx.createBiquadFilter();
    const crunchGain = ctx.createGain();

    if (surface === 'grass') {
        crunchSrc.playbackRate.value = 0.5 + Math.random() * 0.3;
        crunchFilter.type = 'lowpass';
        crunchFilter.frequency.value = 600 + Math.random() * 200;
        crunchGain.gain.setValueAtTime(0.04, t);
        crunchGain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
    } else {
        crunchSrc.playbackRate.value = 0.7 + Math.random() * 0.6;
        crunchFilter.type = 'bandpass';
        crunchFilter.frequency.value = 1000 + Math.random() * 600;
        crunchFilter.Q.value = 1.0;
        crunchGain.gain.setValueAtTime(0.08, t);
        crunchGain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
    }

    const crunchPanner = ctx.createStereoPanner();
    crunchPanner.pan.value = (Math.random() - 0.5) * 0.2;

    crunchSrc.connect(crunchFilter).connect(crunchGain).connect(crunchPanner).connect(ctx.destination);

    if (reverbRef.current) {
        crunchPanner.connect(reverbRef.current);
        thudGain.connect(reverbRef.current);
    }

    crunchSrc.start(t);
  };

  useEffect(() => {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    const ctx = new AudioContext();
    audioContextRef.current = ctx;

    const convolver = ctx.createConvolver();
    const reverbGain = ctx.createGain();
    reverbGain.gain.value = 0.4;

    const irDuration = 2.5;
    const irRate = ctx.sampleRate;
    const irLength = irRate * irDuration;
    const irBuffer = ctx.createBuffer(2, irLength, irRate);
    const leftIR = irBuffer.getChannelData(0);
    const rightIR = irBuffer.getChannelData(1);

    for (let i = 0; i < irLength; i++) {
        const t = i / irRate;
        const decay = Math.exp(-3.0 * t);
        leftIR[i] = (Math.random() * 2 - 1) * decay;
        rightIR[i] = (Math.random() * 2 - 1) * decay;
    }
    convolver.buffer = irBuffer;

    convolver.connect(reverbGain).connect(ctx.destination);
    reverbRef.current = convolver;

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

    const gSize = ctx.sampleRate * 0.2;
    const gBuffer = ctx.createBuffer(1, gSize, ctx.sampleRate);
    const gData = gBuffer.getChannelData(0);
    for(let i=0; i<gSize; i++) {
        gData[i] = (Math.random() * 2 - 1) * 0.8;
    }
    gravelBufferRef.current = gBuffer;

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
        const send = ctx.createGain();
        send.gain.value = 0.2;
        panner.connect(send).connect(convolver);

        src.start();

        return { src, filter, gain };
    };

    windLRef.current = createWindLayer(-0.6);
    windRRef.current = createWindLayer(0.6);

    const droneOsc = ctx.createOscillator();
    droneOsc.type = 'triangle';
    droneOsc.frequency.value = 55;

    const droneFilter = ctx.createBiquadFilter();
    droneFilter.type = 'lowpass';
    droneFilter.frequency.value = 120;

    const droneGain = ctx.createGain();
    droneGain.gain.value = 0.0;

    droneOsc.connect(droneFilter).connect(droneGain).connect(ctx.destination);
    const droneSend = ctx.createGain();
    droneSend.gain.value = 0.5;
    droneGain.connect(droneSend).connect(convolver);

    droneOsc.start();
    droneRef.current = { osc: droneOsc, filter: droneFilter, gain: droneGain };

    const createRustleLayer = () => {
        const src = ctx.createBufferSource();
        src.buffer = noiseBuffer;
        src.loop = true;

        const highPass = ctx.createBiquadFilter();
        highPass.type = 'highpass';
        highPass.frequency.value = 800;

        const lowPass = ctx.createBiquadFilter();
        lowPass.type = 'lowpass';
        lowPass.frequency.value = 6000;

        const gain = ctx.createGain();
        gain.gain.value = 0.0;

        const panner = ctx.createStereoPanner();
        panner.pan.value = 0;

        src.connect(highPass).connect(lowPass).connect(gain).connect(panner).connect(ctx.destination);
        const send = ctx.createGain();
        send.gain.value = 0.3;
        panner.connect(send).connect(convolver);

        src.start();
        return gain;
    }

    const rustleGain = createRustleLayer();
    rustleGainRef.current = rustleGain;

    const insectSource = ctx.createBufferSource();
    insectSource.buffer = noiseBuffer;
    insectSource.loop = true;

    const insectFilter = ctx.createBiquadFilter();
    insectFilter.type = 'highpass';
    insectFilter.frequency.value = 4000;

    const insectGain = ctx.createGain();
    insectGain.gain.value = 0.0;

    insectSource.connect(insectFilter).connect(insectGain).connect(ctx.destination);
    const insectSend = ctx.createGain();
    insectSend.gain.value = 0.2;
    insectGain.connect(insectSend).connect(convolver);

    insectSource.start();
    insectsGainRef.current = insectGain;

    const waterSrc = ctx.createBufferSource();
    waterSrc.buffer = noiseBuffer;
    waterSrc.loop = true;

    const waterFilter = ctx.createBiquadFilter();
    waterFilter.type = 'lowpass';
    waterFilter.frequency.value = 500;
    waterFilter.Q.value = 0.5;

    const waterGain = ctx.createGain();
    waterGain.gain.value = 0.0;

    const waterLFO = ctx.createOscillator();
    waterLFO.type = 'sine';
    waterLFO.frequency.value = 0.2;

    const waterLFOGain = ctx.createGain();
    waterLFOGain.gain.value = 150;

    waterLFO.connect(waterLFOGain).connect(waterFilter.frequency);
    waterLFO.start();

    const waterPanner = ctx.createStereoPanner();
    waterPanner.pan.value = (Math.random() - 0.5) * 0.6;

    waterSrc.connect(waterFilter).connect(waterGain).connect(waterPanner).connect(ctx.destination);

    const waterSend = ctx.createGain();
    waterSend.gain.value = 0.3;
    waterPanner.connect(waterSend).connect(convolver);

    waterSrc.start();
    waterGainRef.current = waterGain;

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
        ctx.close();
      } catch (e) {}
      setIsReady(false);
    };
  }, []);

  useEffect(() => {
    if (!isReady || !audioContextRef.current) return;

    let timeoutId;
    let isActive = true;

    const playBird = () => {
      if (!isActive) return;

      if (enabled) {
        const birdActivity = region.birdActivity || 0.3;
        const probability = birdActivity;

        if (Math.random() < probability) {
          const ctx = audioContextRef.current;
          if (ctx.state === 'suspended') ctx.resume().catch(() => {});

          const t = ctx.currentTime;
          const distance = Math.sqrt(Math.random());

          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          const panner = ctx.createStereoPanner();
          const distFilter = ctx.createBiquadFilter();

          panner.pan.value = (Math.random() * 2) - 1;

          const cutoff = 800 + (11200 * (1.0 - distance));
          distFilter.type = 'lowpass';
          distFilter.frequency.setValueAtTime(cutoff, t);

          const peakVol = 0.005 + (0.025 * (1.0 - distance));

          osc.connect(distFilter);
          distFilter.connect(gain);
          gain.connect(panner);
          panner.connect(ctx.destination);

          if (reverbRef.current) {
              panner.connect(reverbRef.current);
          }

          const carrierFreq = 800 + Math.random() * 2000;
          const ratio = 2 + Math.floor(Math.random() * 6) * 0.5;
          const modFreq = carrierFreq * ratio;

          const modOsc = ctx.createOscillator();
          modOsc.type = 'sine';
          modOsc.frequency.setValueAtTime(modFreq, t);

          const modGain = ctx.createGain();
          // Ensure modulation depth doesn't push frequency below 0
          // Keep modulation depth safely below carrier frequency (max 80%)
          const modDepth = carrierFreq * (0.2 + Math.random() * 0.6);
          modGain.gain.setValueAtTime(modDepth, t);
          modGain.gain.exponentialRampToValueAtTime(modDepth * 0.1, t + 0.2);

          osc.frequency.setValueAtTime(carrierFreq, t);
          osc.frequency.exponentialRampToValueAtTime(carrierFreq * (0.8 + Math.random() * 0.4), t + 0.2);

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
