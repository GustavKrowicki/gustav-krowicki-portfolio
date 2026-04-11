# Bug: Player can walk under/through buildings

## Problem
In adventure mode, the player can walk onto tiles that are visually covered by building sprites. For example, walking near the LEGO HQ building, the player appears to walk "under" the building.

## Root Cause
Buildings have a grid footprint (e.g., LEGO is 3x3 at cells 13-15, 37-39) but their isometric sprites extend well beyond that area. The surrounding grass/tile cells are legitimately walkable terrain with no `buildingId` — they're just regular cells that happen to be under the building's visual extent.

- Building sprites are anchored at the front corner with `setOrigin(0.5, 1)` and extend upward/outward
- `PlayerController.isWalkable` and `MainScene.isPlayerWalkable` only check tile type, not visual coverage
- Grid cells around buildings have type `grass` or `tile` (walkable) without any building reference

Example — LEGO area in the grid:
```
y=35: g g g g T R A     (g = grass walkable, R = road, # = LEGO)
y=36: g g g g b R A
y=37: g g # # # R A     ← grass at x=11-12 is under the sprite
y=38: g g # # # R A
y=39: T T # # # R A
y=40: b b b b b R A
```

## Fix: directional `collisionPadding` + road exemption (v2)

### Codex review findings addressed
1. **Symmetric padding blocks interaction tiles** → directional padding + never block Road tiles
2. **Single padding ignores rotation** → per-direction padding. Sprite anchor is always at (maxX, maxY) with `setOrigin(0.5, 1)`, so overhang is always toward lower-x/lower-y regardless of orientation. Per-direction padding allows fine-tuning.

### 1. Add directional padding to `BuildingDefinition` (`lib/city/buildings.ts`)
```typescript
collisionPadding?: { top?: number; right?: number; bottom?: number; left?: number };
```
- `top` = extend toward lower y (behind building in iso view)
- `left` = extend toward lower x (behind building in iso view)
- `bottom`/`right` = extend toward front (usually 0)

### 2. Compute blocked tiles on adventure start (`MainScene.ts`)
Iterate building origins, expand footprint by directional padding, store in `Set<string>`.
**Never block Road tiles** — roads must stay walkable for pathfinding.

### 3. Check blocked tiles in walkability functions
- `PlayerController.isWalkable()` — `if (this.blockedTiles.has(...)) return false;`
- `MainScene.isPlayerWalkable()` — same check

### 4. Set padding values for affected buildings

| Building | Footprint | Suggested padding |
|----------|-----------|-------------------|
| lego-hq | 3x3 | `{left:2, top:2}` |
| valtech-office | 3x3 | `{left:1, top:2}` |
| berlin-uni | 3x3 | `{left:2, top:2}` |
| aeroguest | 3x3 | `{left:2, top:2}` |
| cate-it | 3x3 | `{right:2, top:2}` |
| aarhus-stadium | 4x4 | `{left:2, top:2}` |

Values need visual verification per building.

## Affected Files
- `lib/city/buildings.ts` — interface + building definitions
- `components/city/pogicity/phaser/MainScene.ts` — compute blocked tiles, update `isPlayerWalkable`
- `components/city/pogicity/phaser/PlayerController.ts` — check blocked tiles in `isWalkable`

## Verification
1. Walk toward LEGO from all sides → blocked on grass, can approach from road
2. Auto-walk to each building still works (road tiles remain pathable)
3. Trigger zones still reachable (at least one walkable tile within TRIGGER_ZONE_RADIUS)
4. No regression on buildings without padding
