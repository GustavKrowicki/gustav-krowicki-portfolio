"""Fill the pre-spec assessment + detail inventory for the Valtech office (Linear POR-35, Figma board node 576-3613).

Detail source: ref/photo-6.jpg (the straight front from across the river), scanned with build_detail_inventory.py
(grid-3x3, zones in detail-zones/). Every detail maps to a component localFeature or a material localOverride that
build_spec.py writes.
"""
import json
import sys

W = sys.argv[1]
a = json.load(open(f"{W}/assessment.json"))
p = a["preSpecAssessment"]
p["objectClass"] = {
    "primaryType": "architecture: a five-storey riverside office block as a toy-like city building on a 3 x 2 tile footprint",
    "primaryDomain": "object",
    "formLanguage": ["hard-surface", "architectural", "horizontal bands"],
    "structureKind": ["stacked slabs", "repeated modules (louvre slats, fins, mullions, awnings, planters)"],
    "motionPotential": ["static; the gate is a walk-through passage"],
    "materialFamilies": ["painted board-marked concrete (white)", "cast-concrete louvres (painted white)", "glass", "canvas awnings",
                         "black timber planters", "brick (passage lining)"],
    "notes": "Style and camera = ref A (AI image); facts = the photos; scale = docs/city-rules.md against the 0.9 wu avatar.",
}
p["complexity"] = {
    "tier": "moderate",
    "scores": {"silhouetteComplexity": 2, "componentCount": 3, "hierarchyDepth": 2, "repetitionDensity": 3,
               "materialLayerCount": 2, "localDetailDensity": 2, "occlusionRisk": 1, "actionReadinessNeed": 1},
    "estimatedCounts": {"macroComponents": 8, "mesoComponents": 60, "microFeatureGroups": 6, "materialLayers": 14,
                        "repetitionSystems": 5},
    "reasoning": [
        "Silhouette: one rectangular block (ground storey, 3 louvre storeys, recessed glass top floor); no flag mast (Gustav, 2026-10-16).",
        "Repetition: louvre slats and fins on every facade and storey, top-floor mullions, awnings and planters per bay.",
        "Identity is in the bands: white slabs alternating with louvre bands, the glass top floor, the green awnings.",
        "Occlusion: low; the passage interior is seen only through the gate.",
    ],
}
p["specDepthDecision"] = {
    "requiredDepth": "moderate", "minimumComponentLevels": ["macro", "meso", "micro"], "needsRepetitionSystems": True,
    "needsMaterialLocalOverrides": True, "needsMultipleReviewViews": True, "needsActionReadyHierarchy": False,
    "rationale": "A banded facade reads only if every band and slat is real geometry at sprite scale (62 px per wu).",
}
p["unknownsToResolveBeforeImplementation"] = [
    "Footprint 3 x 2 tiles (city rules: the real block is ~40 m long), long side south.",
    "Storeys: 1.4 wu ground storey and 3 louvre storeys of 1.2 wu (the real block has 4; offices show 2-3 at avatar scale).",
    "Entrance: the ground-storey gate (passage) in the east bay of the south side, 1.0 wu wide, under an awning.",
    "Rear wing and the north / west facades are not in the photos: louvre bands continue on all sides (assumption).",
    "Facade after the real building: white concrete slats over dark windows, thick white bands (Gustav, 2026-10-16).",
]
Z = f"{W}/detail-zones"
R = f"{W}/ref/photo-6.jpg"


def d(i, kind, desc, region, scale, affects, mtype, ref, ev, conf):
    return {"id": i, "kind": kind, "description": desc,
            "region": dict(zip(("x", "y", "width", "height"), region), units="normalized"),
            "scale": scale, "affects": affects, "mapsTo": {"type": mtype, "ref": ref}, "evidenceRef": ev, "confidence": conf}


CF, MO = "component.localFeatures", "material.localOverrides"
p["detailInventory"] = {
    "scanMethod": "grid-3x3 on ref/photo-6.jpg (straight front)", "targetMinDetails": 10, "note": p["detailInventory"]["note"],
    "details": [
        d("louvre-bands", "linework", "Continuous horizontal bands of white cast-concrete slats ~0.12 wu apart over dark windows, on every office storey.",
          (0.08, 0.33, 0.80, 0.30), "meso", "geometry", CF, "louvre-S-1.slats", f"{Z}/zone-r1c1.png", 0.9),
        d("louvre-fins", "linework", "Thin vertical fins divide each louvre band into panels (one per 1 wu bay at city scale).",
          (0.08, 0.33, 0.80, 0.30), "micro", "geometry", CF, "louvre-S-1.fins", f"{Z}/zone-r1c1.png", 0.8),
        d("slab-bands", "contour", "Thick white bands (slab + high parapet) between the louvre bands.",
          (0.08, 0.28, 0.80, 0.36), "macro", "geometry", CF, "slab-1.edge", f"{Z}/zone-r1c0.png", 0.9),
        d("top-glass", "linework", "Recessed top floor: a continuous band of glass with white frames and mullions.",
          (0.23, 0.10, 0.63, 0.17), "meso", "geometry", CF, "top-glass-S.mullions", f"{Z}/zone-r0c1.png", 0.9),
        d("top-setback", "contour", "Top floor set back from the facade, with a roof terrace at the west end.",
          (0.09, 0.24, 0.15, 0.07), "meso", "geometry", CF, "top-core.setback", f"{Z}/zone-r0c0.png", 0.75),
        d("awnings", "contour", "Dark green awnings over the cafe bays of the ground storey.",
          (0.26, 0.65, 0.43, 0.04), "meso", "geometry", CF, "awning-S-1.slope", f"{Z}/zone-r2c1.png", 0.9),
        d("columns", "contour", "White square columns on the facade line; the ground storey glazing is set back behind them.",
          (0.20, 0.65, 0.50, 0.10), "meso", "geometry", CF, "col-S-1.pier", f"{Z}/zone-r2c1.png", 0.85),
        d("gate", "contour", "Gate: a dark passage through the ground storey, brick-lined, at the east end of the front.",
          (0.70, 0.67, 0.10, 0.11), "meso", "geometry", CF, "gate-void.passage", f"{Z}/zone-r2c2.png", 0.85),
        d("gate-door", "contour", "Glazed entrance door with a house-number plate beside the gate.",
          (0.82, 0.67, 0.05, 0.13), "micro", "geometry", CF, "gate-door.glazed", f"{Z}/zone-r2c2.png", 0.8),
        d("art-panel", "stain", "Red and blue art panel on the wall next to the entrance door.",
          (0.87, 0.67, 0.03, 0.13), "micro", "geometry", CF, "gate-art.stripes", f"{Z}/zone-r2c2.png", 0.7),
        d("planters", "contour", "Black box planters with green shrubs along the front.",
          (0.05, 0.76, 0.83, 0.07), "micro", "geometry", CF, "planter-1.shrub", f"{Z}/zone-r2c1.png", 0.85),
        d("boardmarks", "stain", "Board-marked concrete on the white bands: below sprite size, flat white.",
          (0.10, 0.30, 0.80, 0.30), "micro", "material", MO, "white.boardmarks", f"{Z}/zone-r1c1.png", 0.6),
        d("shop-light", "stain", "Warm interior light behind the dark ground-storey glazing.",
          (0.25, 0.68, 0.42, 0.08), "micro", "material", MO, "shop-glass.warm-light", f"{Z}/zone-r2c1.png", 0.7),
    ],
}
json.dump(a, open(f"{W}/assessment.json", "w"), indent=2)
di = json.load(open(f"{W}/di-photo6.json"))
di["detailInventory"] = p["detailInventory"]
json.dump(di, open(f"{W}/di.json", "w"), indent=2)
print("details", len(p["detailInventory"]["details"]))
