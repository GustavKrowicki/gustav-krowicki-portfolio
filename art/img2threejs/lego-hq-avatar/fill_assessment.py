"""Fill the pre-spec assessment + detail inventory for LEGO HQ at avatar scale (board 529:3604)."""
import json
import sys

W = sys.argv[1]
a = json.load(open(f"{W}/assessment.json"))
p = a["preSpecAssessment"]
p["objectClass"] = {
    "primaryType": "architecture: the LEGO campus as a toy-like game building with walk-in rooms (roof on / roof off)",
    "primaryDomain": "object",
    "formLanguage": ["hard-surface", "architectural", "cut-away when open"],
    "structureKind": ["compound object", "repeated modules (windows, wall pieces, studs, domes, chairs)"],
    "motionPotential": ["state switch (roof on / roof off per view)", "entrance doors slide"],
    "materialFamilies": ["painted plaster (flat)", "glass", "painted metal (yellow frame)", "brick", "timber (props)", "grass"],
    "notes": "Style = AI Studio campus image; layout = the approved 8 x 8 board plan; scale = docs/city-rules.md "
             "against the 3D avatar (0.9 wu).",
}
p["complexity"] = {
    "tier": "complex",
    "scores": {"silhouetteComplexity": 3, "componentCount": 3, "hierarchyDepth": 2, "repetitionDensity": 3,
               "materialLayerCount": 3, "localDetailDensity": 2, "occlusionRisk": 3, "actionReadinessNeed": 3},
    "estimatedCounts": {"macroComponents": 20, "mesoComponents": 150, "microFeatureGroups": 8, "materialLayers": 30,
                        "repetitionSystems": 6},
    "reasoning": [
        "Silhouette: 2-storey wings, 3-storey atrium and yellow blocks, a ring building, on an 8 x 8 plot.",
        "Two states from one model: roof-on (closed campus) and roof-off (cutaway, far walls high, others low).",
        "Repetition: windows on a 1 wu bay, wall pieces split at doors, skylight domes, studs, chairs.",
        "Occlusion: interiors are hidden in the roof-on state and must read from above in the roof-off state.",
        "Action readiness: walls and roofs are separate nodes so the game can switch states per view.",
    ],
}
p["specDepthDecision"] = {
    "requiredDepth": "complex", "minimumComponentLevels": ["macro", "meso", "micro"], "needsRepetitionSystems": True,
    "needsMaterialLocalOverrides": True, "needsMultipleReviewViews": True, "needsActionReadyHierarchy": True,
    "rationale": "Identity = the real campus look at character scale; the state switch needs the ground storey split "
                 "into a low part and an upper part per wall side.",
}
p["unknownsToResolveBeforeImplementation"] = [
    "Layout: the 8 x 8 board plan (section 529:3604), approved by Gustav on 2026-10-15.",
    "Heights: wings 2 storeys (2.6 wu), atrium and yellow blocks 3 (3.8 wu), board decision B.",
    "Entrance: south side of the atrium under the yellow 2 x 4 plate, board decision C.",
    "Interiors: not in the reference; one or two large objects per room from the board; the Workshop gets full detail first.",
    "Logo: red square placeholder until the real LEGO logo artwork is supplied.",
]
Z = f"{W}/detail-zones"
R = f"{W}/ref/ai-studio-campus.jpg"


def d(i, kind, desc, region, scale, affects, mtype, ref, ev, conf):
    return {"id": i, "kind": kind, "description": desc,
            "region": dict(zip(("x", "y", "width", "height"), region), units="normalized"),
            "scale": scale, "affects": affects, "mapsTo": {"type": mtype, "ref": ref}, "evidenceRef": ev, "confidence": conf}


CF, MO = "component.localFeatures", "material.localOverrides"
p["detailInventory"] = {
    "scanMethod": "grid-3x3 on the AI Studio campus image", "targetMinDetails": 10, "note": p["detailInventory"]["note"],
    "details": [
        d("green-roofs", "contour", "Flat green roofs with a dark parapet ring on every block.",
          (0.25, 0.10, 0.70, 0.55), "macro", "geometry", CF, "roof-north-top.parapet", R, 0.9),
        d("skylight", "contour", "Atrium roof: white disc with 19 blue domes in rings.",
          (0.45, 0.33, 0.20, 0.15), "meso", "geometry", CF, "roof-skylight.domes", f"{Z}/zone-r1c1.png", 0.9),
        d("round-building", "contour", "Round building with dark glass bands, brick plinth and a round courtyard.",
          (0.03, 0.17, 0.30, 0.25), "macro", "geometry", CF, "roof-round-mass.bands", f"{Z}/zone-r0c0.png", 0.85),
        d("yellow-frames", "contour", "Yellow-framed boxes on top: a bar on the north wing, a block over the south-east corner.",
          (0.55, 0.07, 0.40, 0.70), "macro", "geometry", CF, "roof-yellow-block.frame", R, 0.85),
        d("perforated", "linework", "Terrace building: white perforated facade panels.",
          (0.03, 0.42, 0.40, 0.25), "meso", "material", MO, "facade-perf.dots", f"{Z}/zone-r1c0.png", 0.75),
        d("greenhouse", "contour", "Small glass greenhouse and yellow benches on the terrace roof.",
          (0.10, 0.38, 0.25, 0.15), "micro", "geometry", CF, "roof-greenhouse.glass", f"{Z}/zone-r1c0.png", 0.7),
        d("window-bands", "linework", "Dark recessed windows, one per bay, on every storey.",
          (0.45, 0.55, 0.50, 0.40), "meso", "geometry", CF, "roof-north-upper.windows", f"{Z}/zone-r2c2.png", 0.8),
        d("canopy-plate", "contour", "Yellow 2 x 4 plate with studs over the glass entrance.",
          (0.45, 0.52, 0.10, 0.08), "meso", "geometry", CF, "canopy.studs", f"{Z}/zone-r1c1.png", 0.8),
        d("minifigure", "contour", "Giant minifigure statue on the plaza: blue legs, red torso, yellow head.",
          (0.33, 0.62, 0.08, 0.12), "meso", "geometry", CF, "minifig-torso.figure", f"{Z}/zone-r2c1.png", 0.85),
        d("atrium-bracing", "linework", "Atrium glass walls with yellow diagonal bracing.",
          (0.35, 0.42, 0.30, 0.15), "meso", "geometry", CF, "roof-atrium-upper.bracing", f"{Z}/zone-r1c1.png", 0.7),
        d("brick-plinth", "stain", "Red-brown brick ground storey under the yellow block.",
          (0.45, 0.70, 0.35, 0.20), "meso", "material", MO, "brick.coursing", f"{Z}/zone-r2c1.png", 0.7),
    ],
}
json.dump(a, open(f"{W}/assessment.json", "w"), indent=2)
di = json.load(open(f"{W}/di.json"))
di["detailInventory"] = p["detailInventory"]
json.dump(di, open(f"{W}/di.json", "w"), indent=2)
print("details", len(p["detailInventory"]["details"]))
