# Image analysis: LEGO campus (AI Studio game-like image, 27 Jan 2026)

References
- PRIMARY (style, colour, facade language, identity): `ref/ai-studio-campus.jpg`, Gustav's Google AI Studio
  "game-like" rendition of the aerial photo; the current Krea campus model was generated from it.
- SECONDARY (facade detail): `ref/ai-studio-courtyard.jpg` (courtyard close-up: perforated facade,
  glass bridge, brick arch, minifigure statue).
- MEASURED PLAN (structure only, never geometry): top-down height and colour maps rasterised from the
  Krea GLB (`~/Downloads/LEGO HQ.glb`), vectorised into `measure/plan.json` (building outlines in a
  frame rotated 32 deg, median roof heights) and `measure/ground.json` (sand, roads, plaza, trees).
- FRAMING BASELINE: the live sprites `lego-hq_{south,west,north,east}.png` (converter: 384 px, zoom
  1.0, vertical offset 0.31). Procedural renders go through the same converter maths and are compared
  against these for proportions and offset.

## L1 Identification
A campus of low office wings with green roofs on a square ground tile: one central glass atrium,
a round courtyard building, two tall yellow-framed blocks, a lower building with a roof terrace and
a perforated facade, a tree plaza with a giant minifigure statue, sand field with a loop path, roads.
primaryDomain `object` (architectural assembly); confidence 0.9.

## L2 Form & silhouette
Macro: square slab (ground tile, 1.0 x 1.0, thin) carrying rectilinear extruded masses on a grid
rotated 32 deg in the tile. Roof heights (Krea units, ground top at -0.111): terrace building -0.015,
main wings ~0.005-0.009, courtyard wings 0.048, atrium 0.078, north yellow bar 0.088, south yellow
block 0.112. Round building: ring r 0.128 / courtyard r ~0.04, roof ~0.008, brick plinth ring.

## L3 Decomposition
Macro: ground tile, ~9 building masses, round building, atrium. Meso: roof slabs, parapets, window
bands per floor, yellow frames, skylight disc, roof terrace + greenhouse, trees, minifigure, entrance
(yellow 2x4 plate + glass vestibule). Micro: skylight domes (19, radial), studs, door panels.

## L4 Spatial relationships
Buildings sit flush on the ground tile; atrium joins the courtyard wings; yellow bar stands on the
north wing's west end; tallest yellow block caps the south wing's east end; plaza lies between north
wing, atrium and terrace building; the main entrance faces the plaza from the atrium's north face.

## L5/L6 Materials & colour (AI image palette, flat illustration)
Roof grass green (#7cc242), parapet dark grey (#3c3f41), facades light grey/white (#d9d9d2) with
dark window bands (#2b3a42) and warm window panels, yellow frames (#f2c500), atrium glass light blue
(#8fb3c2) with yellow diagonal bracing, skylight disc white with blue domes (#4f7fb8), brick
(#8a4b3a), sand beige (#c4b17d), roads grey (#5f625b), plaza paving (#85867e), trees blocky green.

## L7 Identity features
1 green roofs with dark parapets; 2 round courtyard building; 3 atrium skylight circle; 4 two
yellow-framed blocks; 5 minifigure statue on the plaza; 6 yellow 2x4 plate entrance (absent from the
AI image as a plate: it drew a stud-less yellow bar; rebuilt from photo evidence, ~2x true size).

## L8 Uncertainty
Hidden building backs (single view; Krea also invented them): use symmetric facades. Window
counts are stylised (bands per floor). The tile edge clips the west wing, as in the AI image.
