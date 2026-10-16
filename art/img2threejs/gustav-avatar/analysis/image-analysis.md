# Image analysis: Gustav walk sprites (4 directions x 16 frames, 54-57 px tall)

Reference set: `public/game/pogicity/Characters/gustavwalk{south,north,east,west}.gif`, every frame extracted to
`ref/` by `measure_ref.py`, sheet in `ref/reference-sheet.png`. Fixed reference for the gates:
`ref/north-00-x12-white.png` (north frame 0, 12x nearest, white background). It was first `east-00`; that frame
carries the laptop prop the build leaves out, so the fixed view was re-selected (before any review was recorded)
to the north frame, which shows the same figure without the prop and matches the game camera exactly
(yaw -45, pitch 30: silhouette IoU 0.84 vs 0.78 best-case for east). Palette and bands:
`measure/palette.json`, `measure/proportions.json`.

## Layer 1 - identification
Work type: stylized game avatar of an adult man (the portfolio owner), walking. Broad class: humanoid character.
`primaryDomain = character`, confidence 0.95. Pixel art downsampled from an earlier 3D render (soft shading,
dithered edges), so it is a projection of a 3D figure at about 30-35 deg pitch, three-quarter yaw.

## Layer 2 - form and silhouette
Bilateral symmetry (except the laptop prop). Organic, low detail. Head is a near-sphere with a rounded hair cap
that is wider than the face (mop silhouette). Torso = slightly flared box (jacket), legs = two tapered
cylinders, shoes = rounded wedges. Head ~0.32 H, torso (shoulder to jacket hem) ~0.36 H, legs (hem to sole)
~0.30 H, shoes ~0.09 H. Head width ~0.29 H, shoulder width ~0.23 H. That is about 3.1 head units: chibi-leaning
stylized, which is what lets the face read at 24-48 px.

## Layer 3 - macro / meso / micro
- macro: head, hair, torso (jacket over tee), arms x2, legs x2, shoes x2; prop: laptop (east frames only)
- meso: jacket collar + open front (dark tee visible as a vertical band), jacket hem, sleeves to the wrist, hands,
  trouser hem over the shoe, ears, glasses (light grey frames around the eyes, visible in east/north)
- micro: eyes (dark dots), brows hidden under the fringe, nose/mouth (sub-pixel, not readable), jacket pocket
  and button marks (dithered, not identity-defining)

## Layer 4 - spatial relationships
<hair, caps, head> overlap; <fringe, covers, forehead to brow line>; <head, sits-on, neck> socket;
<jacket, wraps, torso + upper arms> overlap; <tee, visible-through, jacket front opening> inside;
<sleeve, ends-at, wrist> butt; <trouser leg, covers, shoe top> overlap; <laptop, held-between, forearm and
hip> (east view only).

## Layer 5 - materials (PBR, all dielectric, metalness 0)
hair: matte (roughness ~0.85) dark olive-brown; skin: satin-matte (~0.7) light warm; jacket: matte cotton
(~0.9) light warm grey; tee: matte dark olive/khaki; jeans: matte dark indigo; shoes: satin (~0.6) near-black
brown; glasses: thin light-grey frame; laptop: silver aluminium (low priority prop).

## Layer 6 - colour (lit sprite medians, not albedo)
hair #403c2f, skin #937668, jacket #8c8a8d, tee #544f44, jeans #1a2232, shoes #151a20. The sprite was rendered
with a dim, flat light; albedo is brighter (calibrated so the 30 deg render lands near these medians).

## Layer 7 - identity features
1. dark olive-brown mop hair, full fringe to the brows, wider than the face
2. light grey open jacket over a dark tee (two-tone front)
3. dark indigo straight jeans
4. dark shoes
5. glasses (light frames) - small but personal
6. light skin with warm undertone
No logos are visible on any garment (none to remove). The laptop is built blank.

## Layer 8 - uncertainty
Face detail below 2 px per feature: eye shape, nose, mouth, brows are undetermined; built as minimal stylized marks.
Hands are 2-3 px blobs. Jacket buttons/pockets uncertain. Back of the head is observed (south/west frames).
Laptop presence in every direction uncertain (visible only in east frames): built as an optional prop, off by
default.
