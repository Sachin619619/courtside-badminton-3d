# Courtside — Live 3D Badminton Arena

**Live:** https://badminton-3d.vercel.app

A regulation BWF show court rendered in real time in the browser, with two genuinely
live data feeds behind it: the court's **PBR surface maps** and the **upcoming
World Tour fixture list**.

## What's actually live

| Feed | Source | Cache | Fallback |
|------|--------|-------|----------|
| `/api/fixtures` | `en.wikipedia.org` REST — `<year>_BWF_World_Tour` | 6 h | Bundled season snapshot |
| `/api/textures` | `api.polyhaven.com` (CC0) | 24 h | Deterministic CDN paths |

The fixtures route parses the season table into typed events (name, level, host,
venue, prize, date range), filters to what hasn't finished yet in UTC, and rolls
into next season automatically once the current one runs dry.

The textures route resolves 6 surface sets to their 1k JPG maps — diffuse,
normal (GL), roughness and AO — which the client streams straight from the
Poly Haven CDN. Swapping a surface re-textures the court at runtime.

## The scene

- Regulation geometry: 13.4 × 6.1 m court, 5.18 m singles lines, 1.98 m service
  lines, net at 1.524 m centre / 1.55 m posts — all in `lib/court.ts`
- Line markings drawn to a `CanvasTexture` and laid over whichever surface is live
- Procedural shuttlecock: cork dome, skin band, 16 feather blades, binding thread
- Rally arc with the asymmetric late drop a real shuttle has (`shuttlePoint`)
- Tiered stands as a single `InstancedMesh`, floodlit truss, ACES tone mapping,
  bloom / vignette / grain

## Notes for future edits

Two bugs cost real time here, both worth remembering:

1. **`material.needsUpdate`** — the CDN maps arrive *after* the material first
   compiles. Three bakes `USE_MAP` into the shader at compile time, so without
   flagging `needsUpdate` the deck renders flat white no matter what you do to
   the lights.
2. **Coplanar geometry** — the deck's edge trim originally had its top face at
   exactly `y = 0`, the same plane as the court. The resulting z-fighting hid the
   wood entirely and read like a lighting problem.

Also: a `directionalLight` with `castShadow` defaults to a ±5 shadow frustum. The
deck is 10.4 × 18.2 m, so most of it fell outside and rendered as shadow.

## Run it

```bash
pnpm install
pnpm dev          # http://localhost:3000
pnpm typecheck
pnpm build
```

Next.js 16 · React 19 · Three.js · React Three Fiber · deployed on Vercel.
Textures CC0 via [Poly Haven](https://polyhaven.com/textures).
