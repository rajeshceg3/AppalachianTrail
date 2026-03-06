export const regions = [
  {
    id: 'moab',
    name: 'Desert Canyons',
    desc: 'Red Rock Silence',
    details: 'Sun-baked stone and shifting sands under a relentless sky.',
    color: '#ffedd5',
    fogColor: '#fed7aa',
    fogDensity: 0.003,
    groundColor: '#b45309',
    pathColor: '#fb923c',
    treeColor1: '#78716c',
    treeColor2: '#57534e',
    particles: '#fcd34d',
    particleType: 'dust',
    environment: 'sunset',
    windIntensity: 0.8,
    birdActivity: 0.1,
    waterProbability: 0.0,
    terrainParams: { roughness: 1.5, plateau: true, coastal: false, baseHeight: -5.0 },
    vegetationParams: { density: 0.1, coniferRatio: 0.0 },
    geologyParams: { rockCount: 2.0, hasMinerals: true }
  },
  {
    id: 'nyc',
    name: 'Concrete Jungle',
    desc: 'Urban Echoes',
    details: 'Weathered pavement and the ghosts of infrastructure reclaimed by time.',
    color: '#f1f5f9',
    fogColor: '#cbd5e1',
    fogDensity: 0.015,
    groundColor: '#64748b',
    pathColor: '#94a3b8',
    treeColor1: '#15803d',
    treeColor2: '#166534',
    particles: '#94a3b8',
    particleType: 'dust',
    environment: 'city',
    windIntensity: 0.3,
    birdActivity: 0.8,
    waterProbability: 0.1,
    terrainParams: { roughness: 0.2, plateau: false, coastal: false, baseHeight: -2.0 },
    vegetationParams: { density: 0.3, coniferRatio: 0.1 },
    geologyParams: { rockCount: 1.5, hasMinerals: false }
  },
  {
    id: 'acadia',
    name: 'Tidal Shores',
    desc: 'Coastal Whispers',
    details: 'Where the ancient forest meets the relentless crashing of the sea.',
    color: '#e0f2fe',
    fogColor: '#bae6fd',
    fogDensity: 0.008,
    groundColor: '#3b82f6',
    pathColor: '#fde047',
    treeColor1: '#065f46',
    treeColor2: '#047857',
    particles: '#e0f2fe',
    particleType: 'mist',
    environment: 'sunset',
    windIntensity: 0.7,
    birdActivity: 0.9,
    waterProbability: 1.0,
    terrainParams: { roughness: 0.8, plateau: false, coastal: true, baseHeight: -10.0 },
    vegetationParams: { density: 0.8, coniferRatio: 0.9 },
    geologyParams: { rockCount: 1.8, hasMinerals: false }
  },
  {
    id: 'feywood',
    name: 'Mystic Glade',
    desc: 'Ethereal Resonance',
    details: 'Bioluminescent whispers in a forest untouched by time.',
    color: '#f3e8ff',
    fogColor: '#e9d5ff',
    fogDensity: 0.02,
    groundColor: '#581c87',
    pathColor: '#c084fc',
    treeColor1: '#a855f7',
    treeColor2: '#7e22ce',
    particles: '#d8b4fe',
    particleType: 'fireflies',
    environment: 'night',
    windIntensity: 0.2,
    birdActivity: 0.4,
    waterProbability: 0.7,
    terrainParams: { roughness: 0.5, plateau: false, coastal: false, baseHeight: 0.0 },
    vegetationParams: { density: 1.5, coniferRatio: 0.5 },
    geologyParams: { rockCount: 0.8, hasMinerals: true }
  },
  {
    id: 'wasteland',
    name: 'Scorched Earth',
    desc: 'Apocalyptic Ruins',
    details: 'Ash and ember. The silent remnants of a world that was.',
    color: '#fecaca',
    fogColor: '#fca5a5',
    fogDensity: 0.018,
    groundColor: '#451a03',
    pathColor: '#78350f',
    treeColor1: '#1c1917',
    treeColor2: '#292524',
    particles: '#ef4444',
    particleType: 'snow', // reuse snow for ash
    environment: 'sunset',
    windIntensity: 0.9,
    birdActivity: 0.0,
    waterProbability: 0.0,
    terrainParams: { roughness: 1.2, plateau: false, coastal: false, baseHeight: 2.0 },
    vegetationParams: { density: 0.2, coniferRatio: 1.0 },
    geologyParams: { rockCount: 2.5, hasMinerals: false }
  },
  {
    id: 'georgia',
    name: 'Georgia',
    desc: 'Southern Beginnings',
    details: 'Springer Mountain. Morning air carries the scent of damp earth and new beginnings.',
    color: '#e7e5e4', // Warm stone/white
    fogColor: '#e7e5e4',
    fogDensity: 0.004,
    groundColor: '#7c8a6d', // Greenish
    pathColor: '#8b7355',
    treeColor1: '#2d3a22',
    treeColor2: '#36452a',
    particles: '#ffffff',
    particleType: 'fireflies',
    environment: 'forest',
    windIntensity: 0.4,
    birdActivity: 0.6,
    waterProbability: 0.5,
    terrainParams: { roughness: 1.0, plateau: false, coastal: false, baseHeight: 0.0 },
    vegetationParams: { density: 1.0, coniferRatio: 0.7 },
    geologyParams: { rockCount: 1.0, hasMinerals: false }
  },
  {
    id: 'smokies',
    name: 'The Smokies',
    desc: 'Misty Highlands',
    details: 'Clingmans Dome. A sea of blue ridges fading into the ancient breath of the mountains.',
    color: '#dbeafe', // Blueish white
    fogColor: '#bfdbfe', // Light blue fog
    fogDensity: 0.014,
    groundColor: '#5c6b5d', // Darker green
    pathColor: '#786c5e',
    treeColor1: '#1e293b', // Dark slate blue/green
    treeColor2: '#334155',
    particles: '#e0f2fe',
    particleType: 'mist',
    environment: 'park',
    windIntensity: 0.6,
    birdActivity: 0.4,
    waterProbability: 0.8,
    terrainParams: { roughness: 1.1, plateau: false, coastal: false, baseHeight: 5.0 },
    vegetationParams: { density: 1.2, coniferRatio: 0.8 },
    geologyParams: { rockCount: 1.1, hasMinerals: false }
  },
  {
    id: 'virginia',
    name: 'Virginia',
    desc: 'Rolling Ridges',
    details: 'McAfee Knob. The valley floor opens wide, a patchwork quilt under an endless sky.',
    color: '#f0fdf4', // Very light green
    fogColor: '#dcfce7', // Pale green fog
    fogDensity: 0.012,
    groundColor: '#4d7c0f', // Vibrant green
    pathColor: '#a8a29e', // Greyish path
    treeColor1: '#15803d',
    treeColor2: '#166534',
    particles: '#f0fdf4',
    particleType: 'dust',
    environment: 'park',
    windIntensity: 0.5,
    birdActivity: 0.7,
    waterProbability: 0.4,
    terrainParams: { roughness: 0.9, plateau: false, coastal: false, baseHeight: 2.0 },
    vegetationParams: { density: 1.1, coniferRatio: 0.6 },
    geologyParams: { rockCount: 0.9, hasMinerals: false }
  },
  {
    id: 'mid-atlantic',
    name: 'Mid-Atlantic',
    desc: 'Forested Passage',
    details: 'Pine Grove Furnace. Sunlight filters through the canopy, painting shadows on the quiet floor.',
    color: '#f5f5f4', // Stone
    fogColor: '#d6d3d1', // Grey fog
    fogDensity: 0.013,
    groundColor: '#44403c', // Dark earth
    pathColor: '#57534e',
    treeColor1: '#3f6212', // Dark olive
    treeColor2: '#365314',
    particles: '#e7e5e4',
    particleType: 'dust',
    environment: 'forest',
    windIntensity: 0.3,
    birdActivity: 0.8,
    waterProbability: 0.2,
    terrainParams: { roughness: 1.0, plateau: false, coastal: false, baseHeight: 0.0 },
    vegetationParams: { density: 1.0, coniferRatio: 0.5 },
    geologyParams: { rockCount: 1.0, hasMinerals: false }
  },
  {
    id: 'new-england',
    name: 'New England',
    desc: 'Granite and Silence',
    details: 'White Mountains. Granite bones of the earth rise to meet the crisp, autumn wind.',
    color: '#fff7ed', // Orange tint white
    fogColor: '#ffedd5', // Light orange fog
    fogDensity: 0.012,
    groundColor: '#78716c', // Rocky grey
    pathColor: '#a8a29e',
    treeColor1: '#ea580c', // Orange
    treeColor2: '#b45309', // Brown/Orange
    particles: '#fdba74',
    particleType: 'leaves',
    environment: 'sunset',
    windIntensity: 0.7,
    birdActivity: 0.3,
    waterProbability: 0.6,
    terrainParams: { roughness: 1.3, plateau: false, coastal: false, baseHeight: 8.0 },
    vegetationParams: { density: 0.9, coniferRatio: 0.9 },
    geologyParams: { rockCount: 1.5, hasMinerals: false }
  },
  {
    id: 'maine',
    name: 'Maine',
    desc: 'The Final Ascent',
    details: 'Mount Katahdin. The northern terminus, where the trail ends and the sky begins.',
    color: '#f8fafc', // Slate white
    fogColor: '#cbd5e1', // Cool grey fog
    fogDensity: 0.012, // Clearer view
    groundColor: '#64748b', // Blue grey rock
    pathColor: '#94a3b8',
    treeColor1: '#0f172a', // Very dark blue/green
    treeColor2: '#1e293b',
    particles: '#e2e8f0',
    particleType: 'snow',
    environment: 'park',
    windIntensity: 0.9,
    birdActivity: 0.1,
    waterProbability: 0.9,
    terrainParams: { roughness: 1.5, plateau: false, coastal: false, baseHeight: 12.0 },
    vegetationParams: { density: 0.8, coniferRatio: 1.0 },
    geologyParams: { rockCount: 2.0, hasMinerals: false }
  }
];
