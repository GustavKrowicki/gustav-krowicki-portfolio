# City rules: projection, units, scale, anchors, timing

Draft, 2026-10-11. Derived from measuring the current city (`components/city/pogicity/types.ts`, `MainScene.ts`,
the sprite converter, the LEGO HQ sprites) and from how Tom Johnson's Pilgrimage is built (one camera and one
scale for everything). Every number below is either measured or computed from one base constant: the tile.

## 0. The base constant

```
TILE_WIDTH  = 44 px   TILE_HEIGHT = 22 px          (existing)
k   = TILE_WIDTH / sqrt(2) = 31.11 px  per tile of ground length
k_h = k * cos(pitch)       = 26.94 px  per tile of height (at 30 deg)
```

Everything else (camera, sprite zoom, offsets, character size, speeds, door sizes) is expressed in tiles and
converted with `k` and `k_h`. Nothing is tuned by eye per building.

## 1. Camera and projection

| Rule | Formula / value | Today |
| --- | --- | --- |
| One projection for tiles, buildings, characters | orthographic, yaw 45 deg + n x 90 deg (4 views) | tiles 2:1, buildings true iso |
| Pitch follows the tile ratio | `pitch = asin(TILE_HEIGHT / TILE_WIDTH) = 30 deg` | converter renders 35.26 deg: footprints are 1.73:1 diamonds on a 2:1 grid, edges ~3.4 deg off the roads |
| Light lives in camera space | key light fixed relative to the view (e.g. from screen upper-left), so the same screen faces are lit in all 4 views | converter key fixed in world space at (5, 10, 5) |
| Integer zoom for pixel art | camera zoom in {1, 2, 3} when sprites are on screen; snap scroll to whole device pixels | free zoom |

## 2. Sprite export (converter) settings are computed, not picked

For a model whose ground footprint is `W x H` tiles, rendered into an `N`-px square sprite (the converter scales
the model's largest dimension to 3 units and frames 5 / zoom units):

```
zoom = 5 * W * TILE_WIDTH * maxDim / (3 * sqrt(2) * N * footprintWidthInModelUnits)
     ~ 0.135 * W              (N = 384, footprint = largest dimension)
F    = 5 / zoom
vOff = (W + H) * TILE_HEIGHT / (4 * N)  -  yGround * cos(pitch) / F
```

`vOff` puts the model's ground centre on the footprint centre, given the game's anchor (sprite origin
(0.5, 1) at the footprint's bottom vertex). Pick `N` as the next of 384 / 512 / 768 that fits the footprint
diamond (`(W + H) * TILE_WIDTH / 2`) plus the building height.

Measured today: LEGO HQ is exported at zoom 1.0 on a 3 x 3 footprint, i.e. 2.47x too large for its footprint,
and its ground centre sits ~73 px above the footprint centre (compensated by `collisionPadding`). At 30 deg with
the formulas above it lands exactly on a 7 x 7 footprint at almost the same size (zoom 0.945, vOff 0.235), or
exactly on 3 x 3 at zoom 0.405 (see the pitch test).

## 3. Scale: two scales, one declared ratio

The city mixes a character scale and a map scale. Make both explicit instead of accidental.

| Scale | Unit | Value |
| --- | --- | --- |
| Character | 1 tile ~ 0.87 m | player sprite 56 px tall = 2.08 tile-heights at k_h = 26.94 (1.8 m person) |
| Map (landmarks) | footprint from real size | `tiles = round(7 * sqrt(realWidth_m / 300))`: square-root compression anchored on LEGO HQ (300 m -> 7 tiles); a 40 m office -> 3, a 150 m library -> 5 |
| Storey (all buildings) | constant glyph | one storey = 0.35 tile of height = 9.4 px, so windows and doors are the same size everywhere |

Square-root compression keeps the hierarchy honest (big things stay bigger) without letting a campus
swallow the map. A constant storey height is what makes different buildings feel like one city.

## 4. Doors and the walk-in (the bridge between the two scales)

- Interior and cut-in use the character scale (Tom's rule): `door = 1.1 x character height`, `storey = 1.25 x
  character height`, doorways centred on a tile edge facing a path tile.
- The door-moment zoom is computed: `Z = 1.1 * characterHeight_px / doorHeight_px_on_map`. With a map door of
  0.8 storey (7.5 px) and a 56 px character, `Z ~ 8.2` (three doublings), which is also the zoom at which to cut
  to the interior so nothing pops.

## 5. Anchors and alignment

- Buildings: anchor = ground centre of the footprint (via `vOff` above). Collision = footprint, no padding.
- Characters: anchor = feet (sprite bottom centre), positions continuous, depth sorted by the front vertex.
- Buildings are square to the grid and rotate in quarter turns. Source layouts that are rotated (the LEGO
  campus wings sit 32 deg off the tile) are rotated to the grid before export.

## 6. Timing

| Rule | Formula | Today |
| --- | --- | --- |
| Movement is time based | `pos += speed * dt` (tiles/s) | `lerp(pos, target, 0.20)` per frame: 2x faster at 120 Hz |
| Feet don't slide | `speed = 2 * stride / cycleTime` (stride measured in the GIF, px / k) | walk cycle 16 frames x 30 ms = 0.48 s |
| Pan duration grows with distance | `t = clamp(200 + 0.5 * d_px, 250, 800) ms`, ease-in-out cubic | fixed 800 ms |
| Zoom feels uniform | interpolate `log(zoom)`; `t = 250 ms * abs(log2(z1 / z0))`, clamped 250-900 ms | linear zoom |
| Doors open on arrival | start opening at distance `speed * tOpen` (tOpen ~ 0.5 s) | - |

## 7. Look and feel

- One value level for all sprites: mean luminance 70-95 under the converter light (today 65-130), hues free.
- Facades use a modular scale: bay = 1.1 storey, window = 0.6 bay, plinth = 1 storey, parapet = 0.13 storey.
- One outline for everything (1 px warm near-black), so smooth building renders and pixel-art characters read as
  one world.
