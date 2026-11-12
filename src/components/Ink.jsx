import React from 'react';

// Hand-drawn ink work for the trail identity.
// Every stroke is short and confident - the wobble carries the hand, not ornament.

// The white blaze: the Appalachian Trail's own marker, 2x6 inches of paint on bark.
export const Blaze = ({ className = '', blue = false }) => (
  <svg className={`ink-blaze ${className}`} viewBox="0 0 24 72" aria-hidden="true" focusable="false">
    <path
      d="M3.2 2.4 C 8 1.4, 16 3.2, 20.8 2.2 L 21.4 20 C 20.6 36, 21.8 52, 20.6 69.6 C 14 70.8, 9 69.2, 2.6 70.2 L 2 50 C 3 34, 1.8 18, 3.2 2.4 Z"
      fill={blue ? '#3e6d9c' : 'var(--blaze, #fdfdf4)'}
      stroke="currentColor"
      strokeWidth="2.6"
      strokeLinejoin="round"
    />
  </svg>
);

// Short north arrow for the walk-ahead action.
export const ArrowNorth = ({ className = '' }) => (
  <svg className={`ink-icon ${className}`} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
    <path d="M12 20.5 C 12 14, 12.4 9, 12 4.5" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" />
    <path d="M6.2 10 C 8.4 7.8, 10.2 5.8, 12 3.4 C 13.8 5.8, 15.8 7.8, 17.8 10.2" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

// Left arrow for the trail-map sign.
export const ArrowBack = ({ className = '' }) => (
  <svg className={`ink-icon ${className}`} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
    <path d="M20 12.2 C 14 11.8, 9 12.4, 4 12" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" />
    <path d="M9.8 6.2 C 7.6 8.2, 5.8 9.8, 3.6 12 C 5.8 14.2, 7.6 15.8, 9.6 17.8" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

// Sound: a small bell of a speaker, waves when on, still when off.
export const IconSound = ({ on }) => (
  <svg className="ink-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
    <path d="M4.5 9.5 C 6 9.2, 7.5 9.6, 8.8 9.4 L 13 5.2 C 13.6 9, 13.4 15, 13 18.8 L 8.8 14.6 C 7.4 14.8, 6 14.6, 4.5 14.8 C 4.2 13, 4.4 11, 4.5 9.5 Z" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinejoin="round" />
    {on ? (
      <>
        <path d="M16.2 9.2 C 17.6 10.8, 17.6 13.2, 16.2 14.8" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" />
        <path d="M18.8 6.8 C 21.4 9.6, 21.4 14.4, 18.8 17.2" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" />
      </>
    ) : (
      <path d="M16.4 10 L 20.6 14.2 M 20.6 10 L 16.4 14.2" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" />
    )}
  </svg>
);

// Motion: a walking stick-figure's stride paused or playing, kept to two strokes.
export const IconMotion = ({ paused }) => (
  <svg className="ink-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
    {paused ? (
      <path d="M8.5 5.5 C 12 8.6, 15 10.6, 18.5 12.2 C 15 13.8, 12 15.6, 8.5 18.6 C 8.2 14, 8.4 10, 8.5 5.5 Z" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinejoin="round" />
    ) : (
      <path d="M8 5.8 C 8.4 10, 8.2 14, 8 18.2 M 15.6 5.6 C 16 10, 15.8 14, 15.6 18.4" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" />
    )}
  </svg>
);

// Theme: sun by day, moon by night.
export const IconTheme = ({ dark }) => (
  <svg className="ink-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
    {dark ? (
      <>
        <circle cx="12" cy="12" r="4.4" fill="none" stroke="currentColor" strokeWidth="2.4" />
        <path d="M12 3.2 L 12 5.2 M 12 18.8 L 12 20.8 M 3.2 12 L 5.2 12 M 18.8 12 L 20.8 12 M 5.8 5.8 L 7.2 7.2 M 16.8 16.8 L 18.2 18.2 M 18.2 5.8 L 16.8 7.2 M 7.2 16.8 L 5.8 18.2" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
      </>
    ) : (
      <path d="M16.6 3.6 C 10.6 4.6, 6 9.2, 6.4 14.6 C 6.8 19.4, 10.8 22.6, 15.4 22 C 12.2 20.4, 10.4 17.2, 10.6 13.4 C 10.8 9.4, 13 6.2, 16.6 3.6 Z" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinejoin="round" />
    )}
  </svg>
);

// Pin: keeps the controls from retiring.
export const IconPin = ({ pinned }) => (
  <svg className="ink-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
    {pinned ? (
      <path d="M13.8 3.4 C 15.8 6, 17.8 8, 20.6 10.2 C 17.4 11, 15.4 12, 13.4 13.4 C 12.8 15.4, 12.6 17.4, 12.8 19.6 C 10.8 17.6, 8.6 15.8, 6.6 14 C 8.6 13.4, 10.4 12.8, 12 11.8 C 12.8 9.2, 13.4 6.4, 13.8 3.4 Z" fill="currentColor" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
    ) : (
      <path d="M13.8 3.4 C 15.8 6, 17.8 8, 20.6 10.2 C 17.4 11, 15.4 12, 13.4 13.4 C 12.8 15.4, 12.6 17.4, 12.8 19.6 C 10.8 17.6, 8.6 15.8, 6.6 14 C 8.6 13.4, 10.4 12.8, 12 11.8 C 12.8 9.2, 13.4 6.4, 13.8 3.4 Z" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinejoin="round" />
    )}
  </svg>
);

// Landing art: three ridge strokes and the trail's white blaze. Nothing more.
export const RidgeScene = () => (
  <svg className="ridge-scene" viewBox="0 0 390 340" aria-hidden="true" focusable="false" preserveAspectRatio="xMidYMax meet">
    {/* far ridge */}
    <path d="M-10 178 C 60 130, 120 150, 185 122 C 250 96, 320 118, 400 88 L 400 340 L -10 340 Z" fill="var(--ridge-far)" />
    <path d="M-10 178 C 60 130, 120 150, 185 122 C 250 96, 320 118, 400 88" fill="none" stroke="var(--ink)" strokeWidth="2.5" strokeLinecap="round" />
    {/* middle ridge */}
    <path d="M-10 238 C 50 200, 110 222, 170 196 C 240 166, 310 196, 400 160 L 400 340 L -10 340 Z" fill="var(--ridge-mid)" />
    <path d="M-10 238 C 50 200, 110 222, 170 196 C 240 166, 310 196, 400 160" fill="none" stroke="var(--ink)" strokeWidth="2.5" strokeLinecap="round" />
    {/* near ridge */}
    <path d="M-10 300 C 70 262, 150 292, 220 262 C 290 234, 340 262, 400 240 L 400 340 L -10 340 Z" fill="var(--ridge-near)" />
    <path d="M-10 300 C 70 262, 150 292, 220 262 C 290 234, 340 262, 400 240" fill="none" stroke="var(--ink)" strokeWidth="3" strokeLinecap="round" />
    {/* the blaze, hung on the near ridge line */}
    <g transform="translate(178 200) rotate(-2.5)">
      <path d="M3.2 2.4 C 12 1.2, 26 3.4, 34.8 2.2 L 35.6 33 C 34.8 52, 36 72, 34.6 99.6 C 24 101, 15 99.2, 2.6 100.2 L 2 68 C 3.4 46, 1.6 24, 3.2 2.4 Z" fill="var(--blaze, #fdfdf4)" stroke="var(--ink)" strokeWidth="3.2" strokeLinejoin="round" />
    </g>
  </svg>
);

const REGION_GLYPHS = {
 moab: <><path d="M5 18 C 5 11, 8.5 6.5, 12 6.6 C 15.5 6.7, 19 11.2, 18.9 18" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"/><path d="M9 18 C 9 14, 10.4 11.6, 12 11.6 C 13.6 11.7, 15 14.2, 14.9 18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></>,
 nyc: <><path d="M5 19 L 5 9 L 9 9.2 L 9 19 M 10.5 19 L 10.5 5.5 L 14 5.3 L 14.2 19 M 15.5 19 L 15.5 11 L 19 10.8 L 19.1 19" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></>,
 acadia: <><path d="M3 15 C 6 12.5, 9 16.5, 12 14 C 15 11.5, 18 15.5, 21 13" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"/><path d="M6 10.5 C 7.5 8.5, 9.5 8, 11 9" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></>,
 feywood: <><path d="M12 20 L 12 13" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"/><path d="M5.5 12.5 C 5.5 8.5, 8.5 5.5, 12 5.6 C 15.5 5.7, 18.5 8.6, 18.4 12.5 Z" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinejoin="round"/><circle cx="9.5" cy="9.5" r="1.1" fill="currentColor"/><circle cx="14" cy="10.2" r="1.3" fill="currentColor"/></>,
 wasteland: <><circle cx="12" cy="12" r="4" fill="none" stroke="currentColor" strokeWidth="2.2"/><path d="M12 3.5 L 12 5.8 M 12 18.2 L 12 20.5 M 3.5 12 L 5.8 12 M 18.2 12 L 20.5 12 M 6 6 L 7.6 7.6 M 16.4 16.4 L 18 18 M 18 6 L 16.4 7.6 M 7.6 16.4 L 6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></>,
 georgia: <><path d="M4 17.5 C 6 13, 8.5 10.5, 11 11 C 13 11.4, 14 13.6, 15.8 13.4 C 17.8 13.2, 19.5 10.8, 20.5 8" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"/><path d="M6.5 9.5 C 7 7.8, 8.2 6.8, 9.8 6.9" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></>,
 smokies: <><path d="M3 17 L 8.5 7.5 C 9 6.8, 9.9 6.8, 10.4 7.6 L 13 12 L 15.6 8.3 C 16.1 7.5, 17.1 7.6, 17.5 8.4 L 21 17" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/></>,
 virginia: <><path d="M3 15.5 C 5.5 12.5, 8 13.5, 10.5 11 C 13 8.6, 15.5 10, 17.5 8.5 C 18.8 7.6, 19.8 7.8, 21 8.6" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"/><path d="M5 18.5 C 8 17, 12 18.8, 16 17.2" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></>,
 'mid-atlantic': <><path d="M4 16 L 9 9.5 L 12.5 13.5 L 16 8 L 20 16" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/><path d="M10.8 18.5 C 13 17.4, 15.4 17.6, 17.5 18.4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></>,
 'new-england': <><path d="M6 19 L 6 8.5 L 12 4.5 L 18 8.4 L 18.1 19" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinejoin="round"/><path d="M9.5 19 L 9.5 14.5 L 14.5 14.4 L 14.6 19" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/></>,
 maine: <><path d="M4 18 L 9.5 8 C 10 7.2, 11 7.3, 11.4 8.1 L 14.5 14.5 L 16.8 11.3 C 17.3 10.6, 18.2 10.7, 18.6 11.4 L 20.5 18" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/><circle cx="17" cy="5.5" r="1.8" fill="none" stroke="currentColor" strokeWidth="1.8"/></>,
}
export function RegionGlyph({ id }) {
 return <svg className="ink-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">{REGION_GLYPHS[id] || null}</svg>
}
