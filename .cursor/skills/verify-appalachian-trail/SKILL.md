# Verify AppalachianTrail

Appalachian Trail - accessible 360-degree low-poly trail landscapes (vite + React + three.js).

## Launch
`npm install`, then `npm run dev` (or `npm run build && npm run preview`).

## Doctor
`python3 .cursor/skills/verify-appalachian-trail/verify.py` - takes a few minutes (real Chromium scene runs).

## Drive
Builds with vite, then runs the repo's own verification/check.cjs in headless Chromium: real drag followed by canonical Reset on every scene, keyboard/Home reset, opt-in sound/motion state, 14px label floor, no horizontal overflow. Default matrix is 390px/dark with both motion preferences (22 states) via VERIFY_WIDTH/VERIFY_THEMES; unset those for the full 3-width x 2-theme matrix.

## Evidence
`.cursor/skills/verify-appalachian-trail/evidence.json` plus pixel proofs under `verification/pixels/`.

## Cleanup
The check kills its preview server; screenshot artifacts stay under verification/pixels.

## Known boundaries
Subjective audio/visual quality is unverified; contrast samples live in verification/contrast.json from a separate recorded run.
