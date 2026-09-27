# Miko Motion and Emotion Pack v2

This directory is intentionally asset-only. The production-ready files are in `web/`; matching full-resolution transparent PNG masters are in `source/`.

## Recommended state sequences

- Normal horizontal travel: loop `travel-run`; flip the sprite for leftward motion.
- Moving to a higher viewport target: `travel-leap-up`, then transition to the existing hover/fly pose.
- Occasional comic trip: `trip-stumble` → `trip-tumble` → `trip-impact` → `trip-dizzy` → `recover-getup`.
- Failed climb: `climb-reach` → `climb-struggle` → `climb-slip` → `trip-impact` → `trip-dizzy` → `recover-getup`.
- Strong crying: hold or pulse `cry-full-sob`; for movement use `cry-walk`.

Use the per-frame timing in `manifest.json`. Preload every `web/` asset before starting a sequence. Keep the existing stage translation, facing flip, squash, rotation, shadow, speech, tour and click systems; these sprites replace only the visible pose.

For the trip gag, trigger it rarely (roughly 8–12% of long non-tour moves), never during precision tour pointing, and add a short cooldown so it stays charming. A tiny camera-free screen shake, dust puff or `!` emote can accompany `trip-impact`.

For climbing, use it when the destination is materially above Miko and direct flight is intentionally unavailable. If the top target is functional/navigation-critical, recover after one failed gag and switch to the normal upward travel behavior so Miko never becomes stuck.

## Fix the Tour with Miko overlap

The overlap is layout logic, not an art asset problem. In `nav-stage.js` inside `placeBubble()`, reserve the active HUD’s bottom edge before clamping the speech bubble:

```js
const hud = document.querySelector(".nav-hud.is-on");
const safeTop = hud ? hud.getBoundingClientRect().bottom + 12 : 10;
// Use safeTop instead of 10 in the `y < ...` check and final y clamp.
```

Concretely, replace `if (y < 10)` with `if (y < safeTop)` and clamp with `clamp(y, safeTop, vh() - bh - 10)`. On very short screens, move the HUD to the bottom or collapse it to progress plus the End tour button. Keep the HUD at a higher z-index, but do not solve this with z-index alone—the speech bubble must be repositioned outside its rectangle.

## Suggested rig mappings

- `run` → `travel-run`
- `jump` or upward transition → `travel-leap-up`
- `fall` sequence → frames 03–06
- `getup` → `recover-getup`
- `cry` → `cry-full-sob`
- `sadwalk` → `cry-walk`
- new `climb` action → frames 09–10
- new `climbFail` action → frames 09–11, then impact/recovery

Do not overwrite the existing v1 sprites. Add these as new state names and keep the old sprites as fallbacks.
