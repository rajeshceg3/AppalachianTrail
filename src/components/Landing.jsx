import React from 'react';
import { RidgeScene } from './Ink';

export default function Landing({ onStart }) {
  return (
    <main className="landing">
      <section>
        <h1>Walk the Appalachian Trail</h1>
        <p>Six landscapes from Georgia to Maine, and five imagined places beyond it. A 360° walk, drawn by code.</p>
        <button id="begin" className="hand-btn hand-btn--primary" onClick={onStart}>Choose a landscape</button>
        <p className="caption">An illustrated experience, not a trail map or navigation tool. Sound stays off until you choose it.</p>
      </section>
      <div className="landing-art" aria-hidden="true"><RidgeScene /></div>
    </main>
  );
}
