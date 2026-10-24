# Image analysis: Valtech office

References (kept out of git, `ref/`)
- STYLE + CAMERA `ref/ref-A-gemini.png`: AI image (reference A, picked by Gustav): iso view of the block, flat colours,
  white slabs, warm grey louvre bands, recessed glass top floor, green awnings, black planters, flag mast.
- FACTS `ref/photo-6.jpg` (straight front from across the river), `photo-1..3` (angle from the bridge), `photo-4,5,7`.
- SCALE: docs/city-rules.md sections 2 and 6, against the 3D avatar (0.9 wu). Plan: Figma board node 576-3613.

## L1 Identification
A riverside office block (five office floors over a shop storey, top floor originally a penthouse) as a toy-like game
building on a 3 x 2 tile footprint. primaryDomain `object` (architectural assembly, static game prop); confidence 0.9.

## L2 Form & silhouette
One long rectangular block, horizontal bands: ground storey with an arcade (columns on the facade line, glazing set
back), then alternating thin white slabs and louvre bands, a recessed glass top floor with a flat white roof, a thin
mast on the roof terrace. Long side south (3 wu), short side east (2 wu).

## L3 Decomposition
Macro: ground storey, 4 slabs, 3 louvre storeys, top floor, roof. Meso: louvre bands per facade, columns, shop glazing,
gate passage, awnings, top-floor glass and frame, parapet. Micro: louvre slats and fins, mullions, ducts, service box,
mast, planters and shrubs, entrance door, art panel.

## L4 Spatial relationships
<louvre band, between, two slabs, flush with the slab edge>; <top floor, on, top slab, set back ~0.3 wu>;
<awnings, on, ground-storey glazing, sloping out to the column line>; <gate, in, east bay of the south side>;
<entrance door, at the back of, gate passage>; <planters, in front of, glazing, between columns>;
<flag mast, on, roof terrace west end>.

## L5 Materials (flat, PBR terms; colours from photo crops, `material-evidence/`)
White painted board-marked concrete (photo #d8d7d3, rough 0.85), louvres warm grey aluminium (photo #807f7c..#999895,
ref A warmer), dark gaps behind the slats (#3c372f), top-floor glass blue-grey (#96adbb, rough 0.2), awnings dark green
canvas (#39544d, rough 0.8), planters black (#141416), passage near-black with brick lining.
The photo is overcast and under-exposed: colours are lifted into the sprite value band, hue kept.

## L6 Lighting
Even daylight from the upper left (city converter rig with the soft shadow light).

## L7 Identity-defining features
1. White slab / warm grey louvre banding. 2. Recessed glass top floor with a white frame. 3. Dark green awnings over
the ground storey. 4. Gate passage as the entrance. 5. Flag mast on the roof.

## L8 Uncertainty
North and west facades and the small rear wing are not in the photos: the bands continue on all sides, no rear wing
(the 3 x 2 footprint has no room for it). Storey count reduced from 5 to 4 + ground at avatar scale (board decision).

## Facts from the two web pages about the building (read 2026-10-16)
- Built 1962. Six storeys: five office floors above the street storey. The top floor was originally a residence with a roof garden.
- Facade: concrete painted white, cast against rough board formwork (the board marks in the photo). The louvres are
  horizontal **cast-concrete slats, painted white**, in front of the window bands, with high parapets between them.
  In the photo the bands look grey only because the dark windows show between the white slats.
- Street storey: bar and café. A small rear wing was added later. Tenant parking is in the courtyard (that fits the gate passage).
- The model follows ref A here (warm grey slats, thin slabs), which Gustav chose. These facts are the alternative if he wants it closer to the real building.

## Direction after the full-building review (Gustav, 2026-10-16 14:41)
The all-white slats read as all grey ("a bit like a prison"). Back to the bay-proof look: warm grey louvre bands that are
clearly apart from the white concrete bands. Keep the entrance (gate, brick passage, awning, lit door). No flag mast.
Work one side at a time: finish the south side first, then the next after his OK. The state gate's loop budget was raised
to 6 per pass / 12 total for this (it had stopped at 3/3 on form-refinement).
