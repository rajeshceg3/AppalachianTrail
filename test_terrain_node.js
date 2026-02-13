
import { getTerrainHeight } from './src/utils/terrain.js';
import { generateNoiseTexture } from './src/utils/textureGenerator.js';

console.log("Testing Terrain Height:");
try {
    const h = getTerrainHeight(0, 0);
    console.log("Height at 0,0:", h);
    if (isNaN(h)) {
        console.error("Height is NaN!");
        process.exit(1);
    }
} catch (e) {
    console.error("Error in getTerrainHeight:", e);
    process.exit(1);
}

console.log("Testing Texture Generator:");
try {
    const tex = generateNoiseTexture(128, 128);
    console.log("Texture generated successfully.");
} catch (e) {
    console.error("Error in generateNoiseTexture:", e);
    process.exit(1);
}

console.log("All verifications passed.");
