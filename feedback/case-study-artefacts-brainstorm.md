# Case Study Artefacts Brainstorm

Explorable pixel art props placed near buildings that visually represent case studies and interests. Players walk up and interact.

---

## Case Study Buildings

### 1. The LEGO Shelf (2x1) — near LEGO HQ
Retail shelf stocked with tiny colorful LEGO boxes. Animation: boxes slide in/out algorithmically, cycling through 2-3 configurations on a slow loop — representing the ML product mix optimization. When interacted: "This shelf has 12 slots. The algorithm evaluated 4,000 product combinations to find the mix that maximizes sell-through for this store's demographic."

**Why it works:** The shelf IS the problem domain. Tight conceptual mapping. LEGO color palette pops on grass. The animation becomes retroactively meaningful after reading the text.

### 2. The Catering Setup (2x2) — near Cate-it
A catering event being set up: long table being laid out, crates of supplies stacked, a clipboard propped against the table. Optional: order tickets hanging on a wire above, representing incoming bookings.

**Double entry point:** Building tells the designer/platform story, artefact tells the user/logistics story. Shows coordination complexity, not just "food."

### 3. The Wind Turbine + Monitoring Station (1x1 + 1x1) — near Valtech
Miniature wind turbine with rotating blades (animated, 4-8 frames). At its base: a small monitoring screen showing an animated data readout. The turbine is visual magnetism (only rotating object in the city), the monitoring station connects it to the actual design work.

**Interaction:** "Vestas operates 40,000+ turbines globally. We designed the digital experience that makes complex energy data accessible to their customers."

### 4. The Boarding Pass Kiosk (1x2) — near AeroGuest
Self-service airport check-in kiosk with blue-glowing screen. Since the case study is in progress, the kiosk shows a simplified version of one key screen from the project — gives visitors a taste without the full write-up. Acknowledges the state plainly: "This case study is still being assembled. Here's the short version: [2 sentences]."

---

## Education Buildings

### 5. The Campus Bulletin Board (2x1) — at intersection of education cluster
Shared kiosk covered in overlapping pixel-art flyers, posters, pinned notes. One flyer half-torn, a "FOR SALE: textbooks" note, stickers from each university.

**Interaction:** Mini-timeline of the education trajectory across 4 countries. Education buildings individually are low-content, but the meta-story is compelling: why move this much? What accumulated? How does studying design in Melbourne differ from Aarhus?

---

## Interest Buildings

### 6. The Festival Stage / Sound System (1x2) — near Northside
Small speaker stack with mixing desk. Animated EQ bars bouncing, light rig cycling colors. Lighter tone than case study artefacts.

**Interaction:** "Northside Festival. Every June in Aarhus. If you want to understand why I live here, this is a big part of the answer."

### 7. The Book Return Cart (1x1) — near Dokk1 Library
Library cart with stacked books waiting to be reshelved. Tiny book spines with visible colors matching real covers.

**Interaction:** 3-5 books that changed how Gustav thinks about design. One-sentence annotations each. What someone reads is one of the highest-signal things in a portfolio.

### 8. The Ski Rack (1x1) — near Ski Slopes
Skis leaning against a wall with boots and poles. Thin dusting of pixel-art snow on the ground — a micro-climate visual surprise.

**Interaction (minimal):** "Tignes. Val Thorens. Are. Some of my best thinking happens on a chairlift."

### 9. The Stadium Scarf (1x1) — near Aarhus Stadium
AGF scarf draped on a railing in club colors. Most minimal artefact in the set.

**Interaction (minimal):** "AGF. Aarhus. If you understand what a local football club means to a city, you understand something about how I think about community and belonging."

---

## Central / Shared

### 10. The Phone Mockup Stand (1x1) — central plaza
Phone on a museum pedestal that cycles through all project UIs. Player-triggered navigation (left/right). A portfolio-within-the-portfolio for the "I have 2 minutes" visitor. Introduces a new interaction type: mini-gallery.

### 11. The Coffee Cart + Laptop (2x1) — near education buildings
Cafe table with open laptop (faint screen glow) and coffee cup. Empty chair.

**Interaction:** Specific, not generic. "I wrote my thesis on [X] at this coffee shop. The finding that stuck with me was [Y], and it still shows up in my work when [Z]." Connects education to practice.

---

## Design Principles

### Vary interaction weight
- **Full paragraph:** LEGO shelf, catering setup, wind turbine station
- **Single sentence:** Ski rack, stadium scarf, festival stage
- **No text / proximity-triggered:** Animations that play when you're within 2 tiles (shelf rearranges, turbine speeds up, EQ bars get louder)
- **Different format:** Phone stand mini-gallery, bulletin board timeline

### Not every building needs an artefact
Empty space and quiet corners make active areas feel more intentional. Prioritize:
1. Buildings with strong case studies (LEGO, Cate-it, Valtech)
2. Education cluster (one shared artefact better than four individual ones)
3. 2-3 interest buildings for personality

### Artefacts should feel lighter than buildings
Tooltip-style bubbles for minimal props, not always the full dialog modal. The city should respond to proximity, not just clicks.

### The journey matters
Artefacts reward movement between buildings. The walk itself has value, not just the destinations.

---

## Implementation Notes
- Props are first-class in `buildings.ts` — existing pattern: `category: "props"`, `isDecoration: true`
- `GifLoader.ts` handles animated sprites (2-8 frame loops)
- Interactable props need a `TourStop` entry and `interactable: true`
- Placement via `cityGrid.json` or the `/city/editor`
- Each artefact needs: pixel art PNG, BuildingDefinition entry, TourStop entry (if interactive), grid placement
