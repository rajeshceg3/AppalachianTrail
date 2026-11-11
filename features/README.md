# Feature map - AppalachianTrail

| Feature | Entry point | Proven by |
| --- | --- | --- |
| 11 procedural 360 scenes (6 trail regions + 5 bonus landscapes) | `src/`, `#region` selector | verification/check.cjs: per-scene drag/reset + keyboard reset, real Chromium |
| Accessible controls (opt-in sound/motion, theme, 14px floor, no overflow) | `index.html` controls | verification/check.cjs assertions |
| Production build | `vite.config.js` | `npm run build` in verify skill |

The automated proof lives in `.cursor/skills/verify-appalachian-trail/`.
