# Appalachian landscape repair - November 11, 2026

## What changed

- Preserved 11 scenes, but separated six Appalachian-inspired regions from five bonus landscapes. Removed an invented elevation chart and decorative route geometry that wrongly put desert/fantasy places on the trail.
- Corrected reversed THREE.MathUtils.smoothstep arguments in vegetation probability, rock placement, terrain colors and path alpha. Removed depth blur/post-processing that hid the scene and capped animated frames at 10 per second.
- Existing procedural terrain, rocks, forest, water and regional variations remain. Reduced overdraw/counts and wind displacement. Added a white-blaze marker on trail scenes. This is still an illustrated low-poly world, not a trail survey or navigation service.
- Replaced the old walker camera with 360-degree drag, pinch/wheel zoom, walk steps and a canonical Reset. Home resets and arrow keys turn the camera. Remounting each scene avoids stale region-specific geometry.
- Sound is off until opted in. Turning sound off closes the audio context; on/off/replay were executed. Actual 14-second output was captured. Subjective listening quality remains unverified.
- Opaque light/dark controls, 14px label floor, readable captions, semantic region buttons and reduced-motion preference. No eyebrow or letter-spaced tiny caps.

## Verification executed locally

`proof.json` records actual Chromium runs, not planned checks: all 11 scenes at 320 and 1440 in paused/dark mode, and all 11 at 390 in moving/light mode; earlier 390 paused/dark pass also ran. Real drag followed by Reset was checked on each. Focused keyboard/Home reset also passed in both control themes. See the separately recorded per-run caveats in the parent handoff.

`contrast.json` records 216 glyph-mask samples across entry, guide and world panels at 320, 390 and 1440, in light and dark controls. Minimum foreground/backdrop ratio was 5.456:1. The scene itself is not a text backdrop: controls and notes are opaque.

`npm run build` and full `npm audit` passed, with zero advisories after dependency updates.

CI runs the scene inventory, screenshots, drag/Reset, keyboard/Home, overflow, label floors and initial opt-in state at 320/390/1440, with normal and reduced motion. It is a separate execution gate, not a claim that CI has already passed.

## Content sources

- https://www.nps.gov/appa/index.htm : Georgia-to-Maine public footpath and white-blaze trail marking.
- https://www.nps.gov/grsm/planyourvisit/kuwohi-nfg.htm : current Kuwohi name and spruce-fir forest/Newfound Gap context. Updated the old Clingmans Dome caption.

Regional descriptions are retained poetic scene labels, not surveyed views or verified route conditions. Fantasy and off-trail scenes are explicitly labeled as bonus landscapes. No weather, routing, open/closed status or safety claims are made.
