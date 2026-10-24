# LEGO HQ at avatar scale

Now: the grey box on the real campus outline (Linear POR-25). `plan.py` holds the outline fitted to the walk grid
(15 x 11, walls on tile edges, courtyards centred on tiles), the rooms, doors and hero places, and writes the walk map.
`build_spec.py` builds the spec from it; `review_shots.sh` + `review_sheet.py` make the review images (roof on, roof off
with labels, the avatar at the door and in each room). The text below is the earlier plan.

Plan for rebuilding the real LEGO campus at the 3D avatar's scale (avatar 0.9 wu, ground storey 1.4, upper storey 1.2,
8 x 8 plot, entrance on the south side under the yellow 2x4 plate). Figma board: file ON368BJhWf2SAwqRvlaHVH,
page "New", section "LEGO HQ at avatar scale – plan" (node 529:3604).

- `massing.py`: the layout (rooms, doors, block heights) as a voxel scene, ray-marched with the city projection
  (`wuToScreen`), roof-on and roof-off (cutaway) states.
- `compose.py`: renders both states at Street zoom with the real avatar sprite, plus the live campus sprite at the
  same scale. Run from the repo root: `python3 art/img2threejs/lego-hq-avatar/compose.py` (writes PNGs to cwd).
