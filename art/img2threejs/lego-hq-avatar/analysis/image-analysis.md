# Image analysis: LEGO HQ at avatar scale

References (kept out of git, `ref/`)
- PRIMARY `ref/ai-studio-campus.jpg`: Gustav's Google AI Studio "game-like" image of the campus (27 Jan 2026), the
  same style source as `../lego-campus`. Sets the look: green roofs, dark parapets, window bands, yellow frames,
  glass atrium with the skylight circle, round building, perforated terrace building, plaza with the minifigure.
- LAYOUT: the 8 x 8 plan on the Figma board (file ON368BJhWf2SAwqRvlaHVH, page New, section 529:3604), approved by
  Gustav 2026-10-15 ("go: 8x8, 2/3 storeys, south door"). `massing.py` holds the same layout as a voxel study.
- SCALE: docs/city-rules.md sections 2 and 6, measured against the 3D avatar (0.9 wu).

## L1 Identification
The LEGO campus in Billund as a toy-like game building on an 8 x 8 tile plot. primaryDomain `object`
(architectural assembly, game prop with two states); confidence 0.85.

## L2 Form & silhouette
Low wings of 2 storeys (2.6 wu) around a 3-storey glass atrium (3.8 wu), a round building of 2 storeys with a
round courtyard at the back-west, two yellow-framed third-storey blocks (a bar on the north wing, a block over the
south-east corner), a plaza strip along the south edge. Extruded rectilinear masses, one ring, boxes.

## L3 Decomposition
Macro: plot, 6 blocks (north wing, round building, terrace building, atrium, east wing, 2 yellow blocks), plaza.
Meso: ground-storey walls per room (split low part / upper part), upper storeys, roofs + parapets, window bands,
skylight disc, canopy brick, doors, room props. Micro: windows (one per tile of wall), skylight domes (19), studs,
perforation dots, terrace benches.

## L4 Spatial relationships
<atrium, joins, every wing>; <main door, on, atrium south face, under the yellow 2 x 4 plate>; <plaza, in front
of, main door>; <round building, behind-west of, atrium>; <terrace building, west of, atrium>; <yellow bar, on top
of, north wing>; <yellow block, on top of, east wing south end, cantilevered over the plaza>.

## L5 Materials (flat illustration, PBR terms)
Roof grass green #7cc242 (rough 0.95), parapet dark grey #3c3f41, facades light grey-white #e6e3dc with dark window
glass #2b3a42, yellow frames #f2c500 (plastic, rough 0.45), atrium glass light blue #a9cbd8 with yellow diagonal
bracing, skylight disc white with blue domes #4f7fb8, round building dark glass bands #2f3a40, brick plinth
#8a4b3a, perforated white panels, plaza paving #c9c6bd, room floors pastel (Workshop blue #8fa4dc, studio mint
#a8e6c4, map room peach #f3a98a, launch yellow #f5e9a0, AI lab grey #b9bcc4).

## L6 Lighting
Even daylight from the upper left, flat ambient: the city sprite converter rig.

## L7 Identity features
1 green roofs with dark parapets; 2 round building with a round courtyard; 3 atrium skylight circle (19 domes);
4 yellow bar and yellow block; 5 perforated terrace building with greenhouse and yellow benches; 6 yellow 2 x 4 plate
over the main door; 7 minifigure statue on the plaza; 8 LEGO logo (placeholder until the real logo is supplied).

## L8 Hidden or uncertain
Interiors are not in the reference: rooms follow the board (one or two large readable objects per room). Real
campus has 4-5 storeys; reduced to 2-3 on purpose (board decision B). Window counts follow the standard bay
(1 wu), not the photo.
