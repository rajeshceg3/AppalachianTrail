import React, { useState, useEffect } from 'react';
import Landing from './components/Landing';
import MapView from './components/MapView';
import Experience from './components/Experience';

function App() {
  const [stage, setStage] = useState('landing'); // landing, map, experience

  return (
    <div className="w-full h-full relative bg-stone-50">
      {stage === 'landing' && <Landing onStart={() => setStage('map')} />}
      {stage === 'map' && <MapView onSelectRegion={() => setStage('experience')} />}
      {stage === 'experience' && <Experience onBackToMap={() => setStage('map')} />}
    </div>
  );
}

export default App;
