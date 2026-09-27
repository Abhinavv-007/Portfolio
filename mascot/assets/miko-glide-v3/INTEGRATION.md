# Miko Horizontal Glide Pack v3

Replace horizontal `walk`, `run` and `sadwalk` visuals with these glide states. Keep the existing position tween, facing flip, tours, clicks, dragging, vertical flight, speech and arrival actions.

Sequence:

1. `glide-takeoff` for about 220ms.
2. `glide-cruise` for normal horizontal travel, or `glide-sad` when the active emotion is sad/cry/sob.
3. `glide-brake` for about 260ms, then switch to the destination pose.

Move the entire character with smooth translation; do not alternate leg frames. During cruise add only a 2–4px sine-wave bob, a subtle 1–2 degree tilt and optional code-generated star particles behind the cape. The cruise artwork is intentionally diagonal to preserve clean transparency; rotate the rendered sprite slightly clockwise if a flatter horizontal silhouette is preferred.

Flip the sprite for leftward travel. Preload all four WebP files. Short trips under roughly 120px can skip cruise and use takeoff → brake. Vertical movement should continue using the existing flying/hover behavior.

Disable the old walking leg-cycle pose while translating horizontally. Do not trigger the trip/fall gag during glide; it may happen only after landing.
