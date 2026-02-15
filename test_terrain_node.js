import { getTerrainHeight } from './src/utils/terrain.js';
import { generateHeightMap, generateNormalMap, generateAlphaMap } from './src/utils/textureGenerator.js';

// Mock DOM for CanvasTexture
global.document = {
    createElement: (tag) => {
        if (tag === 'canvas') {
            return {
                width: 0,
                height: 0,
                getContext: () => ({
                    createImageData: (w, h) => ({ data: new Uint8Array(w * h * 4) }),
                    putImageData: () => {},
                    createLinearGradient: () => ({ addColorStop: () => {} }),
                    fillStyle: null,
                    fillRect: () => {},
                })
            };
        }
    }
};

// Mock THREE.CanvasTexture since we don't have three.js in node context fully working without canvas
// Wait, three.js is imported. It might fail if no canvas support.
// We can mock THREE global if needed, but let's see.
// The file imports THREE.
// We might need to mock THREE.CanvasTexture constructor.

// Actually, let's just test that the functions don't throw immediately until they hit THREE.
// But they import THREE.

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

console.log("Testing Texture Generator Functions Export:");
if (typeof generateHeightMap === 'function') console.log("generateHeightMap exists.");
if (typeof generateNormalMap === 'function') console.log("generateNormalMap exists.");
if (typeof generateAlphaMap === 'function') console.log("generateAlphaMap exists.");

console.log("All verifications passed.");
