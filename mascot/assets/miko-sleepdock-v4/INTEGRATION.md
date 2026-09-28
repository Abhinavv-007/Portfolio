# Miko Sleep Dock v4

Use this pack when the visitor selects **No** or dismisses Miko. It replaces the tall edge-peek state with a small, quiet, clickable sleeping Miko.

## State sequence

1. Hide Miko's speech bubble, menu, tour bar, tooltip, and overlay.
2. Show `settling` for about 420 ms.
3. Switch to `sleeping` and keep it visible until clicked or programmatically awakened.
4. On click/tap, show `waking` for about 350 ms.
5. Show `stretching` for about 450 ms.
6. Return to the existing normal idle/menu state and restore all existing interactions.

## Placement

- Dock in a safe bottom corner instead of along the full page edge.
- Render at 72–96 px high on desktop and 60–78 px high on mobile.
- Keep 12–16 px from viewport edges and interactive site controls.
- If the preferred bottom-right position overlaps page UI, automatically use bottom-left.
- Use `object-fit: contain`; do not stretch, crop, or enlarge the transparent canvas.
- The sleeping hit target remains clickable with `pointer-events: auto`, button semantics, keyboard activation, and `aria-label="Wake Miko"`.

## Motion and behavior

- Sleeping motion should be almost still: a 2.6–3.2 second ease-in-out breath using at most 1% scale and 1–2 px vertical movement.
- Do not display speech while asleep. The small sleep marks already communicate the state.
- Do not run walk, glide, drag, pointer-follow, or random-emotion motion while asleep.
- A click, keyboard activation, tour restart, or explicit wake event must cancel the sleep state and run the wake sequence once.
- Preserve the current tour, vertical flight, horizontal glide, drag, click, expression, and responsive behavior after waking.
- Preload all four WebP files so the wake sequence never flashes blank.
- Store only the dismissed/sleeping preference in `sessionStorage` if persistence is desired; do not permanently disable Miko.

## Suggested state flow

`active -> settling -> sleeping -> waking -> stretching -> active`

The sprite timing lives in `manifest.json`. High-resolution PNG masters are in `source/`; website-ready transparent WebP files are in `web/`.
