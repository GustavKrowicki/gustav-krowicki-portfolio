# Artefact Pipeline Guide

Learnings from building the first 3 artefacts (wind turbine, LEGO shelf, book cart).

---

## Blender Template

`scripts/isometric-artefact-template.blend`

- Isometric camera: orthographic, 54.7° X / 45° Z rotation
- NW lighting: key light upper-left, fill from opposite, ambient
- 12 base materials matching city palette (muted, desaturated)
- Transparent background (RGBA)

## Sizing

| Setting | Small prop (cart, shelf) | Tall prop (turbine) |
|---------|------------------------|---------------------|
| `ortho_scale` | 8.0 | 12.0 |
| Render resolution | 256x256 | 512x512 |
| Typical cropped size | 30-50px wide | 80-90px wide |

- **Always auto-crop** rendered PNGs to remove transparent padding
- Don't use `renderSize` in `buildings.ts` unless the object is genuinely taller than its footprint (like trees at 4x4)
- Compare with existing props: benches are ~40-60px, trees ~80-100px

### Auto-crop script
```bash
node -e "
const { createCanvas, loadImage } = require('canvas');
const fs = require('fs');
async function autoCrop(path) {
  const img = await loadImage(path);
  const c = createCanvas(img.width, img.height);
  const ctx = c.getContext('2d');
  ctx.drawImage(img, 0, 0);
  const { data, width, height } = ctx.getImageData(0, 0, c.width, c.height);
  let minX=width, minY=height, maxX=0, maxY=0;
  for (let y=0; y<height; y++)
    for (let x=0; x<width; x++)
      if (data[(y*width+x)*4+3]>10) {
        minX=Math.min(minX,x); minY=Math.min(minY,y);
        maxX=Math.max(maxX,x); maxY=Math.max(maxY,y);
      }
  minX=Math.max(0,minX-2); minY=Math.max(0,minY-2);
  maxX=Math.min(width-1,maxX+2); maxY=Math.min(height-1,maxY+2);
  const cw=maxX-minX+1, ch=maxY-minY+1;
  const out=createCanvas(cw,ch);
  out.getContext('2d').drawImage(img,minX,minY,cw,ch,0,0,cw,ch);
  fs.writeFileSync(path, out.toBuffer('image/png'));
  console.log(path.split('/').pop()+': '+width+'x'+height+' -> '+cw+'x'+ch);
}
autoCrop('YOUR_FILE.png');
"
```

## Animation

### Setup
- Model animated parts as **separate objects** in Blender (e.g. tower + blades)
- Use an **empty as rotation pivot** — parent the animated parts to it
- Keyframe the empty's rotation, not individual parts

### Frame settings
- **48 frames** at **66ms delay** (~15fps) worked well for slow ambient rotation
- Keyframe every frame for linear motion (avoids needing to set interpolation mode)
- For the GIF: use `gif-encoder-2` with `setTransparent(0x000000)`

### Registration in buildings.ts
```typescript
"wind-turbine": {
  id: "wind-turbine",
  sprites: {
    south: "/game/pogicity/Props/artefacts/wind-turbine.png",  // static fallback
  },
  animatedSprite: "/game/pogicity/Props/artefacts/wind-turbine.gif",  // animated version
  // ...
}
```

- `sprites.south` = static PNG (used for initial render + editor before GIF loads)
- `animatedSprite` = GIF loaded async, swapped in via `upgradeToAnimatedSprites()`
- Phaser animation key convention: `${id}_animated` -> internally `${id}_animated_anim`

### GIF crop for animation frames
When cropping animated GIFs, find the **global bounding box** across ALL frames first, then crop all frames to the same bounds. Otherwise frames will be different sizes and the animation jitters.

## Rotation Support

To make a prop rotatable in the editor:

1. Render from 4 camera angles in Blender:
   - South: camera Z rotation = 45°
   - West: 135°
   - North: 225°
   - East: 315°

2. Register all 4 sprites:
```typescript
sprites: {
  south: "..._south.png",
  north: "..._north.png",
  east: "..._east.png",
  west: "..._west.png",
},
supportsRotation: true,
```

3. Camera position for each angle:
```python
distance = 10
iso_angle = math.atan(1 / math.sqrt(2))
cam.location = (
    distance * cos(iso_angle) * sin(radians(angle)),
    -distance * cos(iso_angle) * cos(radians(angle)),
    distance * sin(iso_angle)
)
cam.rotation_euler = (radians(54.736), 0, radians(angle))
```

## File Locations

| What | Where |
|------|-------|
| Blender template | `scripts/isometric-artefact-template.blend` |
| Blender project files | `assets/artefacts-glb/*.blend` |
| Reference images | `assets/artefacts-glb/assets artefacts-pngs/` |
| GLB source files | `assets/artefacts-glb/*.glb` |
| Rendered sprites | `public/game/pogicity/Props/artefacts/` |
| Building definitions | `lib/city/buildings.ts` |
| Tour stop definitions | `lib/city/tourStops.ts` |

## Checklist per artefact

- [ ] Model or import in Blender (from template)
- [ ] Adjust materials to match city palette
- [ ] Scale and position at ground level
- [ ] Set camera `ortho_scale` for correct size
- [ ] For animated: separate parts, add keyframes, verify in Blender timeline
- [ ] Render PNG (or frame sequence -> GIF for animated)
- [ ] Auto-crop to remove transparent padding
- [ ] For rotatable: render from 4 directions
- [ ] Register in `buildings.ts` (category: "props", isDecoration: true)
- [ ] Register in `tourStops.ts` with dialogue text
- [ ] Place in city editor
- [ ] Save Blender file to `assets/artefacts-glb/`
