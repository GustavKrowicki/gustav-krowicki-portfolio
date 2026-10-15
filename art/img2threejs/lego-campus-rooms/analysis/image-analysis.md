# Image analysis: LEGO HQ Rooms (the campus with the roof off, one room per block)

References (kept out of git, `ref/`)
- PRIMARY `ref/ai-roof-off-campus-v3.png`: Figma AI image made from the board's block plan (Figma file
  "Portfolio", page "New", section 02b, card B2, node 503:4). Isometric, ~30 deg pitch, yaw 45 (south
  view), white background. Sets the style and the room content: chunky blocks, flat colours, walls cut
  low with a thick dark top edge, one or two large objects per room.
- LAYOUT `../lego-campus/measure/plan.json`: block outlines of the existing campus model (building grid,
  square to the tiles). The same data drew card B2. It is the authority for where each block is; the AI
  image is the authority for how it looks. Where they disagree, the plan wins.
- AI images are used only as img2threejs references (Gustav, 2026-10-15). No people, no text, no logos.

## L1 Identification
A small corporate campus diorama on a square grass plot, seen with every roof removed: a central glass
lobby, an entrance hall from a yellow toy-brick canopy into the lobby, five furnished rooms in the wings
around it and one closed wing. primaryDomain `object` (architecture diorama, game prop); confidence 0.8.

## L2 Form & silhouette
Square 7 x 7 wu plot (one tile = one wu, ~2 m). Low, wide silhouette with the roof off: room floors at
ground level, knee-high cut walls (~0.3 wu), the lobby's glass walls and the closed west block (~1.4 wu)
standing above them, the yellow canopy ~1.3 wu over the doors. With the roof on, the same blocks are
closed masses of 1 to 3 storeys (1.4 wu ground storey + 1.2 wu per storey). Prisms (extruded
rectilinear outlines), one ring (round building), boxes.

## L3 Decomposition
Macro: ground slab; lobby (atrium floor + glass walls); entrance hall + entrance block with the brick
canopy; Workshop (north wing + yellow bar); Recommendation studio (south-west wing, courtyard); Systems
map room (round building, round courtyard); Launch room (south-east wing, courtyard); AI lab (terrace
building) + greenhouse; closed west wing.
Meso: per room the floor, the cut wall ring with its dark cap, the room's large objects (whiteboard and
table; two shelves; wall map; chair rows and a screen; two desks); per block the roof mass (roof-on only).
Micro: canopy studs (2 x 4), door gaps, glass door panes.

## L4 Spatial relationships
<entrance hall, joins, lobby south side (no wall between)>; <canopy, on, entrance block over the doors>;
<each room, door gap toward, lobby>; <courtyards, open in, south-west wing / south-east wing / round
building>; <greenhouse, beside, AI lab north-east>; <roof mass, covers, each room block (roof-on state)>.

## L5 Materials (PBR terms)
Flat albedo, matte (roughness 0.8-0.9), no texture: grass green #6fb34a, ground soil edge #7a5233,
white floors #f4f4f2, room floors pastel (Workshop blue #8fa4dc, studio mint #a8e6c4, map room peach
#f3a98a, launch room yellow #f5e9a0, AI lab grey #b9bcc4), wall faces light grey/beige #e9e4dc, wall caps
dark brown-black #3b2b26, yellow #f2c81c, glass light blue #cfe6ee at partial opacity, closed wing dark
grey #4a4c50 with green roof, timber props #c9925a, screen black #222.

## L6 Lighting
Even studio light from the upper left (shadow-free in the image), slightly darker side faces. Matches
the city sprite rig: key from screen upper left, flat ambient.

## L7 Identity-defining features
1. Central glass lobby joined to the entrance hall and the yellow 2 x 4 canopy.
2. Every room open from above with cut walls and a dark cap: a cut-away, not a roofless ruin.
3. One colour per room floor; one or two large readable objects per room.
4. Round map room with a round courtyard; two wings with square courtyards.
5. The closed west block stays closed.

## L8 Hidden or uncertain
The image's room shapes are simplified rectangles; the plan's real outlines replace them. Door positions
and the exact object placement are inferred. The roof-on state is not in this image: it comes from the
existing campus model's look (green roofs, dark parapets, yellow frames, glass atrium).
