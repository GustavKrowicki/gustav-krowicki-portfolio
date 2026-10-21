# City standard: units, scale, camera, placement, entrances, walking, depth

Version 1, 2026-10-11. The standard every rebuilt building, character and city feature follows. It replaces
"tuned by eye" with one unit and a handful of ratios, in the spirit of Tom Johnson's Pilgrimage (one camera, one
scale, everything measured in tiles). Section 12 lists what differs from the city today.

## 1. Units

| Name | Definition | Value |
| --- | --- | --- |
| **World unit (wu)** | One tile edge. All game logic (positions, sizes, speeds, distances, heights) is in wu | 1 wu = 1 tile |
| Real-world size | Implied by the existing Pogicity props (lamp ~2 wu tall, jeep ~2 wu long, bench/tree ~1 wu) | 1 wu ~ 2 m |
| Screen scale | Orthographic scale at zoom 1: `k = TILE_WIDTH / sqrt(2)` | k = 31.11 px per wu |
| Height on screen | Vertical wu at the standard pitch: `k_h = k * cos(30 deg)` | k_h = 26.94 px per wu |
| Ground step on screen | One wu along a grid axis moves the screen by (22, 11) px | 24.6 px |

Rules:
- Positions are continuous `(x, y, z)` in wu; grid cells are the integer part. Pixels exist only in the render step
  (`worldToScreen`), never in movement, collision or trigger logic.
- Heights (`z`) are in wu, measured from the ground plane.
- Constants live in one module (`lib/city/units.ts`) and nothing else hard-codes pixels.

## 2. Scale

Characters set the scale; buildings are compressed in plan, never in storey or door height.

| Element | Standard | At zoom 1 |
| --- | --- | --- |
| Character height `H_c` | 0.9 wu (1.8 m) | 24 px |
| Door | height `H_c + 0.1` = 1.0 wu; width 0.5 wu (single) or 1.0 wu (double) | 27 px high |
| Storey | 1.2 wu (ground floor 1.4 wu) | 32 px (38 px) |
| Window | 0.5 wu wide, 0.6 wu high, bay 1.0 wu | 12 x 16 px |
| Parapet / roof edge | 0.15 wu | 4 px |
| Visible storeys | small buildings 1-2, offices 2-3, landmarks up to 4 plus one feature (tower, atrium) | |

Footprints (plan compression, square root, anchored on LEGO HQ):

```
tiles = clamp(round(7 * sqrt(realWidth_m / 300)), 2, 8)       per side, from the real building
```

A 10 m kiosk gets 2 tiles, a 40 m office 3, a 150 m library 5, the 300 m LEGO campus 7. Big things stay bigger,
nothing swallows the map, and every building keeps character-scale doors and storeys, so the person always reads
against the architecture. It is toy-like on purpose: a LEGO campus that looks like a LEGO model.

The rule sets each side on its own. Exception: the Valtech office is 6 x 2, where the rule gives 3 for its 70 m long side,
because Gustav chose its long, narrow proportions (4 x 2) and then room for a walk-in street-level interior (6 x 2,
2026-10-16).

## 3. Camera and projection

| Rule | Standard |
| --- | --- |
| Projection | Orthographic, one camera for tiles, buildings, characters and props |
| Pitch | `asin(TILE_HEIGHT / TILE_WIDTH)` = 30 deg (the 2:1 tile defines it) |
| Yaw | 45 deg; 4 views in 90 deg steps if rotation is added; sprites exist for all 4 |
| Zoom presets | powers of two: Overview (fit the city, <= 1), **Street = 2 (the default play zoom)**, Detail = 4, Door cut-in = `Z_door` (section 6) |
| Pixel crispness | integer zoom while pixel art is on screen; camera scroll snapped to whole device pixels |
| Light | key light fixed in camera space (from screen upper left, 45 deg up), so the same screen faces are lit in every view; ambient 0.6 |

At Street zoom the standard character is 48 px tall, about today's on-screen size, so the look is kept while the
world finally matches it.

## 4. Asset export (sprites)

- Texel density: buildings and props are rendered at **2x** (62.2 px per wu) and displayed at scale 0.5, so they stay
  crisp at Street zoom. Characters are drawn at 24 px (1x) and shown at integer zoom.
- Converter settings are computed from the footprint, never picked (model largest dimension normalised to 3 units,
  frame `5 / zoom` units, sprite `N` px, density `d` = 1 or 2):

```
zoom = 5 * W * TILE_WIDTH * d * maxDim / (3 * sqrt(2) * N * footprintWidthInModelUnits)
F    = 5 / zoom
vOff = (W + H) * TILE_HEIGHT * d / (4 * N)  -  yGround * cos(30 deg) / F
```

- `N` is the next of 384 / 512 / 768 / 1024 that fits the footprint diamond `(W + H) * TILE_WIDTH * d / 2` plus
  the building height. The game draws the sprite with origin (0.5, 1) at the footprint's bottom vertex.
- Every building is built in wu inside its model (`1 wu = 1 model unit` before normalisation), so the same numbers in
  section 2 apply in the modelling tools.

## 5. Placement and anchors

| Thing | Anchor | Footprint / collision |
| --- | --- | --- |
| Building | ground centre of its footprint (via `vOff`) | footprint = collision, exactly; no padding |
| Character | feet, continuous position | 0.4 wu circle |
| Prop | tile centre (or its own small footprint) | its footprint |

- Buildings sit on whole-tile footprints, rotate only in quarter turns, and are square to the grid. Source layouts
  that are rotated (the LEGO campus wings are 32 deg off its tile) are squared before export.
- Every building has 1 wu of clearance on its entrance side and paths or plaza tiles leading to the entrance.
- Blocks are sized in whole tiles; a building fills its block minus the clearance.

## 6. Entrances (defined by the architecture, not the UI)

Every building spec declares one main entrance:

```
entrance: { side: 'south' | 'east' | 'north' | 'west', at: tileIndexAlongSide, width: 0.5 | 1.0 }
```

and the model is built from it:
- **Readable without UI.** At least two of: a canopy or porch projecting >= 0.5 wu, an accent colour on the door
  surround, a glazed or lit door, a step or threshold, a path ending at it. (LEGO HQ: yellow 2x4 plate canopy, glass
  doors, lit vestibule.)
- **Visible in the default view.** The entrance faces a camera-facing side (south or east at yaw 45).
- **Centred on a tile edge**, with a walkable **approach tile** directly in front.
- **Interaction target = the approach tile**, not the building centre: click a building and the character walks to
  the approach tile and turns to face the door. Trigger zone = approach tile plus 1 wu.
- **Doors react**: open when the character is within 1.5 wu, opening time 0.4 s, so they are open on arrival.
- **Door cut-in zoom** is computed so the door fills about a quarter of the viewport height:
  `Z_door = 0.25 * viewportHeight_px / (doorHeight_wu * k_h)`, rounded down to a power of two (8 on a 900 px desktop
  viewport, 4 on a phone). The interior scene starts at the same zoom, so nothing pops.

## 7. Walking

| Rule | Standard |
| --- | --- |
| Speeds | walk 1.6 wu/s, run 3.2 wu/s (game speeds: brisk, not real time) |
| Stride | step length 0.45 wu (walk), 0.7 wu (run); cadence = speed / step |
| Animation | walk cycle = 2 steps = 0.56 s; run cycle = 0.44 s; feet never slide (cycle derived from speed) |
| Integration | time based: `pos += velocity * dt`, ease in 0.08 s and out 0.12 s; no per-frame lerp |
| Directions | 8, chosen relative to the camera yaw; facing changes with a small hysteresis so it does not flicker |
| Paths | 8-way grid path, no corner cutting, diagonal cost sqrt(2), smoothed to straight segments; ends on the approach tile |
| Input | tap or click ground: walk; on a building or person: walk to its approach tile; long press: walk / run menu; drag: pan; pinch / wheel: zoom |

## 8. Depth and overlap

- Sort key in wu: characters by their feet `x + y`; buildings by their front corner.
- Buildings of 3 wu or wider are drawn as **1 wu column slices**, each sorted by its own front depth, so a character
  can stand in front of one wing and behind another.
- Walkable space is never inside a footprint (collision = footprint), so sorting stays unambiguous.
- When the player is hidden behind a building, draw a 50% silhouette of the player on top (never lose the player).
- Props and characters share the same sort; ties break by `y`, then by draw order.

## 9. Render and feel

- One value band for every sprite: mean luminance 70-95 under the standard light; hues free.
- One outline: 1 px warm near-black on characters, props and building silhouettes.
- Life: every landmark has at least one ambient loop (2-4 s: a flag, a screen, a door, lights), lights on at night,
  and reacts to the player near its entrance.
- Night: the visitor's own clock in their browser (19:00 to 07:00), or the time of day the visitor picks on the button next to Walk (Auto, Morning, Day, Evening, Night; remembered in the browser), or `?night=1` / `?night=0` tints every scene object
  dark blue over 0.9 s. A building's `nightLights` strip (cropped from its south sprite like `ambient`) is drawn
  untinted above all its slices, so only what is lit glows. With `hours` it is on only then (the stadium's floodlights:
  17:00 to 23:00, an evening match), switching over 2 s.
- Walk-in and portfolio buildings get their lit windows from the 3D model (`nightWindows`): the south sprite rendered
  again with the glass flat warm and every other part only hiding what is behind it (entrance lab `glow`, the
  building's `export_windows.sh`), in two groups plus the ground floor shopfront, set by the hour like the filler
  buildings and hidden while the roof is off.
- Street lamps (`lib/city/streetLights.ts`): placed by hand in the editor (lamp tab) and saved on the cell as
  `streetLamp` in `cityGrid.json`. Three types: wire lamps over roads (the wire crosses the road by itself), post lamps
  on squares and paths, lanterns on old streets; posts and lanterns never stand on a road. At dusk they switch on one by one; each throws an additive warm pool on
  the ground and lights the player warm inside it. `?hour=0..23` stands in for the visitor's clock.
- Four looks (`LOOKS` in `lib/city/nightSchedule.ts`): Morning (warm, about 30% darker), Day, Evening (cool, about
  40% darker, lamps on) and Night (deep blue, lamps on), each a multiply tint eased over 0.9 s. Auto picks the look from
  the hour (05 to 09 morning, 09 to 18 day, 18 to 21 evening, else night).
- The hour (`lib/city/nightSchedule.ts`): filler buildings are home, food, bar or office (and a venue: lit 17:00 to 23:00 with the floodlights). Their lit windows are found in
  the sprite (`lib/city/nightWindows.ts`: small upright patches of blue or blue-grey glass) and split in two random
  groups; the hour turns groups on (homes lit in the evening, a few up at 02:00; food open to 22:00 with a lit
  shopfront and a spill on the street; the bar to 02:00; offices dark after 21:00). Fewer walkers at night, and the
  lamps dim from 01:00 to 05:00.
- Facades follow the scale in section 2 (bay 1.0 wu, window 0.5 x 0.6 wu, plinth = ground floor, parapet 0.15 wu).

## 10. Timing

| Motion | Standard |
| --- | --- |
| Camera pan | `t = clamp(200 + 0.5 * d_px, 250, 800) ms`, ease in-out cubic |
| Camera zoom | interpolate `log(zoom)`; `t = 250 ms * abs(log2(z1 / z0))`, clamped 250-900 ms |
| Door | 0.4 s open, 0.6 s close, starts at 1.5 wu |
| UI responses | hover/press feedback within 100 ms; panel open 250 ms |

## 11. Site and mobile (target, after Tom's patterns)

- The world and the content live on one page: the world stays mounted, content opens in a panel (desktop side panel,
  mobile bottom sheet: peek card -> half sheet with the world live above -> full sheet).
- Every case and job in the content has a "Show in city" control that walks or flies to its building's entrance.
- The URL stores the panel and the world state (position, facing, zoom), so every moment can be shared and the
  back button works.
- Onboarding is a small checklist taught by doing (walk, move the camera, zoom, enter a building), not a mode gate or
  slideshow.
- Touch targets >= 44 px; every control labelled; a hidden link list of all content for search and screen readers.

## 12. Today versus the standard

| Area | Today | Standard | Change |
| --- | --- | --- | --- |
| Units | `lib/city/units.ts` holds the standard and the wu/screen conversions; player position still in screen px | wu everywhere, px only in render | refactor movement and triggers onto wu |
| Pitch | Krea sprites 35.26 deg; LEGO HQ 30 deg | 30 deg | re-export as buildings are rebuilt |
| Player sprite | 57 px tall (2.1 wu), twice the NPCs | 24 px (0.9 wu), shown at Street zoom 2 | redraw the walk cycles at 24 px |
| NPC sprites | 27-35 px | 24 px | redraw or rescale |
| LEGO campus storeys | ~0.2 wu (windows ~5 px) | 1.2 wu, 2-3 visible storeys | rebuild the wings to the storey standard |
| Footprints | mostly 3x3 by habit; LEGO HQ 7x7 | square-root rule | set per building when rebuilt |
| Collision | padding hacks (LEGO HQ removed) | footprint only | remove the remaining padding |
| Entrances | none modelled; trigger radius around the centre | declared entrance, approach tile, reacting doors | per building spec |
| Movement | per-frame lerp 0.2 (frame-rate dependent) | time based, fixed speeds | PlayerController |
| Walk cycle | 16 x 30 ms = 0.48 s regardless of speed | derived from speed and stride | sprite timing |
| Depth | whole building sprites | column slices + player silhouette | renderer |
| Camera | Phaser follow (lerp / dead zone); pans and zooms timed by section 10; pixels snap at integer zoom; wheel and pinch zoom freely; canvas scaled by CSS (`Scale.FIT`); world-fixed light | zoom presets, computed timing, camera-space light, canvas at device resolution | presets on input, `Scale.RESIZE`, converter light |
| Site | `/city` separate route, torn down on case open | one page, panel + sheet, URL state | site integration |
