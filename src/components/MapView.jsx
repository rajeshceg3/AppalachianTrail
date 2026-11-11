import React from 'react';
import { Blaze } from './Ink';

// Northbound, in trail order, with the landmarks these scenes are drawn from.
// Miles are the trail's own rough landmarks, not survey data.
const trailStops = [
  { id: 'georgia', landmark: 'Springer Mountain', mile: 'mi 0' },
  { id: 'smokies', landmark: 'Kuwohi', mile: 'mi 207' },
  { id: 'virginia', landmark: 'McAfee Knob', mile: 'mi 713' },
  { id: 'mid-atlantic', landmark: 'Pine Grove Furnace', mile: 'mi 1,100' },
  { id: 'new-england', landmark: 'White Mountains', mile: 'mi 1,845' },
  { id: 'maine', landmark: 'Mount Katahdin', mile: 'mi 2,197' },
];

export default function MapView({ regions, onSelectRegion }) {
  const stop = (id) => regions.find((x) => x.id === id);
  return (
    <main className="landscape-guide">
      <header>
        <h1>The path north</h1>
        <p>Follow the white blazes from Georgia to Maine. These scenes are inspired by the trail, not surveyed places or elevation records.</p>
        <a href="https://www.nps.gov/appa/index.htm" target="_blank" rel="noopener noreferrer">Plan a real visit with the National Park Service</a>
      </header>
      <section>
        <h2>Along the trail</h2>
        <ol className="trail-journey">
          {trailStops.map(({ id, landmark, mile }) => {
            const r = stop(id);
            return (
              <li key={r.id}>
                <Blaze />
                <button className="trail-stop" data-region={r.id} onClick={() => onSelectRegion(r.id)}>
                  <strong>{r.name}</strong>
                  <span className="stop-meta">{landmark} · {mile}</span>
                </button>
              </li>
            );
          })}
        </ol>
      </section>
      <section>
        <h2>Beyond the trail</h2>
        <p>Side paths. Five imagined places, blue-blazed like the trail's own side trails. They are not stops on the Appalachian Trail.</p>
        <ul className="side-grid">
          {regions.filter((r) => !trailStops.some((s) => s.id === r.id)).map((r) => (
            <li key={r.id}>
              <button className="side-stop" data-region={r.id} onClick={() => onSelectRegion(r.id)}>
                <Blaze blue />
                <span>
                  <strong>{r.name}</strong>
                  <span className="stop-meta">{r.desc}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
