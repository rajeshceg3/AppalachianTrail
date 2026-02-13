import React, { useEffect, useRef } from 'react';

const MapAmbience = ({ scrollYProgress }) => {
  const audioContextRef = useRef(null);
  const osc1Ref = useRef(null);
  const osc2Ref = useRef(null);
  const gainRef = useRef(null);
  const isStarted = useRef(false);

  useEffect(() => {
    // Initialize AudioContext only on user interaction if possible,
    // but here we assume it's already allowed or we handle resume.
    // For now, let's just create it.
    // Note: Chrome requires user interaction to start audio context.
    // We might need a "Start" button on the map if it was the landing page,
    // but the user has already clicked "Begin" on Landing, so the context *should* be resumable.
    // However, this is a new component. We might need to resume the *global* context or create a new one.
    // Let's try creating a new one.

    const AudioContext = window.AudioContext || window.webkitAudioContext;
    const ctx = new AudioContext();
    audioContextRef.current = ctx;

    // Master Gain
    const masterGain = ctx.createGain();
    masterGain.gain.value = 0.0; // Start silent
    masterGain.connect(ctx.destination);
    gainRef.current = masterGain;

    // Oscillator 1 (Base Drone)
    const osc1 = ctx.createOscillator();
    osc1.type = 'sine';
    osc1.frequency.value = 100;
    osc1.start();
    osc1.connect(masterGain);
    osc1Ref.current = osc1;

    // Oscillator 2 (Detuned/Harmonic)
    const osc2 = ctx.createOscillator();
    osc2.type = 'triangle';
    osc2.frequency.value = 150;
    osc2.start();
    const osc2Gain = ctx.createGain();
    osc2Gain.gain.value = 0.3; // Lower volume for harmonic
    osc2.connect(osc2Gain).connect(masterGain);
    osc2Ref.current = osc2;

    // Fade in
    masterGain.gain.setTargetAtTime(0.1, ctx.currentTime, 2.0);

    isStarted.current = true;

    // Autoplay unlock
    const unlockAudio = () => {
        if (ctx.state === 'suspended') {
            ctx.resume().catch(() => {});
        }
    };

    if (ctx.state === 'suspended') {
        ctx.resume().catch(() => {});
    }

    window.addEventListener('click', unlockAudio);
    window.addEventListener('touchstart', unlockAudio);
    window.addEventListener('keydown', unlockAudio);

    return () => {
      window.removeEventListener('click', unlockAudio);
      window.removeEventListener('touchstart', unlockAudio);
      window.removeEventListener('keydown', unlockAudio);

      try {
        masterGain.gain.setTargetAtTime(0, ctx.currentTime, 0.5);
      } catch (e) {}

      setTimeout(() => {
          try {
            osc1.stop();
            osc2.stop();
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

      // latest: 0 (Top/North) -> 1 (Bottom/South)
      // Note: We want "South" (Bottom) to be warm/low, "North" (Top) to be windy/high.

      // Bottom (1):
      // Osc1: 65Hz (C2)
      // Osc2: 98Hz (G2)

      // Top (0):
      // Osc1: 130Hz (C3) or higher? Maybe 200Hz.
      // Osc2: 300Hz (Windy?)

      // Let's interpolate.
      // progress = 1 - latest (0 at bottom, 1 at top)
      // Wait. ScrollYProgress is 0 at start (Top of container) and 1 at end (Bottom of container).
      // We are reversing the view.
      // Visual Top = Maine. Visual Bottom = Georgia.
      // HTML Top (0) = Maine. HTML Bottom (1) = Georgia.
      // So latest=0 is Maine (North). latest=1 is Georgia (South).

      const isNorth = 1.0 - latest; // 0 (South) to 1 (North) ???
      // No. latest=0 (Top) is Maine (North). latest=1 (Bottom) is Georgia (South).
      // So 'North-ness' is (1 - latest).
      // 'South-ness' is latest.

      const southFactor = latest;

      // Pitch: Lower at South (1), Higher at North (0)
      const baseFreq = 80 + (1.0 - southFactor) * 120; // 80Hz (S) -> 200Hz (N)
      const harmFreq = baseFreq * 1.5; // Perfect fifth

      osc1Ref.current.frequency.setTargetAtTime(baseFreq, t, 0.2);
      osc2Ref.current.frequency.setTargetAtTime(harmFreq, t, 0.2);

      // Volume: Maybe louder at the ends? Or constant.
      // Let's keep constant for now, maybe slight tremolo?
    });

    return () => unsubscribe();
  }, [scrollYProgress]);

  return null;
};

export default MapAmbience;
