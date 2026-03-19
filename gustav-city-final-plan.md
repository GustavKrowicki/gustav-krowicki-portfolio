# Gustav's Portfolio City: Final Implementation Plan
## Locked Specifications

**Project Name:** Gustav's City (working title)
**Visual Style:** Pixel art isometric (SimCity, RollerCoaster Tycoon inspired)
**Layout:** Thematic districts
**Controls:** Hybrid (WASD + Click-to-walk-and-interact)
**Platforms:** Desktop primary, mobile optimized
**Timeline:** No rush - quality over speed

---

## City Layout: Thematic Districts

```
┌─────────────────────────────────────────────────────┐
│                                                     │
│   🎓 EDUCATION CAMPUS                              │
│   ┌────────┐  🇦🇺 Swinburne    🇩🇪 Berlin IU      │
│   │  SDU   │  Melbourne                            │
│   │Kolding │                                        │
│   └────────┘  Business Academy Aarhus              │
│                                                     │
│═════════════════════════════════════════════════════│
│                                                     │
│   🏢 CORPORATE QUARTER          🚀 STARTUP ZONE    │
│   ┌──────────┐                  ┌────────┐        │
│   │   LEGO   │  🏢 Valtech      │Cate.it │        │
│   │    HQ    │  🏢 DMF          │  🚚    │        │
│   │          │  🏢 AeroGuest    └────────┘        │
│   └──────────┘                                     │
│                                                     │
│═════════════════════════════════════════════════════│
│                                                     │
│   🏠 FREELANCE ZONE                                │
│   🏪 Gusto Restaurant                              │
│                                                     │
│═════════════════════════════════════════════════════│
│                                                     │
│   🏔️ PERSONAL QUARTER                             │
│                                                     │
│   ⛷️ SKIING MOUNTAIN        📚 LIBRARY             │
│   ┌─────────────────┐      ┌────────┐            │
│   │  /\  Couloir    │      │ Books  │            │
│   │ /🌲\ Tree Skiing│      │Shelf   │            │
│   │/⚫⚫\ Moguls     │      └────────┘            │
│   └─────────────────┘                             │
│                                                     │
│   ⚽ AGF STADIUM           🎵 MUSIC STAGE          │
│   ┌────────┐              ┌────────┐              │
│   │Football│              │ 🎸🎹  │              │
│   │ Field  │              │Concert │              │
│   └────────┘              └────────┘              │
│                                                     │
│   🏠 HOME BASE (Bio/About)                         │
│   ┌────────┐                                       │
│   │Gustav's│                                       │
│   │  HQ    │                                       │
│   └────────┘                                       │
│                                                     │
└─────────────────────────────────────────────────────┘
```

---

## Visual Style: Pixel Art Isometric

### Color Palette (Y2K/Early 2000s Gaming)
```
Primary Colors:
- LEGO Gold:      #FFD700
- Education Green: #2ECC71
- Corporate Blue:  #3498DB
- Startup Purple:  #9B59B6
- Personal Orange: #E67E22
- Freelance Teal:  #1ABC9C

Background:
- Grass:          #7EC850
- Paths:          #B8B8B8
- Water:          #5DADE2
- Sky:            #87CEEB

Accent:
- Highlights:     #FFFFFF
- Shadows:        #2C3E50
- UI Elements:    #34495E
```

### Pixel Art Specifications
```
Tile Size: 44x22 pixels (same as Pogicity)
Building Sprites: 
- Pixel grid: 2x2 pixels = 1 "unit"
- Clean edges, no anti-aliasing on sprites
- Bold outlines (2px black borders)
- Limited color palette (8-16 colors per building)
- Dithering for gradients/shadows (optional)

Character Sprite:
- 16x24 pixels per frame
- 4 directions (N, S, E, W)
- 4 frames per direction (walking animation)
- Stylized representation of Gustav
- Distinct silhouette (easy to spot on map)
```

### Asset Creation Strategy for Pixel Art

**Option A: Manual Pixel Art (Recommended for this style)**
```
Tools: Aseprite, Pixaki, or Lospec
Process:
1. Create base isometric template (44x22 tile)
2. Draw buildings pixel-by-pixel
3. Use limited color palette
4. Export as PNG with transparency

Time per building: 2-4 hours
Quality: Highest for pixel art aesthetic
Control: Total artistic control
```

**Option B: AI Generate → Pixelate**
```
Process:
1. Generate building with Midjourney/DALL-E
2. Run through isometric-city pipeline
3. Apply pixelation filter (Aseprite, Photoshop)
4. Clean up manually, reduce colors
5. Add pixel art styling (outlines, dithering)

Time per building: 1-2 hours
Quality: Good, needs manual touch-up
Control: Medium (AI + manual refinement)
```

**Option C: 3D Render → Pixel Art Filter**
```
Process:
1. Use simple low-poly 3D model
2. Render at isometric angle (30°)
3. Apply pixel art shader/filter
4. Export in 4 directions
5. Manual cleanup in pixel editor

Time per building: 1.5-3 hours
Quality: Very good, consistent
Control: High (3D gives perfect angles)
```

**Recommendation:** Start with **Option A** for 2-3 key buildings (LEGO, Home Base) to set the style, then use **Option B or C** for remaining buildings to match that style.

---

## Complete Building List

### Priority 1: Hero Buildings (Week 1)
**Must be perfect, set the visual style**

1. **LEGO HQ** (4x4 footprint)
   - Bright yellow and red pixel art
   - Iconic LEGO brick pattern on facade
   - Most detailed building
   - 4 stories tall

2. **Home Base** (2x2 footprint)
   - Cozy Scandinavian house
   - Blue/white color scheme
   - Your "headquarters" in the city
   - Chimney with pixel smoke animation

3. **Skiing Mountain** (4x3 footprint)
   - Special terrain feature (not traditional building)
   - Three distinct areas visible:
     - Couloir (steep chute on left)
     - Tree skiing (middle section with pixel trees)
     - Mogul field (right side with bump texture)
   - Snow-capped peak
   - Tiny pixel skier sprites (optional animation)

4. **Library** (3x3 footprint)
   - Classic brick building
   - Warm brown tones
   - Large windows showing book shelves
   - Icon: 📚

5. **Syddansk Universitet** (3x3 footprint)
   - Modern academic building
   - Green/glass color scheme
   - Danish flag (🇩🇰) on top or as decoration

### Priority 2: Work Buildings (Week 2)

6. **Valtech Office** (2x2 footprint)
   - Modern office building
   - Blue corporate tones
   - Glass facade pattern

7. **Dansk Motor Finans** (2x2 footprint)
   - Professional office
   - Gray/blue tones
   - Automotive theme subtle hints

8. **AeroGuest** (2x2 footprint)
   - Startup-style office
   - Travel/aviation theme
   - Teal/blue colors

9. **Gusto Restaurant** (1x1 footprint)
   - Small restaurant building
   - Warm, inviting colors
   - Outdoor seating visible (pixel tables)

10. **Cate.it Startup** (2x2 footprint)
    - Modern, colorful building
    - Purple/orange accents
    - Food truck visible on ground floor
    - Energetic, startup vibe

### Priority 3: Education Buildings (Week 2)

11. **Business Academy Aarhus** (3x3 footprint)
    - Danish academic building
    - Red brick pattern
    - Modern design

12. **Swinburne University** (3x3 footprint)
    - Australian architecture style
    - Red brick and glass
    - 🇦🇺 flag

13. **Berlin International** (3x3 footprint)
    - Modern European architecture
    - Concrete/glass
    - 🇩🇪 flag

### Priority 4: Personal Quarter (Week 3)

14. **AGF Stadium** (3x3 footprint)
    - Football stadium (simplified)
    - AGF team colors (blue and white)
    - Grass field visible
    - Crowd suggested by pixel patterns
    - Scoreboard with "AGF" text

15. **Music Stage** (2x2 footprint)
    - Outdoor concert stage
    - Colorful, festival vibes
    - Instruments visible (🎸 🎹)
    - String lights (pixel decorations)
    - Speakers and equipment

### Decorative Elements

16. **Trees** - Various pixel trees (conifers, deciduous)
17. **Benches** - Small park furniture
18. **Street Lamps** - Lighting along paths
19. **Flowers/Plants** - Garden elements for Personal Quarter
20. **Paths/Roads** - Connecting different districts

---

## Character Design: Stylized Gustav

### Sprite Specifications
```
Size: 16x24 pixels per frame
Style: Pixel art, recognizable as a person
Appearance: Based on your actual look
- Hair style/color: [We'll need your input - short/long, color?]
- Outfit: Casual/professional mix (designer aesthetic)
- Backpack: Optional detail showing you're on a journey
- Colors: Distinct from buildings (so character stands out)

Animation: 4-direction walking
- South (front): 4 frames
- East (right): 4 frames  
- North (back): 4 frames
- West (left): 4 frames
Total: 16 frames

Idle Animation (optional): 2-4 frames when standing still
```

### Character Creation Options

**Option A: Commission Pixel Artist**
- Fiverr/UpWork pixel art specialists
- Provide photo reference
- $30-100 for character sprite sheet
- 3-7 day turnaround

**Option B: Use AI + Manual Pixel Art**
- Generate character concept with AI
- Manually pixelate in Aseprite
- Match your appearance
- DIY, takes 2-4 hours

**Option C: Modify Existing Sprite**
- Use Pogicity character as base
- Recolor and modify to look like you
- Quickest option
- Less unique

**Recommendation:** **Option B** - AI generate concept of "Scandinavian product designer, casual professional, pixel art style" then manually pixelate and customize to match your look.

---

## Interaction Flow: Click-to-Walk-and-Interact

### User Journey Example

1. **User opens city**
   ```
   → Loading screen appears
   → Shows fun fact or quote about you
   → City fades in
   → Character spawns at designated start point (Home Base?)
   ```

2. **User sees LEGO HQ building**
   ```
   → Hovers over building
   → Building highlights (subtle glow/outline)
   → Tooltip shows: "LEGO - Digital Product Design"
   ```

3. **User clicks LEGO HQ**
   ```
   → Click detected
   → Character starts walking toward building
   → Camera follows character smoothly
   → Path calculated (avoid obstacles)
   → Character walks with animation
   ```

4. **Character reaches LEGO HQ**
   ```
   → Character stops at building entrance
   → Idle animation plays
   → Modal automatically opens (0.3s delay)
   → Shows career details
   → Character stays at building while modal open
   ```

5. **User closes modal**
   ```
   → Modal fades out
   → Character remains at LEGO
   → User can click next building or use WASD to explore
   ```

### Controls Specification

**Mouse/Touch:**
- Click ground → Character walks to point
- Click building → Character walks to building → Auto-show info
- Hover building → Highlight + tooltip
- Drag to pan camera (optional)

**Keyboard:**
- WASD or Arrow Keys → Direct character movement
- Space → Interact with nearest building
- ESC → Close modal
- M → Toggle mini-map
- Tab → Cycle through buildings

**Mobile Touch:**
- Tap ground → Walk to point
- Tap building → Walk to building → Auto-show info
- Pinch → Zoom in/out
- Two-finger drag → Pan camera
- Tap character → Show quick menu (jump to building, etc.)

---

## Technical Implementation Plan

### Phase 0: Setup (Week 1, Days 1-2)

#### Asset Pipeline Setup
**Your Tasks:**
1. Install pixel art software
   ```
   Recommended: Aseprite ($19.99) or Pixaki (iPad)
   Free alternatives: Lospec, Piskel
   ```

2. Create isometric template
   ```
   - 44x22 pixel base tile
   - 2:1 isometric grid overlay
   - Color palette file (save for consistency)
   ```

3. Test with one simple building
   ```
   - Create a 1x1 building (tree or small prop)
   - Export as PNG with transparency
   - Verify it looks right at actual size
   ```

#### Code Setup
**Claude Code Tasks:**
1. Fork Pogicity
   ```bash
   git clone https://github.com/twofactor/pogicity-demo.git gustav-city
   cd gustav-city
   npm install
   npm run dev
   ```

2. Remove unnecessary features
   ```typescript
   // Delete or comment out:
   - Building placement UI sidebar
   - Save/Load localStorage system
   - Vehicle spawning (cars)
   - Building construction mode
   
   // Keep:
   - Isometric rendering engine
   - Character animation system
   - Tile system
   - Camera controls
   ```

3. Create project structure
   ```
   app/
   ├── data/
   │   ├── career.json          # Your CV data
   │   ├── cityLayout.json      # Building positions
   │   └── buildingTypes.ts     # Sprite definitions
   ├── components/
   │   ├── game/
   │   │   ├── GustavCity.tsx         # Main wrapper
   │   │   ├── phaser/
   │   │   │   ├── MainScene.ts       # Game scene
   │   │   │   ├── CharacterController.ts
   │   │   │   └── BuildingInteraction.ts
   │   └── ui/
   │       ├── LoadingScreen.tsx
   │       ├── BuildingModal.tsx
   │       └── MiniMap.tsx
   ```

**Checkpoint:** End of Day 2, you have:
- [ ] Pixel art software installed
- [ ] First test sprite created
- [ ] Pogicity forked and running
- [ ] Project structure set up

### Phase 1: First Building End-to-End (Week 1, Days 3-4)

#### Create LEGO HQ Asset
**Your Tasks (Day 3):**
1. Design LEGO HQ in pixel art
   ```
   Size: 4x4 footprint = 176x88 pixel base
   Height: Add vertical pixels for building height
   Total canvas: ~200x200 pixels
   
   Style guide:
   - Bright yellow (#FFD700) main color
   - Red (#E74C3C) accent color
   - Black (#000000) outlines (2px)
   - White (#FFFFFF) window highlights
   - LEGO brick pattern on facade
   ```

2. Create 4-direction views
   ```
   lego-hq_south.png (front view - most detailed)
   lego-hq_east.png  (right side)
   lego-hq_north.png (back view)
   lego-hq_west.png  (left side - mirror of east)
   ```

3. Export sprites
   ```
   Format: PNG with transparency
   Location: /public/Building/gustav/work/lego-hq/
   Naming: Must match Pogicity convention
   ```

#### Integrate LEGO HQ (Day 4)
**Claude Code Tasks:**
1. Create building definition
   ```typescript
   // app/data/buildingTypes.ts
   export const LEGO_HQ: BuildingDefinition = {
     id: "lego-hq",
     name: "LEGO",
     category: "work",
     footprint: { width: 4, height: 4 },
     sprites: {
       south: "/Building/gustav/work/lego-hq/lego-hq_south.png",
       east: "/Building/gustav/work/lego-hq/lego-hq_east.png",
       north: "/Building/gustav/work/lego-hq/lego-hq_north.png",
       west: "/Building/gustav/work/lego-hq/lego-hq_west.png",
     },
     position: { x: 20, y: 15 }, // Corporate Quarter
     color: "#FFD700",
     icon: "🏢"
   };
   ```

2. Place building in scene
   ```typescript
   // MainScene.ts
   createBuilding(LEGO_HQ);
   ```

3. Test and debug
   ```
   - Verify sprite loads correctly
   - Check depth sorting with other objects
   - Ensure all 4 directions render properly
   - Adjust position if needed
   ```

**Checkpoint:** End of Day 4, you have:
- [ ] LEGO HQ pixel art complete
- [ ] Building renders in the city
- [ ] Can see it from all 4 angles
- [ ] Proof of concept complete!

### Phase 2: Character & Movement (Week 1, Days 5-7)

#### Create Gustav Character Sprite
**Your Tasks (Days 5-6):**
1. Design character in pixel art
   ```
   Reference: Your photo
   Style: Simplified, recognizable
   Size: 16x24 pixels per frame
   
   Features to include:
   - Your hair color/style
   - Casual designer outfit
   - Distinct silhouette
   - Colors that pop against buildings
   ```

2. Animate walking (4 directions × 4 frames)
   ```
   Frames per direction:
   1. Standing
   2. Left foot forward
   3. Standing (same as 1)
   4. Right foot forward
   
   Export as sprite sheet or individual frames
   ```

3. Create idle animation (optional)
   ```
   2-4 frames of subtle movement
   - Breathing
   - Looking around
   - Adds life to character
   ```

#### Implement Character Movement
**Claude Code Tasks (Days 5-7):**

**Day 5: Basic Character**
```typescript
// CharacterController.ts
class CharacterController {
  private sprite: Phaser.GameObjects.Sprite;
  private currentDirection: 'south' | 'east' | 'north' | 'west';
  
  constructor(scene: Phaser.Scene) {
    // Load character sprite sheet
    this.sprite = scene.add.sprite(x, y, 'gustav-character');
    
    // Set up animations
    this.createAnimations();
  }
  
  private createAnimations() {
    // Create walk animations for each direction
    this.scene.anims.create({
      key: 'walk-south',
      frames: this.scene.anims.generateFrameNumbers('gustav-character', {
        start: 0, end: 3
      }),
      frameRate: 8,
      repeat: -1
    });
    // ... repeat for east, north, west
  }
}
```

**Day 6: Click-to-Move**
```typescript
// MainScene.ts
private setupClickToMove() {
  this.input.on('pointerdown', (pointer) => {
    const worldPoint = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
    const gridPos = this.screenToGrid(worldPoint.x, worldPoint.y);
    
    // Check if clicked on building
    const building = this.getBuildingAt(gridPos);
    if (building) {
      this.character.walkToBuilding(building);
    } else {
      this.character.walkToPoint(gridPos);
    }
  });
}
```

**Day 7: WASD Controls + Camera Follow**
```typescript
// Add keyboard controls
private setupKeyboardControls() {
  this.cursors = this.input.keyboard.createCursorKeys();
  this.wasd = this.input.keyboard.addKeys({
    up: 'W',
    down: 'S',
    left: 'A',
    right: 'D',
    space: 'SPACE'
  });
}

update() {
  // WASD movement
  if (this.wasd.up.isDown) {
    this.character.moveNorth();
  }
  // ... other directions
  
  // Camera follows character
  this.cameras.main.centerOn(
    this.character.x,
    this.character.y
  );
}
```

**Checkpoint:** End of Week 1, you have:
- [ ] Gustav character sprite complete
- [ ] Character walks around city
- [ ] Click-to-move works
- [ ] WASD controls work
- [ ] Camera follows character
- [ ] LEGO HQ building visible
- [ ] Ready to add more buildings!

### Phase 3: Building All Assets (Week 2)

This week you create all remaining building sprites while code infrastructure expands.

#### Your Asset Creation Schedule
**Create 2-3 buildings per day**

**Days 1-2: Work Buildings**
- [ ] Valtech Office (2x2)
- [ ] Dansk Motor Finans (2x2)
- [ ] AeroGuest (2x2)
- [ ] Gusto Restaurant (1x1)
- [ ] Cate.it Startup (2x2)

**Days 3-4: Education Buildings**
- [ ] Syddansk Universitet (3x3) + 🇩🇰 flag
- [ ] Business Academy Aarhus (3x3)
- [ ] Swinburne (3x3) + 🇦🇺 flag
- [ ] Berlin International (3x3) + 🇩🇪 flag

**Days 5-6: Personal Quarter**
- [ ] Home Base (2x2)
- [ ] Library (3x3)
- [ ] AGF Stadium (3x3)
- [ ] Music Stage (2x2)
- [ ] Skiing Mountain (4x3) - Special terrain

**Day 7: Decorations**
- [ ] Trees (various)
- [ ] Benches
- [ ] Street lamps
- [ ] Flowers/plants
- [ ] Path tiles

**Tips for efficient pixel art creation:**
1. Create a template with common elements (walls, windows, roof)
2. Reuse and recolor for similar building types
3. Build a library of common elements (doors, windows, bricks)
4. Use symmetry tool for faster work
5. Take breaks! Pixel art is detail work

#### Claude Code Integration Tasks (Week 2)

**Days 1-2: Building System**
```typescript
// app/data/career.json - populate with all your data
// app/data/cityLayout.json - define all building positions
// buildingTypes.ts - add definitions for each building

// Implement building click detection
private setupBuildingInteractions() {
  this.input.on('gameobjectdown', (pointer, gameObject) => {
    if (gameObject.getData('buildingId')) {
      const buildingId = gameObject.getData('buildingId');
      this.handleBuildingClick(buildingId);
    }
  });
}

private handleBuildingClick(buildingId: string) {
  // Character walks to building
  const building = this.buildings.get(buildingId);
  this.character.walkToBuilding(building);
  
  // When arrived, show modal
  this.character.on('arrivedAtBuilding', () => {
    this.showBuildingModal(buildingId);
  });
}
```

**Days 3-4: Career Modals**
```typescript
// BuildingModal.tsx
interface BuildingModalProps {
  building: Experience | Education | Project;
  onClose: () => void;
}

export default function BuildingModal({ building, onClose }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 50 }}
      animate={{ opacity: 1, y: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center 
                 bg-black/70 backdrop-blur-sm"
    >
      {/* Pixel art styled modal */}
      <div className="bg-white border-4 border-black pixel-corners
                      max-w-2xl w-full m-4 p-6">
        {/* Building icon with color */}
        <div 
          className="w-20 h-20 border-4 border-black flex items-center 
                     justify-center text-4xl mb-4"
          style={{ backgroundColor: building.color }}
        >
          {building.icon}
        </div>
        
        {/* Career details */}
        <h2 className="text-3xl font-bold pixel-font mb-2">
          {building.company || building.institution}
        </h2>
        <p className="text-xl text-gray-700 mb-4">{building.role}</p>
        <p className="text-sm text-gray-500 mb-6">{building.period}</p>
        
        {/* Achievements as pixel art list */}
        <ul className="space-y-2 mb-6">
          {building.achievements.map((achievement, i) => (
            <li key={i} className="flex gap-2">
              <span className="text-blue-600">▶</span>
              <span>{achievement}</span>
            </li>
          ))}
        </ul>
        
        {/* Skills as pixel art tags */}
        <div className="flex flex-wrap gap-2 mb-6">
          {building.skills.map(skill => (
            <span 
              key={skill}
              className="px-3 py-1 border-2 border-black pixel-font text-sm"
            >
              {skill}
            </span>
          ))}
        </div>
        
        {/* Close button */}
        <button
          onClick={onClose}
          className="w-full py-3 bg-blue-500 border-4 border-black
                     text-white pixel-font text-lg hover:bg-blue-600
                     active:translate-y-1"
        >
          Close [ESC]
        </button>
      </div>
    </motion.div>
  );
}
```

**Days 5-6: District Organization & Navigation**
```typescript
// Add mini-map
<MiniMap 
  buildings={allBuildings}
  characterPosition={characterPos}
  onDistrictClick={(district) => {
    character.walkToDistrict(district);
  }}
/>

// Add quick-jump menu
<BuildingMenu
  buildings={allBuildings}
  onBuildingSelect={(building) => {
    character.walkToBuilding(building);
  }}
/>
```

**Day 7: Mobile Optimization**
```typescript
// Detect mobile and adjust controls
const isMobile = window.innerWidth < 768;

if (isMobile) {
  // Larger touch targets
  // Zoom in closer
  // Simplified UI
  // Touch-friendly tooltips
}
```

**Checkpoint:** End of Week 2, you have:
- [ ] All buildings created as pixel art
- [ ] All buildings placed in city
- [ ] Character can walk to any building
- [ ] Building modals show career info
- [ ] Districts organized thematically
- [ ] Navigation working smoothly
- [ ] Mobile responsive

### Phase 4: Personal Quarter Features (Week 3)

#### Skiing Mountain Interactive
**Special Implementation:**

```typescript
// SkiingMountain.tsx
export default function SkiingMountain({ onClose }) {
  const [selectedArea, setSelectedArea] = useState<'couloir' | 'trees' | 'moguls' | null>(null);
  
  return (
    <div className="fixed inset-0 z-50 bg-gradient-to-b from-sky-400 to-white">
      {/* Mountain illustration */}
      <div className="mountain-container">
        {/* Interactive areas */}
        <button
          onClick={() => setSelectedArea('couloir')}
          className="area-couloir"
        >
          🎿 Couloir
        </button>
        
        <button
          onClick={() => setSelectedArea('trees')}
          className="area-trees"
        >
          🌲 Tree Skiing
        </button>
        
        <button
          onClick={() => setSelectedArea('moguls')}
          className="area-moguls"
        >
          ⚫ Moguls
        </button>
      </div>
      
      {/* Info panel */}
      {selectedArea && (
        <div className="info-panel">
          {selectedArea === 'couloir' && (
            <p>I love the challenge of steep couloirs...</p>
          )}
          {selectedArea === 'trees' && (
            <p>Tree skiing in powder is my favorite...</p>
          )}
          {selectedArea === 'moguls' && (
            <p>Mogul fields test technique and endurance...</p>
          )}
        </div>
      )}
    </div>
  );
}
```

#### Library Implementation
```typescript
// Library.tsx - Interactive bookshelf
// (Same as previously planned, with pixel art styling)
```

#### AGF Stadium Implementation
```typescript
// AGFStadium.tsx
export default function AGFStadium({ onClose }) {
  return (
    <div className="pixel-modal">
      <h2>⚽ AGF - Aarhus Gymnastikforening</h2>
      <div className="stadium-view">
        {/* Pixel art football field */}
        <div className="field">
          <div className="agf-logo">AGF</div>
        </div>
      </div>
      <p>Why AGF matters to me...</p>
      {/* Add your personal connection to the team */}
    </div>
  );
}
```

#### Music Stage Implementation
```typescript
// MusicStage.tsx
export default function MusicStage({ onClose }) {
  return (
    <div className="pixel-modal">
      <h2>🎵 Music & Sound</h2>
      <div className="stage-view">
        {/* Instruments */}
        <div className="instruments">
          🎸 🎹 🥁
        </div>
      </div>
      <p>Music is important to me because...</p>
      {/* Share your music interests */}
    </div>
  );
}
```

**Checkpoint:** End of Week 3, you have:
- [ ] All Personal Quarter buildings interactive
- [ ] Skiing Mountain with 3 clickable areas
- [ ] Library with bookshelf
- [ ] AGF Stadium with your story
- [ ] Music Stage with your interests
- [ ] Home Base with full bio

### Phase 5: Polish & Launch (Week 4)

**Days 1-2: Visual Polish**
- [ ] Add pixel art UI elements (borders, buttons)
- [ ] Loading screen with fun facts
- [ ] Smooth transitions between scenes
- [ ] Sound effects (optional - footsteps, clicks)
- [ ] Ambient music (optional)

**Days 3-4: Easter Eggs**
Ideas:
- [ ] Hidden disco ball in LEGO HQ (click for dance animation)
- [ ] Konami code reveals special building
- [ ] Click Gustav 10 times → changes outfit
- [ ] Hidden achievement system
- [ ] Secret pathway between districts

**Days 5-6: Testing & Bug Fixes**
- [ ] Cross-browser testing
- [ ] Mobile testing on multiple devices
- [ ] Performance optimization
- [ ] Accessibility improvements
- [ ] Friend/colleague feedback

**Day 7: Deploy**
```bash
# Deploy to Vercel
vercel deploy --prod

# Share on social media
# LinkedIn, Twitter, design communities
# Send to recruiters
```

---

## Data Structure: career.json

```json
{
  "profile": {
    "name": "Gustav Krowicki",
    "title": "Product Designer",
    "email": "gkkrowicki@gmail.com",
    "phone": "0045 29318807",
    "website": "www.gustavkrowicki.com",
    "location": "Denmark"
  },
  
  "cityConfig": {
    "layout": "thematic",
    "startPosition": { "x": 15, "y": 25 },
    "characterSpeed": 2,
    "cameraZoom": 1.2,
    "enableEasterEggs": true
  },
  
  "districts": [
    {
      "id": "corporate",
      "name": "Corporate Quarter",
      "color": "#3498DB",
      "position": { "x": 20, "y": 15 }
    },
    {
      "id": "education",
      "name": "Education Campus",
      "color": "#2ECC71",
      "position": { "x": 5, "y": 5 }
    },
    {
      "id": "startup",
      "name": "Startup Zone",
      "color": "#9B59B6",
      "position": { "x": 35, "y": 15 }
    },
    {
      "id": "freelance",
      "name": "Freelance Zone",
      "color": "#1ABC9C",
      "position": { "x": 10, "y": 30 }
    },
    {
      "id": "personal",
      "name": "Personal Quarter",
      "color": "#E67E22",
      "position": { "x": 25, "y": 35 }
    }
  ],
  
  "experience": [
    {
      "id": "lego-student-worker",
      "company": "LEGO",
      "location": "Billund",
      "role": "Student Worker - Digital Product Design",
      "period": {
        "start": "2025-01",
        "end": null,
        "display": "January 2025 - Present"
      },
      "achievements": [
        "Conducted qualitative interviews and concept-driven tests to explore user needs in ML-assisted internal products",
        "Synthesised research into clear problem framings and early interface concepts used to guide design direction",
        "Supported decision-making by translating user insights into concrete design implications for product and business stakeholders",
        "Worked within constraints related to data quality, algorithm behaviour, and organisational priorities",
        "Collaborated with designers, product managers, engineers, and data scientists to iterate on designs"
      ],
      "skills": [
        "User Research",
        "ML/AI Products",
        "Stakeholder Management",
        "Qualitative Testing",
        "Product Strategy"
      ],
      "cityData": {
        "buildingType": "lego-hq",
        "footprint": { "width": 4, "height": 4 },
        "position": { "x": 20, "y": 15 },
        "district": "corporate",
        "color": "#FFD700",
        "icon": "🏢",
        "priority": 1,
        "spriteFolder": "/Building/gustav/work/lego-hq/"
      }
    },
    
    {
      "id": "valtech-intern",
      "company": "Valtech",
      "location": "Aarhus",
      "role": "UX Design Intern",
      "period": {
        "start": "2023-08",
        "end": "2023-12",
        "display": "August 2023 - December 2023"
      },
      "achievements": [
        "Designed wireframes and prototypes for file-sharing platform and B2B webshop",
        "Applied qualitative and quantitative research insights to improve usability",
        "Participated in usability testing and design sprints",
        "Communicated design decisions to stakeholders"
      ],
      "skills": [
        "Wireframing",
        "Prototyping",
        "User Testing",
        "Design Sprints",
        "Stakeholder Communication"
      ],
      "cityData": {
        "buildingType": "office",
        "footprint": { "width": 2, "height": 2 },
        "position": { "x": 24, "y": 17 },
        "district": "corporate",
        "color": "#3498DB",
        "icon": "🏢",
        "priority": 2,
        "spriteFolder": "/Building/gustav/work/valtech/"
      }
    }
    
    // ... Add all other experiences
  ],
  
  "education": [
    {
      "id": "sdu-masters",
      "institution": "Syddansk Universitet",
      "location": "Kolding, Denmark",
      "degree": "IT & Product Design (MA)",
      "period": {
        "start": "2024-08",
        "end": null,
        "display": "August 2024 - Present"
      },
      "focus": "Fast-paced product development with active engagement from stakeholders and users",
      "cityData": {
        "buildingType": "university",
        "footprint": { "width": 3, "height": 3 },
        "position": { "x": 5, "y": 5 },
        "district": "education",
        "color": "#2ECC71",
        "flag": "🇩🇰",
        "icon": "🎓",
        "priority": 1,
        "spriteFolder": "/Building/gustav/education/sdu/"
      }
    }
    
    // ... Add all education
  ],
  
  "projects": [
    {
      "id": "cateit",
      "name": "Cate it",
      "role": "Co-founder, Product Designer",
      "period": {
        "start": "2025-03",
        "end": null,
        "display": "March 2025 - Present"
      },
      "url": "www.cateit.com",
      "description": "Booking platform connecting food truck owners with event planners",
      "achievements": [
        "Co-founded a booking platform and shaped product vision and strategy",
        "Led user research to understand trust, commitment, and payment concerns",
        "Made strategic product and business model decisions based on research",
        "Designed and tested core UX flows and prepared manual booking MVP"
      ],
      "skills": [
        "Product Strategy",
        "User Research",
        "UX Design",
        "Startup Operations",
        "MVP Development"
      ],
      "cityData": {
        "buildingType": "startup",
        "footprint": { "width": 2, "height": 2 },
        "position": { "x": 35, "y": 15 },
        "district": "startup",
        "color": "#9B59B6",
        "icon": "🚚",
        "priority": 1,
        "spriteFolder": "/Building/gustav/projects/cateit/"
      }
    }
  ],
  
  "personal": {
    "about": {
      "whoAmI": "Hello, I am Gustav. Born and raised in Aarhus, Denmark. A dedicated and foremost curious person who seeks to explore and learn wherever I go.",
      "motivation": "My motivation comes from the desire to create, test and change. I am a person who likes to experience new things. I believe that design is a tool to create a better society.",
      "approach": "I believe good design starts with understanding the problem deeply. I spend time with users, ask questions, and look for patterns. I think strategically about business goals and technical constraints.",
      "cityData": {
        "buildingType": "home-base",
        "footprint": { "width": 2, "height": 2 },
        "position": { "x": 25, "y": 40 },
        "district": "personal",
        "color": "#E67E22",
        "icon": "🏠",
        "spriteFolder": "/Building/gustav/personal/home/"
      }
    },
    
    "interests": [
      {
        "id": "skiing",
        "name": "Skiing",
        "type": "building",
        "areas": [
          {
            "name": "Couloir",
            "description": "I love the challenge and focus required for steep couloir skiing"
          },
          {
            "name": "Tree Skiing",
            "description": "Powder days in the trees are pure joy"
          },
          {
            "name": "Moguls",
            "description": "Mogul fields test technique and build endurance"
          }
        ],
        "cityData": {
          "buildingType": "skiing-mountain",
          "footprint": { "width": 4, "height": 3 },
          "position": { "x": 20, "y": 35 },
          "district": "personal",
          "color": "#FFFFFF",
          "icon": "⛷️",
          "interactive": true,
          "spriteFolder": "/Building/gustav/personal/skiing/"
        }
      },
      
      {
        "id": "agf",
        "name": "AGF Football",
        "type": "building",
        "description": "Following AGF connects me to my hometown and Danish football culture",
        "cityData": {
          "buildingType": "stadium",
          "footprint": { "width": 3, "height": 3 },
          "position": { "x": 28, "y": 35 },
          "district": "personal",
          "color": "#0066CC",
          "icon": "⚽",
          "spriteFolder": "/Building/gustav/personal/agf/"
        }
      },
      
      {
        "id": "music",
        "name": "Music",
        "type": "building",
        "description": "Music helps me think, create, and unwind",
        "cityData": {
          "buildingType": "stage",
          "footprint": { "width": 2, "height": 2 },
          "position": { "x": 32, "y": 38 },
          "district": "personal",
          "color": "#FF69B4",
          "icon": "🎵",
          "spriteFolder": "/Building/gustav/personal/music/"
        }
      }
    ],
    
    "library": {
      "books": [
        {
          "title": "The Design of Everyday Things",
          "author": "Don Norman",
          "category": "Design",
          "status": "read",
          "rating": 5,
          "notes": "Classic foundational text on UX principles"
        }
        // ... more books
      ],
      "cityData": {
        "buildingType": "library",
        "footprint": { "width": 3, "height": 3 },
        "position": { "x": 24, "y": 38 },
        "district": "personal",
        "color": "#8B4513",
        "icon": "📚",
        "interactive": true,
        "spriteFolder": "/Building/gustav/personal/library/"
      }
    }
  },
  
  "easterEggs": [
    {
      "id": "disco-lego",
      "trigger": "click-lego-roof",
      "effect": "disco-lights",
      "message": "You found the LEGO party mode! 🕺"
    },
    {
      "id": "konami-code",
      "trigger": "up-up-down-down-left-right-left-right-b-a",
      "effect": "unlock-secret-building",
      "message": "Secret unlocked: The Innovation Lab!"
    }
  ]
}
```

---

## Loading Screen Ideas

Since we need to design this, here are some options:

**Option 1: Pixel Art Gustav Building the City**
```
[ Pixel art animation of Gustav placing LEGO bricks ]
"Building Gustav's world..."
"Loading: 47%"
```

**Option 2: Random Fun Facts**
```
"Did you know?"
→ "Gustav has worked in 3 countries 🌍"
→ "He's designed products for 10+ companies"
→ "Favorite design tool: Figma"
→ "Currently based in Denmark"
```

**Option 3: Retro Game Loading**
```
▓▓▓▓▓▓▓▓▓▓░░░░░░░░░░ 50%
"Generating isometric city..."
"Placing buildings..."
"Spawning Gustav..."
"READY!"
```

**Option 4: Quote from You**
```
"Design is a tool to create a better society"
- Gustav Krowicki

[ Loading bar ]
```

**Which style appeals to you?** Or do you have another idea?

---

## Easter Egg Ideas (For Later)

**Simple Easter Eggs:**
1. Click Gustav 10 times → Changes outfit/color
2. Click LEGO roof → Disco lights appear
3. Type "DENMARK" → Danish flag appears in sky
4. Visit all buildings → Achievement unlocked
5. Stay idle for 2 minutes → Gustav does a little dance

**Complex Easter Eggs:**
6. Konami code → Secret building appears
7. Click buildings in chronological order → Timeline reward
8. Find hidden LEGO brick in each district → Unlock special theme
9. Double-click skiing mountain → Mini skiing game

**We'll implement 2-3 simple ones in Week 4 if time permits.**

---

## Success Metrics & Launch Plan

### Beta Testing (Week 4, Days 1-3)
- [ ] Share with 5-10 friends/colleagues
- [ ] Test on: iPhone, Android, Mac, Windows
- [ ] Gather feedback on:
  - Is it fun to explore?
  - Is the story clear?
  - Does it work smoothly?
  - Any bugs or confusion?

### Launch Checklist (Week 4, Days 4-7)
- [ ] Fix critical bugs from beta
- [ ] Write LinkedIn launch post
- [ ] Prepare 30-second screen recording
- [ ] Take beautiful screenshots
- [ ] Deploy to production
- [ ] Share on:
  - LinkedIn
  - Design communities (Designer News, r/web_design)
  - Portfolio showcases (Awwwards, Webflow Showcase)
  - Send to recruiters

### Launch Post Template
```
🎮 I built my portfolio as an interactive city!

Instead of a traditional CV, I created a pixel art 
isometric world where you can explore my career 
journey by walking around.

Each building represents a company, project, or 
part of my life. Click around and discover:

• My work at LEGO 🏢
• International education 🌍
• Startup projects 🚀
• Personal interests ⛷️🎵⚽

Built with:
- Phaser 3 game engine
- Pixel art (SimCity style)
- Next.js + React
- A lot of love ❤️

Check it out: [link]

#ProductDesign #Portfolio #WebDevelopment #PixelArt
```

---

## Next Immediate Steps

### This Week (Getting Started):

**Your Tasks:**
1. **Choose pixel art software** (Aseprite recommended)
2. **Create color palette file** (save all the colors listed above)
3. **Draw first test building** (simple 1x1 tree or bench)
4. **Send me a photo of yourself** (for character design reference)

**My Tasks (Claude Code):**
1. Fork Pogicity repository
2. Set up project structure
3. Create career.json template for you to fill
4. Prepare building definition templates

**By End of This Week:**
- You have pixel art tools ready
- I have codebase ready
- We're aligned on visual style
- Ready to start Week 1 of implementation

---

## Questions for You:

Before we dive into implementation:

1. **Character Design:** Can you share a photo of yourself (or describe your appearance) so I can help design the Gustav character sprite? 
   - Hair color/style?
   - Typical outfit style?
   - Any distinctive features to include?

2. **Personal Interests Text:** For the skiing mountain, AGF, and music buildings, can you write 2-3 sentences about why each matters to you? This will go in the interactive modals.

3. **Priority Timeline:** Do you want to:
   - A) Start immediately (this week)
   - B) Start next week
   - C) Start in 2 weeks

4. **Asset Creation Commitment:** Are you comfortable creating 2-3 pixel art buildings per day? Or should we adjust the timeline?

5. **Loading Screen:** Which loading screen style do you prefer? (Option 1-4 above, or your own idea)

---

Ready to start building Gustav's City? 🏙️

Once you answer these last questions, I'll set up the codebase and we can begin Week 1!
