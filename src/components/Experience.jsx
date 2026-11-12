import React, { useMemo, useState, useEffect, useRef, useCallback } from 'react';
import { Canvas } from '@react-three/fiber';
import Scene from './Scene';
import { regions } from '../data/regions';
import { Blaze, ArrowBack, ArrowNorth, IconSound, IconMotion, IconTheme, IconPin, RegionGlyph } from './Ink';

const trailIds = ['georgia', 'smokies', 'virginia', 'mid-atlantic', 'new-england', 'maine'];
const PIN_KEY = 'at-chrome-pin';
const TOP_ZONE = 96;
const BOTTOM_ZONE = 150;
const RETIRE_MS = 2600;

export default function Experience({ selectedRegion, onBackToMap }) {
  const [audioEnabled, setAudioEnabled] = useState(false);
  const [paused, setPaused] = useState(() => matchMedia('(prefers-reduced-motion: reduce)').matches);
  const [reset, setReset] = useState(0);
  const [walk, setWalk] = useState(0);
  const [theme, setTheme] = useState('dark');
  const [id, setId] = useState(selectedRegion.id);
  const region = useMemo(() => ({ ...regions.find((x) => x.id === id), paused }), [id, paused]);

  // Chrome: the world leads; controls visit when called and retire when left.
  const [pinned, setPinned] = useState(() => { try { return localStorage.getItem(PIN_KEY) === '1'; } catch { return false; } });
  const [chrome, setChrome] = useState(true); // greets on entry, then retires
  const focusWithin = useRef(false);
  const retireTimer = useRef(null);
  const rootRef = useRef(null);

  const retireSoon = useCallback(() => {
    clearTimeout(retireTimer.current);
    retireTimer.current = setTimeout(() => {
      if (!focusWithin.current) setChrome(false);
    }, RETIRE_MS);
  }, []);

  const wake = useCallback(() => {
    setChrome(true);
    retireSoon();
  }, [retireSoon]);

  useEffect(() => {
    retireSoon(); // entry greeting retires on its own
    const onPointerMove = (e) => {
      if (e.pointerType === 'touch') return;
      if (e.clientY < TOP_ZONE || e.clientY > window.innerHeight - BOTTOM_ZONE) wake();
    };
    const onKey = (e) => {
      if (e.key === 'Escape') { focusWithin.current = false; setChrome(false); }
    };
    document.addEventListener('pointermove', onPointerMove);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointermove', onPointerMove);
      document.removeEventListener('keydown', onKey);
      clearTimeout(retireTimer.current);
    };
  }, [wake, retireSoon]);

  const togglePin = () => {
    setPinned((p) => {
      const next = !p;
      try { next ? localStorage.setItem(PIN_KEY, '1') : localStorage.removeItem(PIN_KEY); } catch {}
      if (next) setChrome(true);
      return next;
    });
  };

  const onChromeFocus = () => { focusWithin.current = true; clearTimeout(retireTimer.current); setChrome(true); };
  const onChromeBlur = (e) => {
    if (!rootRef.current?.contains(e.relatedTarget)) {
      focusWithin.current = false;
      retireSoon();
    }
  };

  const chromeOn = chrome || pinned;

  return (
    <main className="experience" data-theme={theme} style={{ background: region.fogColor }} ref={rootRef} onFocusCapture={onChromeFocus} onBlurCapture={onChromeBlur}>
      <div className="scene-stage">
        <Canvas shadows frameloop="demand" dpr={1} camera={{ fov: 50, near: 0.1, far: 900 }} gl={{ antialias: true, powerPreference: 'low-power' }} onCreated={({ gl }) => { gl.domElement.tabIndex = 0; gl.domElement.setAttribute('role', 'img'); gl.domElement.setAttribute('aria-label', 'Interactive landscape. Drag to turn, scroll to zoom, arrow keys to look, Home to reset.'); }}>
          <color attach="background" args={[region.fogColor]} />
          <Scene key={region.id} region={region} audioEnabled={audioEnabled} reset={reset} walk={walk} />
        </Canvas>
      </div>

      {!chromeOn && (
        <button className="chrome-hint" aria-label="Show controls" onClick={wake}>
          <Blaze />
        </button>
      )}

      <header className={`world-toolbar chrome${chromeOn ? ' chrome-on' : ''}`}>
        <button id="back" className="hand-sign" onClick={onBackToMap}>
          <ArrowBack /> Trail maps
        </button>
        <div className="icon-toggles">
          <button id="sound-toggle" className="ink-toggle" aria-pressed={audioEnabled} aria-label={audioEnabled ? 'Turn sound off' : 'Turn sound on'} title={audioEnabled ? 'Sound on' : 'Sound off'} onClick={() => setAudioEnabled((x) => !x)}>
            <IconSound on={audioEnabled} />
          </button>
          <button id="motion-toggle" className="ink-toggle" aria-pressed={paused} aria-label={paused ? 'Play motion' : 'Pause motion'} title={paused ? 'Play motion' : 'Pause motion'} onClick={() => setPaused((x) => !x)}>
            <IconMotion paused={paused} />
          </button>
          <button id="theme-toggle" className="ink-toggle" aria-label={theme === 'dark' ? 'Light controls' : 'Dark controls'} title={theme === 'dark' ? 'Light controls' : 'Dark controls'} onClick={() => setTheme((x) => (x === 'dark' ? 'light' : 'dark'))}>
            <IconTheme dark={theme === 'dark'} />
          </button>
          <button id="pin-controls" className="ink-toggle" aria-pressed={pinned} aria-label={pinned ? 'Let controls retire' : 'Keep controls visible'} title={pinned ? 'Let controls retire' : 'Keep controls visible'} onClick={togglePin}>
            <IconPin pinned={pinned} />
          </button>
        </div>
      <nav className="region-trail" role="radiogroup" aria-label="Choose a landscape">
        {[...regions.filter((r) => trailIds.includes(r.id)), ...regions.filter((r) => !trailIds.includes(r.id))].map((r) => (
          <button key={r.id} type="button" data-trail={r.id} role="radio" aria-checked={id === r.id} aria-label={r.name} title={r.name} tabIndex={id === r.id ? 0 : -1} className="trail-token blaze-token" onClick={() => { setId(r.id); setWalk(0); setReset((x) => x + 1); }} onKeyDown={(ev) => { if (ev.key !== 'ArrowRight' && ev.key !== 'ArrowLeft') return; ev.preventDefault(); const list = [...regions.filter((r) => trailIds.includes(r.id)), ...regions.filter((r) => !trailIds.includes(r.id))]; const i = list.findIndex((x) => x.id === id); const n = list[(i + (ev.key === 'ArrowRight' ? 1 : list.length - 1)) % list.length]; setId(n.id); setWalk(0); setReset((x) => x + 1); }}>
            <RegionGlyph id={r.id} />
          </button>
        ))}
      </nav>

      </header>

      <section className="region-note" aria-live="polite">
        <h1>{region.name}</h1>
        <p>{region.details}</p>
        <p className="caption">Procedural illustration, not a mapped location. Drag to turn 360°. Pinch or scroll to zoom. <span className="keyboard-tip">Arrow keys look around; Home resets.</span></p>
        {id === 'smokies' && <a href="https://www.nps.gov/grsm/planyourvisit/kuwohi-nfg.htm" target="_blank" rel="noopener noreferrer">About Kuwohi and Newfound Gap</a>}
      </section>

      <nav className={`walk-bar chrome${chromeOn ? ' chrome-on' : ''}`} aria-label="Walk the path">
        <button id="step-forward" className="hand-btn hand-btn--primary" onClick={() => setWalk((x) => Math.min(200, x + 5))}>
          <ArrowNorth /> Walk ahead
        </button>
        <div className="walk-row">
          <button id="step-back" className="hand-btn hand-btn--ghost" onClick={() => setWalk((x) => Math.max(-200, x - 5))}>Step back</button>
          <button id="reset-view" className="hand-btn hand-btn--ghost" onClick={() => { setWalk(0); setReset((x) => x + 1); }}>Reset view</button>
        </div>
      </nav>
    </main>
  );
}
