import { getTerrainHeight, getPathX } from '../src/utils/terrain.js';

console.log("Testing Terrain Generation...");

try {
    const x = 0;
    const z = 0;
    console.log(`Testing (x=${x}, z=${z})`);

    const pathX = getPathX(z);
    console.log(`PathX: ${pathX}`);

    const height = getTerrainHeight(x, z);
    console.log(`Height: ${height}`);

    if (isNaN(height)) {
        console.error("Height is NaN!");
        process.exit(1);
    }

    // Test a few points
    for (let i = 0; i < 10; i++) {
        const testZ = i * 10;
        const testX = 0;
        const h = getTerrainHeight(testX, testZ);
        console.log(`z=${testZ}: h=${h}`);
        if (isNaN(h)) {
            console.error(`Height is NaN at z=${testZ}`);
            process.exit(1);
        }
    }

    console.log("Terrain tests passed.");
} catch (e) {
    console.error("Error during terrain test:", e);
    process.exit(1);
}
