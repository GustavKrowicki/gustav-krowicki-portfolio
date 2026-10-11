# Image analysis — LEGO HQ main entrance (yellow 2x4 plate canopy over glass doors)

References
- PRIMARY `ref/brick-aerial.png`: crop of the aerial photo the Krea campus was made from; steep
  elevated near-frontal view (~55° down) — closest to the game's isometric camera.
- `ref/brick-ground.png`: ground-level frontal view (user photo 2) — proportions of plate and doors.
- `ref/brick-courtyard.png`: courtyard view behind the minifigure (user photo 1) — context/material.

## L1 Identification
Main building entrance: a glass sliding-door module in a full-height curtain wall, with a giant yellow
LEGO 2x4 PLATE (not a brick: thickness 0.2 x width) mounted as a canopy directly above the doors,
penetrating the glass facade. primaryDomain `object`; confidence 0.9.

## L2 Form & silhouette
Macro: a planar curtain-wall slab (dark glass, dark mullion grid) with a rectangular door opening at
ground level, centred under a box-shaped plate (1 W wide x 0.2 W tall x 2 W deep, W = plate width,
~5.3 m) that projects 1 W outward and 1 W inward through the glass. 8 cylindrical studs (2 x 4 grid,
diameter 0.3 W, height 0.106 W, pitch 0.5 W) on the plate top. Bilateral symmetry about the door axis.

## L3 Decomposition
Macro: curtain wall (frame + glass), yellow plate, door module. Meso: 8 studs, door head beam,
2 fixed side lights, 2 sliding leaves, lit lobby behind. Micro: frosted horizontal band on the door
glass, threshold strip.

## Measured from the aerial (W = plate width = 175 px)
Stud ellipse aspect and outer plate-top depth (90 px for 1 W) give a camera elevation of ~30-31 deg.
At that elevation, doors at the facade plane would be hidden by the plate; instead 70-85 px of door
shows below the plate's front edge, and the facade base line (dark band, y ~390) sits ~1 W behind
the doors. So the doors are at the FRONT of a glass vestibule under the plate (z ~1 W), and the
plate is the vestibule roof. Mullions every ~0.5 W with one on the centre line; transoms at
~0.8 / 1.2 W, facade top ~2.4 W. Ground view: 4 equal door panels, door module height ~0.45 W,
plate thickness ~0.21 W, stud d 0.30 W / h ~0.1 W.

## L4 Spatial relationships
<plate, penetrates, curtain wall> at the glass plane, top of door head; <studs, attached-to, plate top>;
<vestibule, under, plate> (glass box 1 W wide x 1 W deep x 0.45 W tall, plate = its roof);
<door module, front-face-of, vestibule> (flush under the plate's front edge, width = plate width);
<vestibule back, opens-into, lobby> through the curtain wall;
<sliding leaves, slide-behind, side lights> along X; <lobby, behind, glass>.

## L5/L6 Materials & colour
Plate: glossy ABS-like plastic, vivid yellow (~#f4c20d lit; front face brightest), roughness ~0.3.
Glass: dark reflective (~#2e3433), roughness ~0.05; frames: dark grey metal (~#33373a).
Door frames: lighter grey-green metal in ground view (~#5e6a66). Frosted band: light grey (~#b9c0c0).
Lobby (inferred): warm light interior (~#d9d2c3).

## L7 Identity features
1 yellow 2x4 plate with visible studs as canopy (THE identity cue); 2 plate penetrating the glass
(inner studs visible through glass); 3 dark curtain-wall grid; 4 four-panel glass door module with
centre sliding pair; 5 frosted band across the doors.

## L8 Uncertainty
Exact stud count outside vs inside the glass (aerial shows 2 rows out, 2 rows inside: assume 2x4
centred on the glass plane). Door operation inferred as sliding (meeting stiles at centre in ground
view). Lobby interior not visible in detail — flat lit backdrop. Curtain-wall extent cropped
(modelled as a 2.4 W x 1.6 W segment).
