"""Fill the pre-spec assessment + detail inventory for the Aarhus stadium (Linear POR-36, Figma board 611:3604, shape A).

Detail source: ref/run4-style.png (Figma run 4, the style reference), cut into a 3 x 3 grid (detail-zones/). Every detail
maps to a component localFeature or a material localOverride that build_spec.py writes.
Usage: python3 fill_assessment.py <building folder>
"""
import json
import sys

W = sys.argv[1]
a = json.load(open(f"{W}/assessment.json"))
p = a["preSpecAssessment"]
p["objectClass"] = {
    "primaryType": "architecture: a low football stadium with a white roof ring on tree columns, as a toy-like 6 x 5 tile city building",
    "primaryDomain": "object",
    "formLanguage": ["hard-surface", "architectural", "rounded rectangle", "curved columns"],
    "structureKind": ["ring roof", "repeated modules (columns, louvres, stand tiers)"],
    "motionPotential": ["static"],
    "materialFamilies": ["white metal roof", "white precast concrete columns", "honey wood louvres", "dark glass", "blue seats", "grass"],
    "notes": "Style and camera = run 4 (AI image); proportions = shape A on the board; scale = docs/city-rules.md against the 0.9 wu avatar.",
}
p["complexity"] = {
    "tier": "moderate",
    "scores": {"silhouetteComplexity": 2, "componentCount": 3, "hierarchyDepth": 2, "repetitionDensity": 3,
               "materialLayerCount": 2, "localDetailDensity": 2, "occlusionRisk": 2, "actionReadinessNeed": 1},
    "estimatedCounts": {"macroComponents": 30, "mesoComponents": 15, "microFeatureGroups": 4, "materialLayers": 13,
                        "repetitionSystems": 3},
    "reasoning": [
        "Silhouette: one low rounded-rectangle ring; the roof edge is the outline.",
        "Repetition: 22 tree columns, ~120 wood louvres, 5 stand tiers.",
        "Identity is the white roof ring on bending white columns over warm wood, with the blue bowl inside.",
        "Occlusion: the bowl is seen only through the roof opening.",
    ],
}
p["specDepthDecision"] = {
    "requiredDepth": "moderate", "minimumComponentLevels": ["macro", "meso", "micro"], "needsRepetitionSystems": True,
    "needsMaterialLocalOverrides": True, "needsMultipleReviewViews": True, "needsActionReadyHierarchy": False,
    "rationale": "The columns and louvres read only as real geometry at sprite scale (62 px per wu).",
}
p["unknownsToResolveBeforeImplementation"] = [
    "Footprint 6 x 5 tiles, pitch along the 6-tile side (shape A, Gustav 2026-10-16).",
    "Height: ground floor + 1 storey, roof edge at 2.6 wu (the real roof is ~22 m; compressed to the avatar scale).",
    "22 columns (the real stadium has 74 primary + 26 secondary): fewer, wider apart, to read at sprite scale.",
    "The red heritage hall beside one end is a separate model (second step).",
    "No entrance is modelled yet (the stadium is not a walk-in building).",
]
Z = f"{W}/detail-zones"


def d(i, kind, desc, region, scale, affects, mtype, ref, ev, conf):
    return {"id": i, "kind": kind, "description": desc,
            "region": dict(zip(("x", "y", "width", "height"), region), units="normalized"),
            "scale": scale, "affects": affects, "mapsTo": {"type": mtype, "ref": ref}, "evidenceRef": ev, "confidence": conf}


CF, MO = "component.localFeatures", "material.localOverrides"
p["detailInventory"] = {
    "scanMethod": "grid-3x3 on ref/run4-style.png", "targetMinDetails": 6, "note": p["detailInventory"]["note"],
    "details": [
        d("roof-ring", "contour", "Smooth white roof ring with large rounded corners.", (0.2, 0.2, 0.7, 0.4), "macro", "geometry", CF,
          "roof.ring", f"{Z}/zone-r1c1.png", 0.9),
        d("roof-band", "contour", "Light band at the inner edge of the roof opening.", (0.33, 0.27, 0.45, 0.2), "meso", "geometry", CF,
          "roof-band.light", f"{Z}/zone-r0c1.png", 0.8),
        d("solar-panels", "contour", "Panel strip along one long side of the roof: solar panels, on the south side (Gustav).", (0.27, 0.35, 0.22, 0.13), "meso", "geometry", CF,
          "solar-panels.strip", f"{Z}/zone-r1c0.png", 0.75),
        d("columns", "contour", "White columns bending out and up into the roof edge like tree trunks.", (0.22, 0.35, 0.65, 0.3), "macro",
          "geometry", CF, "column-1-1.rib", f"{Z}/zone-r1c1.png", 0.9),
        d("louvres", "linework", "Warm honey-coloured vertical wood between the columns.", (0.35, 0.5, 0.5, 0.15), "micro", "geometry", CF,
          "wood-1-1.curve", f"{Z}/zone-r1c2.png", 0.85),
        d("glass-band", "contour", "Dark glass band along the ground.", (0.38, 0.6, 0.45, 0.06), "meso", "geometry", CF,
          "facade-glass.band", f"{Z}/zone-r1c1.png", 0.85),
        d("seats", "contour", "Blue seat rows seen through the roof opening.", (0.35, 0.28, 0.42, 0.2), "meso", "geometry", CF,
          "seats-1.blue", f"{Z}/zone-r0c1.png", 0.85),
        d("pitch", "contour", "Green pitch with white lines, long axis along the long side.", (0.4, 0.33, 0.3, 0.15), "macro", "geometry", CF,
          "pitch.green", f"{Z}/zone-r1c1.png", 0.9),
        d("corrugation", "linework", "Fine seams on the white roof: below sprite size, flat white.", (0.2, 0.2, 0.7, 0.4), "micro", "material", MO,
          "roof-white.corrugation", f"{Z}/zone-r0c2.png", 0.6),
    ],
}
json.dump(a, open(f"{W}/assessment.json", "w"), indent=2)
print("details", len(p["detailInventory"]["details"]))
