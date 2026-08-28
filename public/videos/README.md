# Homepage hero tour videos

The default `/` hero plays these prerendered CircuitNetwork captures:

- `hero-tour-desktop.mp4` — 1920×1080
- `hero-tour-mobile.mp4` — 720×1560

HTML credit cards (name, price, product link) are overlaid at runtime from
the catalog seed and the hold cue table. Re-record whenever the curated
stop list (`?tourCap=N`, default 15) or camera timing changes.

```bash
# Dev server must be running.
bun run record:hero-tour
bun run scripts/record-hero-tour.ts --only desktop
bun run scripts/record-hero-tour.ts --only mobile --cap 15 --url http://127.0.0.1:3000
```

Recorder flags: `?heroAutoTour=1&hero3d=1&heroPark=1&tourCap=15`.
Requires Playwright Chromium and `ffmpeg` on `PATH`.
