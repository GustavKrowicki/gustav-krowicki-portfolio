# Case Study Artefacts — Deep Dive

Building on the initial brainstorm. Each idea expanded with wow factor, animation specs, asset pipeline, technical requirements, and risks. Plus: tooling strategy, interaction architecture, wow multipliers, and priority matrix.

---

## Asset Pipeline & Tooling

### Current Style DNA
- **Isometric angle:** True 2:1 pixel-perfect (44x22 tile diamond)
- **Color palette:** Muted, slightly desaturated. Each building has its own mood but shared saturation/contrast level.
- **Shadow direction:** Light from upper-left (NW in screen space). Left faces lighter, right faces darker.
- **Outline weight:** 1px dark outlines on structural edges, no outlines on organic elements.
- **Detail density:** "Hi-bit" modern pixel art — anti-aliased edges, subtle gradients, dithering. Not 8-bit retro.
- **Sprite dimensions:** 3x3 buildings are ~200-280px wide. Props (1x1, 1x2) would be ~44-90px wide.

### Recommended Pipeline: 3D-to-Pixel

1. **MagicaVoxel** (free) — model artefact in voxels, render at exact iso camera angle. Consistent shadow angle across all artefacts. Free rotation for multiple orientations.
2. **Aseprite** — downscale MagicaVoxel render, clean up edges, match existing style. Animate sprite sheets here.
3. **AI-assisted generation** — useful for ideation and blocking (Midjourney/DALL-E for reference images), but substantial cleanup needed. Generators struggle with exact 2:1 iso ratio. Net time savings ~20-30% vs drawing from scratch.

### Consistency Enforcement
- Extract 20 most-used colors from existing sprites as a constrained palette
- Create template PNGs at 1x1, 1x2, 2x1, 2x2 with iso diamond guide layer
- Shadow angle rule: always NW light source

### Batch Production Timeline
- **1x1 static props** (ski rack, scarf, book cart): 1.5-2 hours each
- **1x2/2x1 static props** (bulletin board, kiosk, shelf): 3-5 hours each
- **Animated props** (turbine, EQ bars, shelf cycling): 4-8 hours each including animation
- **Total for all 11:** ~30-40 hours hand-drawn, ~20-28 hours with MagicaVoxel pipeline

---

## Interaction System Architecture

### Current System
One interaction type: walk into trigger zone -> press E -> RPGDialogBox with typewriter text + optional embedded component (SpotifyPlayer, BookShelf).

### What's Needed
Five distinct interaction types:

| Type | Used by | Behavior |
|------|---------|----------|
| `dialog` (existing) | Shelf, catering, turbine, kiosk | Full RPGDialogBox with text + optional widget |
| `tooltip` | Ski rack, scarf | One-sentence bubble on proximity, no modal, no E press |
| `gallery` | Phone mockup stand | Image carousel with left/right navigation |
| `timeline` | Bulletin board | Structured chronological data view |
| `ambient` | All proximity animations | No UI, just Phaser sprite reacting to player distance |

### Proposed Extension
Add `interactionType` discriminator to TourStop. React-side routing dispatches to different components based on type. Artefact trigger zones use smaller radius (1.5-2.0) than buildings (3.5-5.5) to avoid overlap. Priority ordering: building zones take precedence.

### Shared Infrastructure (build first)
1. **Proximity-triggered animation system** — ~50-80 lines in MainScene. New `animationConfig` field on BuildingDefinition with `triggerRadius`, `idleFrame`, `animKey`. Needed by all 11 artefacts.
2. **Spritesheet loading for props** — add `animated` flag and `frameSize` to BuildingDefinition. ~20 lines in preload.
3. **Custom dialog widgets** — already exists (SpotifyPlayer, BookShelf pattern). Each new widget is conditional render in RPGDialogBox based on buildingId.

---

## The 11 Artefacts — Deep Dive

### 1. LEGO Shelf (2x1) — near LEGO HQ

**Wow factor:** Boxes physically rearrange themselves algorithmically — sliding, restacking — like a visual sorting algorithm. Each configuration represents a different ML optimization output. The animation becomes retroactively meaningful after reading the case study. Second-order detail: tiny colored LEGO-style packages with different category colors.

**Animation:** Idle: 1 frame (messy shelf). Proximity: 12-16 frames at ~6fps (~2.5 sec). Boxes slide within the shelf grid. Final frame holds 2 seconds, then loops. ~18 frames total.

**Environmental fit:** On tile/asphalt 2-3 tiles from LEGO HQ entrance side. Could add scattered mini-brick decorations and a small forklift prop nearby.

**Interaction:** Press E triggers existing LEGO RPGDialogBox. The shelf itself is purely environmental storytelling — it animates near the player, reinforcing the narrative before they click.

**Asset effort:** 3-4 hours in Aseprite. AI useful for reference, not final output.

**Risk:** LOW-MEDIUM. Getting box rearrangement to read clearly at small pixel sizes. Test at actual zoom early.

---

### 2. Catering Setup (2x2) — near Cate-it

**Wow factor:** Food truck's serving window flips open on approach. Order tickets flutter out and stack on the counter. Steam rises from chimney. A "SOLD OUT" sign flips up. One ticket says "TACO" in 3px font. The visual metaphor: Cate-it handles event bookings, here you see the rush being processed.

**Double entry point:** Building tells the designer/platform story, artefact tells the user/logistics story. Could add a "Recent Orders" React widget showing sample food truck names and event types.

**Animation:** Window opens (3 frames) -> steam starts (4-frame loop) -> tickets appear (5 frames) -> mini queue of pixel characters appears. Total: ~16-20 frames, 4-5 second sequence.

**Asset effort:** 6-8 hours. The food truck is the most complex single sprite — isometric vehicle with serving window, wheels, counter, chimney.

**Risk:** MEDIUM. Food truck detail may look muddy at low zoom. Keep silhouette bold, rely on animation (opening window, steam) rather than static detail.

---

### 3. Wind Turbine + Monitoring Station (1x1 + 1x1) — near Valtech

**Wow factor:** The turbine blades spin ALWAYS — the only persistent rotational motion in the city. Immediate landmark visible from distance. When approaching the monitoring station: a tiny screen flickers to life showing 3 bar charts filling sequentially (energy output, wind speed, efficiency). The turbine draws you in, the monitoring station connects it to the design work.

**Animation:** Turbine: 8-frame rotation at 8fps (1 sec/revolution). Three lines rotating around center — THE hardest pixel art challenge (smooth rotation at small scale). Station: dark idle, proximity triggers screen glow + bar chart fill (8 frames) + gentle pulse (2-frame loop). ~12 frames for station.

**Environmental fit:** Turbine on grass, station on asphalt. Use `renderSize: { width: 3, height: 4 }` like trees so blades extend above nearby buildings. Creates a visible landmark.

**Asset effort:** 7-8 hours total. Turbine blade rotation requires manual precision — AI won't help here.

**Risk:** MEDIUM-HIGH. Pixel art rotation at small scales looks jittery. Mitigation: larger render size for blade resolution. Fallback: simplify to "wobble" oscillation.

---

### 4. Boarding Pass Kiosk (1x2) — near AeroGuest

**Wow factor:** On approach, the kiosk screen lights up and a boarding pass "prints" — sliding out pixel by pixel like a thermal printer. The pass reads "FROM: Aarhus / TO: [destination]." Meta-discovery: the boarding pass references your journey through the portfolio. Could dynamically show the last visited building as "FROM."

**Animation:** Idle: dark screen with blinking "TOUCH TO START" (2-frame, 500ms). Proximity: screen shows boarding pass UI (4 frames), pass prints from slot (6 frames). ~12 frames, 3 seconds. The printing emergence is the money shot.

**Interaction:** Press E opens AeroGuest dialog. Optional "BoardingPass" React widget showing Gustav's travel history (Aarhus -> Melbourne -> Berlin -> Aarhus) — ties aviation theme to education exchange story. ~50 lines.

**Asset effort:** 4-5 hours. Kiosk body is straightforward. Detail work is the boarding pass with tiny barcode marks.

**Risk:** LOW. Simplest animated idea. Dynamic "FROM" field is optional stretch goal.

---

### 5. Campus Bulletin Board (2x1) — education intersection

**Wow factor:** Dense with pinned notes in different colors matching each university (SDU green, Melbourne gold, Berlin grey, Erhvervsakademiet blue). Tiny course names visible. One note has "GRADE: A." Another has a small doodle. A half-torn flyer. "FOR SALE: textbooks" note. On approach, a new note pins itself to the board (4 frames — slides in, pushpin appears).

**Interaction:** NEW interaction type — multi-stop "Education Timeline" component showing all 4 universities chronologically with key courses, dates, and what was learned. This is the highest-value education artefact because individual university buildings are low-content, but the trajectory across 4 countries is compelling.

**Asset effort:** 2-3 hours. Easiest sprite — all rectangular shapes. No curves, no complex animation.

**Technical:** New React component (~100-150 lines). New interaction type. Follows SpotifyPlayer conditional pattern.

**Risk:** LOW for sprite, MEDIUM for interaction UX. How to present 4 education stories without overwhelming? Tab interface vs timeline scroll vs cards.

---

### 6. Festival Stage / Sound System (1x2) — near Northside

**Wow factor:** Speaker stack with EQ bars that bounce to an implied beat. Tiny pixel lights on the speakers flash in sync. If SpotifyPlayer is already playing music, the bars react. Bass bars thump harder on certain "beats" (randomized timing that FEELS musical). The only artefact connected to an existing real-time feature.

**Animation — two approaches:**
- **Sprite sheet:** 16-frame loop at 8fps, 5-7 bars at different heights. Simple but repetitive.
- **Programmatic:** Draw bars via Phaser Graphics each frame. Heights driven by sine waves at different frequencies. Infinite, non-repeating. More impressive but risk of looking "too smooth" for pixel art — quantize heights to nearest 2px.

**Asset effort:** 3-4 hours (sprite sheet) or 2 hours sprite + 1-2 hours code (programmatic).

**Risk:** LOW-MEDIUM. Programmatic EQ may feel stylistically inconsistent. Mitigation: pixel-quantized bar heights.

---

### 7. Book Return Cart (1x1) — near Dokk1 Library

**Wow factor:** Overflowing with tiny recognizable book spines. One spine matches a book from Gustav's "Currently Reading" list (already in BookShelf.tsx). On approach, a book slides off the pile and flips open — pages flutter. Connects the physical prop to the digital BookShelf component.

**Animation:** Idle: static cart with colored spines. Proximity: top book slides (2 frames), tips over edge (2 frames), pages flutter (4 frames). ~8 frames, 2 seconds.

**Asset effort:** 1.5-2 hours. Simplest sprite across all 11 ideas.

**Risk:** VERY LOW. Safest, fastest to implement. Only concern: 1x1 might be too small for book detail at default zoom. Use `renderSize: { width: 2, height: 2 }`.

---

### 8. Ski Rack (1x1) — near Ski Slopes

**Wow factor:** Skis leaning against a rack with animated snow particles falling around them. On approach, snow intensifies and a pile accumulates at the base over 2-3 seconds — as if you brought a gust of wind. Skis have tiny racing stripe detail. A micro-climate visual surprise.

**Animation:** Idle: static skis, no particles. Ambient snow: 4-6 falling particles (sprite sheet or Phaser particle emitter). Proximity: snow pile grows (3 frames), particle density increases.

**Asset effort:** 2-3 hours. Simple geometry (poles + diagonal skis + snow blob).

**Risk:** LOW. Snow effect only reads well on snow tiles — placement matters.

---

### 9. Stadium Scarf (1x1) — near Aarhus Stadium

**Wow factor:** AGF scarf (white/blue stripes) draped over a railing, fringe gently swaying in wind. On approach, a chant bubble appears: "HEJA AGF!" — like a speech bubble from the scarf itself. Most personality-driven artefact.

**Animation:** Idle: static scarf. Ambient: fringe sway (2-frame, 600ms). Proximity: speech bubble fades in (3 frames), pulses, holds. ~6 total frames. Lightest animation load.

**Asset effort:** 1.5-2 hours. Very fast to produce.

**Risk:** VERY LOW. Simplest idea alongside book cart. Make speech bubble visually distinct from "Press E" prompt (different shape/color).

---

### 10. Phone Mockup Stand (1x1) — central plaza

**Wow factor:** Phone on a pedestal cycling through project screenshots every 3 seconds. The meta-moment: "He put his portfolio inside his portfolio." Portfolio-within-a-portfolio for the 2-minute visitor. On proximity, phone brightens and "TAP TO VIEW" appears.

**Animation:** Better as programmatic sprite swapping (4 static phone sprites, timer-based switching every 3 sec) than an 84-frame sprite sheet. Proximity: glow border + text.

**Interaction:** NEW React component — `ProjectGallery.tsx` with image carousel, project names, and "View Case Study" links. ~100-150 lines. Most new code of any idea.

**Asset effort:** 3-4 hours. The 10x18px screenshots are hard — need to be recognizable but abstract.

**Risk:** MEDIUM-HIGH. Tiny screenshots may be illegible. The gallery might feel redundant with existing "View Case Study" buttons. Needs UX justification.

---

### 11. Coffee Cart + Laptop (2x1) — near education buildings

**Wow factor:** Cozy working scene. On approach, laptop screen shows a tiny code/Figma editor with colored syntax. Coffee steam rises (always-on ambient). Cursor blinks. Most relatable artefact — every designer knows this scene.

**Animation — two states:**
- State 1 (far): Steam loop only (always visible, sells the scene from distance)
- State 2 (near): Laptop screen lights up + code lines appear + steam intensifies

**Interaction:** "I wrote my thesis on [X] at this coffee shop. The finding that stuck with me was [Y]." Must be specific and personal, not generic philosophy.

**Asset effort:** 3-4 hours. Laptop "code" detail is most time-consuming.

**Risk:** LOW-MEDIUM. Generic if not given specific personal content. Show a Figma-like interface rather than code to emphasize design work.

---

## Wow Factor Multipliers (systemic features)

### Day/Night Cycle
Artefacts with screens (kiosk, laptop, phone stand) emit faint glow at night. `glowSprites` Map already exists in MainScene but appears unused. Simple version: auto-switch to night mode after 8pm local time. Kiosk = blue glow, laptop = warm white, EQ bars = purple.

### Localized Weather
- Snow particles near ski rack (Phaser particle emitter, scoped to rectangle)
- Confetti near festival stage (multi-colored small rectangles, slow fall)
- Leaves near education cluster (autumn drift)
- Activate/deactivate based on camera viewport for performance

### Sound Design (highest differentiation)
Spatial audio with Web Audio API gain nodes tied to player distance. Per-artefact ambient loops: typing near laptop, crowd near stage, wind near turbine, page turning near book cart. MUST be opt-in (muted speaker icon in AdventureHUD, click to enable). No other portfolio does spatial audio in a pixel art city.

### Progress Tracking / Collection
Extend existing `visitedBuildings: Set<string>` to track artefact visits. AdventureHUD shows "7/14 discoveries." Completion reward: special dialog with link to CV PDF or personal email. Store in localStorage for persistence.

### Easter Eggs
- Hidden 1x1 prop in an out-of-the-way corner — no NPC marker, no logo. Rewards curious explorers.
- Seasonal: swap props based on current month (christmas building set already exists).

---

## Priority Matrix

| # | Artefact | Impact | Effort | Risk | Notes |
|---|----------|--------|--------|------|-------|
| 1 | LEGO Shelf | 5/5 | 3/5 | Low-Med | Core case study. Animation IS the story. |
| 2 | Catering Setup | 4/5 | 4/5 | Medium | Complex sprite. Enriches Cate-it. |
| 3 | Wind Turbine | 5/5 | 4/5 | Med-High | Strongest visual magnet. Hard rotation anim. |
| 4 | Boarding Kiosk | 3/5 | 2/5 | Low | Smart placeholder for incomplete case study. |
| 5 | Bulletin Board | 4/5 | 3/5 | Medium | New interaction type needed. High education payoff. |
| 6 | Festival Stage | 3/5 | 3/5 | Low-Med | Connects to existing Spotify feature. |
| 7 | Book Cart | 3/5 | 1/5 | Very Low | Quickest win. BookShelf already exists. |
| 8 | Ski Rack | 2/5 | 1/5 | Low | Atmospheric. Snow is visual surprise. |
| 9 | Stadium Scarf | 2/5 | 1/5 | Very Low | Personality. "HEJA AGF!" chant bubble. |
| 10 | Phone Stand | 5/5 | 4/5 | Med-High | Most new code. Portfolio-in-portfolio. |
| 11 | Coffee + Laptop | 3/5 | 2/5 | Low-Med | Relatable. Must be specific, not generic. |

## Recommended Build Order

### Phase 1: Prove the Concept (~1 week)
Build 3 artefacts covering the full range:

1. **Wind Turbine (#3)** — strongest visual addition, proves GIF animation pipeline for props, addresses Thomas's feedback about "more visible case work"
2. **LEGO Shelf (#1)** — validates two animated props coexisting, enriches strongest case study, tight conceptual mapping
3. **Book Cart (#7)** — easiest possible artefact, validates that small props feel natural, uses existing BookShelf component

**Why these three:** Animated complex + animated medium + static simple. Three different city areas. Zero new React components needed.

### Phase 2: Expand (~1-2 weeks)
4. Catering Setup (#2) — static prop, existing dialog
5. Boarding Kiosk (#4) — fills AeroGuest gap
6. Coffee + Laptop (#11) — connects education to practice
7. Ski Rack (#8) + Stadium Scarf (#9) — two 1x1 statics, done in one session

### Phase 3: New Interactions (~2 weeks)
8. Phone Stand (#10) — build gallery component
9. Bulletin Board (#5) — build timeline component
10. Festival Stage (#6) — build spatial audio or EQ animation

### The Three-Artefact Litmus Test
After Phase 1, ask:
1. Does the city feel more alive with the turbine spinning? (If no: animation quality needs work)
2. Does walking up to the LEGO shelf feel rewarding? (If no: trigger zone or interaction prompt needs tuning)
3. Does the book cart feel natural alongside Dokk1? (If no: placement or scale is off)

All three yes -> proceed to Phase 2. Any no -> fix the fundamental before adding volume.
