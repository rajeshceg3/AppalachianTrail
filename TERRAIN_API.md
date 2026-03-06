# Terrain API and Data Structures

## Overview
The terrain system has been upgraded to support completely dynamic, parameter-driven biome generation. It generates unique geometry and ecosystem features based entirely on the `region` configuration data passed to it.

## Region Configuration Data Structure
Each region object defined in `src/data/regions.js` can include three primary configuration objects that dictate the environmental rendering:

### `terrainParams`
Controls the physical shape, elevation, and broad texturing of the landscape.
*   **`roughness`** *(Number, default: 1.0)*: Multiplier for the height maps and erosion algorithms. High values (e.g., 1.5) create jagged canyons or mountains. Low values (e.g., 0.2) create flat, rolling plains.
*   **`plateau`** *(Boolean, default: false)*: If true, flattens the peaks of the generated noise, creating flat-topped mesas. It also triggers a dusty red vertex color blend near the edges of steep drops.
*   **`coastal`** *(Boolean, default: false)*: If true, flattens terrain below sea level, ensuring an absolute flat water line, and triggers sandy vertex color blending on low-lying ground.
*   **`baseHeight`** *(Number, default: 0.0)*: Absolute vertical offset applied to the entire generated terrain mesh, shifting the floor up or down relative to `y=0`.

### `vegetationParams`
Controls the flora ecosystem.
*   **`density`** *(Number, default: 1.0)*: Multiplier for the base number of trees generated. Values < 1 create sparse landscapes (e.g., deserts, wastelands), while values > 1 create dense forests.
*   **`coniferRatio`** *(Number, default: 0.7)*: Determines the proportion of conifer (pine) trees to broadleaf trees. Range is `0.0` (all broadleaf) to `1.0` (all conifer).

### `geologyParams`
Controls non-flora ground clutter and geologic points of interest.
*   **`rockCount`** *(Number, default: 1.0)*: Multiplier determining the density of large boulders and scattered pebbles.
*   **`hasMinerals`** *(Boolean, default: false)*: If true, generates clusters of glowing, emissive crystalline structures integrated into the terrain geometry. Designed for mystical or sci-fi environments.

## Integration Workflow
1.  **Define Location:** Add a new JSON object to the array in `src/data/regions.js`.
2.  **Assign Parameters:** Adjust the parameters above to dial in the aesthetic. Example:
    ```javascript
    {
      id: 'alien-world',
      terrainParams: { roughness: 2.0, plateau: true, coastal: false, baseHeight: -5.0 },
      vegetationParams: { density: 0.0, coniferRatio: 0.0 }, // Barren
      geologyParams: { rockCount: 3.0, hasMinerals: true },  // Rocky & mystical
    }
    ```
3.  **Engine Handling:** The components (`Terrain.jsx`, `Vegetation.jsx`, `Rocks.jsx`) automatically receive these nested parameters from `Scene.jsx` and pass them down into the generation algorithms located in `src/utils/terrain.js`.