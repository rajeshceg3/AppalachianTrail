import React, { useState } from 'react';
import Landing from './components/Landing';
import MapView from './components/MapView';
import Experience from './components/Experience';
import { regions } from './data/regions';

function App() {
  const [stage, setStage] = useState('landing'); // landing, map, experience
  const [selectedRegion, setSelectedRegion] = useState(regions[0]);

  const handleSelectRegion = (regionId) => {
    const region = regions.find(r => r.id === regionId);
    if (region) {
      setSelectedRegion(region);
      setStage('experience');
    }
  };

  return (
    <div className="w-full min-h-screen relative bg-stone-50">
      {stage === 'landing' && <Landing onStart={() => setStage('map')} />}
      {stage === 'map' && <MapView regions={regions} onSelectRegion={handleSelectRegion} />}
      {stage === 'experience' && <Experience selectedRegion={selectedRegion} onBackToMap={() => setStage('map')} />}
    </div>
  );
}

export default App;
