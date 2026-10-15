# Image analysis: Workshop (cut-away meeting room set up for a design workshop)

References (kept out of git, `ref/`)
- PRIMARY `ref/ai-studio-room-fit.png`: Gustav's AI Studio isometric cut-away made from the two photos (camera
  ~30 deg, yaw 45, white background). Sets the layout, proportions and palette: whiteboard on the long back
  wall, end wall with the column and a white wall unit, table centred on black sled legs, two chairs on each long
  side, thick dark wall caps and posts, teal carpet on a dark plinth. Room ratio ~1 : 1.45 -> 2 x 3 tiles.
- `ref/photo-wide.jpg`: phone photo from the room's door end, eye height, wide lens, looking along the
  long axis. Shows the whiteboard wall, end wall, column, table, chairs and ceiling.
- `ref/photo-wall.jpg`: closer view of the whiteboard wall and the end wall corner with the column.
People in both photos are not modelled (the city has its own characters). Whiteboard text is stylised into
unreadable marker strokes because the repo is public.

## L1 Identification
A small meeting room used as a workshop space: one long wall is a full-height painted whiteboard with a
handwritten list and a three-column sticky-note grid, a long timber table with laptops and sticky notes along
the opposite side, swivel chairs with teal upholstery and white frames, a round exposed-concrete column near the
end wall, teal carpet, suspended grid ceiling. primaryDomain `object` (furnished interior treated as one
diorama prop); confidence 0.8.

## L2 Form & silhouette
Room volume ~3 m wide x ~6.5 m long x ~2.8 m high (inferred from the 0.6 m ceiling tiles: ~5 across, ~11 along).
As a city prop it becomes a cut-away diorama: floor slab, two back walls (whiteboard wall and end wall), the
front walls and ceiling removed so the interior reads from the iso camera. Cuboids and cylinders only;
asymmetric layout.

## L3 Decomposition
Macro: floor slab + carpet, whiteboard wall, end wall, concrete column, table.
Meso: whiteboard surface, marker list, sticky-note grid, radiator under the end wall, table top and legs,
4 chairs (seat, back, post, star base), 3 laptops (base + screen).
Micro: individual sticky notes (yellow, lime green, orange), marker strokes, laptop screens, threshold strip.

## L4 Spatial relationships
<whiteboard surface, flush-with, long wall inner face>; <marker list, on, whiteboard left half>;
<sticky grid, on, whiteboard centre at ~1.3-1.6 m>; <column, free-standing near, end wall / opposite corner>;
<radiator, attached-to, end wall at floor>; <table, parallel-to, long axis, against the wall opposite the
whiteboard>; <laptops + notes, on, table top>; <chairs, around, table and in front of the whiteboard>.

## L5/L6 Materials & colour (lit photo samples, de-lit by eye)
Whiteboard paint: light cool grey, high gloss (strong specular blobs), ~#d4d8d8. End wall: matte light grey
~#c9cdcc. Column: board-marked concrete, mid grey ~#9a9b97, matte. Carpet: dark teal ~#2f5d5f. Table: light
oak ~#d9b27c, satin. Chair upholstery: teal ~#3f7f86; chair frame white ~#eef0ef. Laptops: silver aluminium
~#c7c9cc, dark screens ~#2a2d33. Sticky notes: yellow ~#f2e94e, lime ~#b8e04a, orange ~#f5a23c, pink ~#f29bb3
(table). Marker: black ~#202224. Radiator: white ~#e6e8e6.

## L7 Identity features
1 full-height whiteboard wall with a handwritten list on the left (the room's identity); 2 three-column
"cons / metrics / pros" sticky-note grid in the middle of the whiteboard; 3 long oak table strewn with sticky
notes and laptops; 4 teal + white swivel chairs; 5 round concrete column at the end of the room; 6 teal carpet.

## L8 Uncertainty
Hidden: the door wall behind the camera and the far end of the table (cropped). Wide-lens perspective
exaggerates the room's length. Ceiling is dropped in the diorama (it would hide the interior). Plan is
compressed to the city footprint (2 x 2 tiles), so the room is shorter than real while table, chair and wall
heights keep character scale.
