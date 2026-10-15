# LEGO HQ at avatar scale: massing study

Plan for rebuilding the real LEGO campus at the 3D avatar's scale (avatar 0.9 wu, ground storey 1.4, upper storey 1.2,
8 x 8 plot, entrance on the south side under the yellow 2x4 plate). Figma board: file ON368BJhWf2SAwqRvlaHVH,
page "New", section "LEGO HQ at avatar scale – plan" (node 529:3604).

- `massing.py`: the layout (rooms, doors, block heights) as a voxel scene, ray-marched with the city projection
  (`wuToScreen`), roof-on and roof-off (cutaway) states.
- `compose.py`: renders both states at Street zoom with the real avatar sprite, plus the live campus sprite at the
  same scale. Run from the repo root: `python3 art/img2threejs/lego-hq-avatar-scale/compose.py` (writes PNGs to cwd).
