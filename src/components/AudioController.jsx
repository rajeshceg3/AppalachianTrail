import { useEffect, useRef } from 'react';

const AudioController = ({ windIntensity = 0.5, birdActivity = 0.5, enabled = false }) => {
  const ctxRef = useRef(null);
  const windSourceRef = useRef(null);
  const windGainRef = useRef(null);
  const filterRef = useRef(null);
  const birdTimeoutRef = useRef(null);

  // Initialize Audio Context and Wind
  useEffect(() => {
    if (!enabled) {
      if (ctxRef.current && ctxRef.current.state === 'running') {
        ctxRef.current.suspend();
      }
      return;
    }

    const initAudio = async () => {
      if (!ctxRef.current) {
        ctxRef.current = new (window.AudioContext || window.webkitAudioContext)();
      }

      if (ctxRef.current.state === 'suspended') {
        await ctxRef.current.resume();
      }

      // Create Wind Sound (Pink Noise approximation)
      if (!windSourceRef.current) {
        const bufferSize = 2 * ctxRef.current.sampleRate;
        const noiseBuffer = ctxRef.current.createBuffer(1, bufferSize, ctxRef.current.sampleRate);
        const output = noiseBuffer.getChannelData(0);

        for (let i = 0; i < bufferSize; i++) {
          const white = Math.random() * 2 - 1;
          output[i] = white;
        }

        windSourceRef.current = ctxRef.current.createBufferSource();
        windSourceRef.current.buffer = noiseBuffer;
        windSourceRef.current.loop = true;

        // Filter for wind effect
        filterRef.current = ctxRef.current.createBiquadFilter();
        filterRef.current.type = 'lowpass';
        filterRef.current.frequency.value = 400; // Deep rumble

        windGainRef.current = ctxRef.current.createGain();
        windGainRef.current.gain.value = 0; // Start silent

        windSourceRef.current.connect(filterRef.current);
        filterRef.current.connect(windGainRef.current);
        windGainRef.current.connect(ctxRef.current.destination);

        windSourceRef.current.start();
      }
    };

    initAudio();

    return () => {
       // Cleanup logic if needed, but we mostly just suspend/resume
    };
  }, [enabled]);

  // Update Wind Params
  useEffect(() => {
    if (ctxRef.current && windGainRef.current && filterRef.current) {
        const targetGain = enabled ? Math.max(0.02, windIntensity * 0.15) : 0;
        const targetFreq = 200 + (windIntensity * 600);

        windGainRef.current.gain.setTargetAtTime(targetGain, ctxRef.current.currentTime, 2);
        filterRef.current.frequency.setTargetAtTime(targetFreq, ctxRef.current.currentTime, 2);
    }
  }, [windIntensity, enabled]);

  // Bird System
  useEffect(() => {
    if (!enabled || birdActivity <= 0.01) {
        if (birdTimeoutRef.current) clearTimeout(birdTimeoutRef.current);
        return;
    }

    const playBird = () => {
        if (!ctxRef.current || ctxRef.current.state !== 'running') return;

        const osc = ctxRef.current.createOscillator();
        const gain = ctxRef.current.createGain();

        osc.connect(gain);
        gain.connect(ctxRef.current.destination);

        const now = ctxRef.current.currentTime;

        // Randomize bird sound
        const startFreq = 2000 + Math.random() * 2000;
        const endFreq = startFreq - (Math.random() * 500);
        const duration = 0.1 + Math.random() * 0.2;

        osc.frequency.setValueAtTime(startFreq, now);
        osc.frequency.linearRampToValueAtTime(endFreq, now + duration);

        // Envelope
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.1 * birdActivity, now + 0.05);
        gain.gain.linearRampToValueAtTime(0, now + duration);

        osc.start(now);
        osc.stop(now + duration + 0.1);

        scheduleNextBird();
    };

    const scheduleNextBird = () => {
        const minTime = 2000;
        const variance = 10000 / (birdActivity * 2); // Higher activity = shorter wait
        const delay = minTime + Math.random() * variance;
        birdTimeoutRef.current = setTimeout(playBird, delay);
    };

    scheduleNextBird();

    return () => {
        if (birdTimeoutRef.current) clearTimeout(birdTimeoutRef.current);
    };
  }, [enabled, birdActivity]);

  return null;
};

export default AudioController;
