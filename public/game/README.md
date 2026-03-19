# Game Assets

This folder contains assets for Gustav's City (the isometric portfolio game).

## Directory Structure

```
game/
├── sprites/       # Character, buildings, and UI sprites
│   ├── player/    # Player character sprites (4 directions)
│   ├── buildings/ # Building sprites for each project/location
│   └── tiles/     # Ground tiles and decorations
└── tilemaps/      # Tiled map exports (.json)
```

## Asset Creation Workflow (Justine Moore method)

Based on the Pogicity workflow from @venturetwins:

### Step 1: Photo → Isometric View
- Take/find photo of building (LEGO HQ, SDU campus, etc.)
- Use **Nano Banana Pro** with prompt: "an isometric view of this building as a video game asset"
- Remove any text from the image if needed

### Step 2: Isometric Image → 3D Model
- Use **Krea.ai** with TRELLIS 2, Hunyuan3D-2.1, or Tripo
- Export as GLB file

### Step 3: 3D Model → Sprites
- Use **Isometric Sprite Generator** (can build with Claude Code)
- Or **PixelOver** for pixel art style
- Or **Blender** with orthographic camera (30° rotation, 2:1 isometric)
- Export 4 directions: South, East, North, West

## Sprite Specifications

- **Tile size**: 64x32 pixels (isometric ratio 2:1)
- **Building size**: 96x96 pixels (or multiples)
- **Player size**: 32x48 pixels
- **Format**: PNG with transparency
- **Style**: Clean pixel art or stylized isometric

## Tools Needed

- Nano Banana Pro (AI image generation)
- Krea.ai account (image-to-3D)
- PixelOver or custom sprite renderer
- Tiled (for map design)
