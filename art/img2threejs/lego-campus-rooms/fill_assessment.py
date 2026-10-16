"""Fill the pre-spec assessment + detail inventory for LEGO HQ Rooms (the campus with the roof off)."""
import json
import sys

W = sys.argv[1]
a = json.load(open(f"{W}/assessment.json"))
p = a["preSpecAssessment"]
p["objectClass"] = {
    "primaryType": "architecture diorama: a corporate campus with the roofs removed, one furnished room per building block",
    "primaryDomain": "object",
    "formLanguage": ["hard-surface", "architectural", "cut-away diorama"],
    "structureKind": ["compound object", "repeated modules (cut walls, roof masses, chairs, studs)"],
    "motionPotential": ["static prop", "state switch (roof on / roof off)"],
    "materialFamilies": ["painted plaster (flat)", "glass", "painted metal (yellow frame)", "timber (props)", "grass"],
    "notes": "Primary reference = Figma AI image made from the board's block plan (card B2). Layout = the campus plan "
             "(../lego-campus/measure/plan.json). Scale from docs/city-rules.md.",
}
p["complexity"] = {
    "tier": "moderate",
    "scores": {"silhouetteComplexity": 2, "componentCount": 3, "hierarchyDepth": 2, "repetitionDensity": 2,
               "materialLayerCount": 2, "localDetailDensity": 1, "occlusionRisk": 1, "actionReadinessNeed": 2},
    "estimatedCounts": {"macroComponents": 12, "mesoComponents": 60, "microFeatureGroups": 5, "materialLayers": 20, "repetitionSystems": 4},
    "reasoning": [
        "Silhouette: low cut walls on a 7 x 7 plot with the lobby glass, the canopy and one closed block standing up.",
        "Visible parts: 9 blocks (lobby, entrance, 5 rooms, entrance hall, closed wing), one or two large props per room.",
        "Repetition: cut-wall segments with dark caps, roof masses, chair rows, canopy studs.",
        "One state switch: every roof part can hide, so the same model renders roof on and roof off.",
        "Occlusion is low: from above every room floor is visible over the knee-high walls.",
    ],
}
p["specDepthDecision"] = {
    "requiredDepth": "moderate", "minimumComponentLevels": ["macro", "meso", "micro"], "needsRepetitionSystems": True,
    "needsMaterialLocalOverrides": True, "needsMultipleReviewViews": True, "needsActionReadyHierarchy": True,
    "rationale": "Identity is the block layout, one colour per room and a few large props, read at ~44 px per wu. "
                 "Roof parts are separate components so the city can show both states.",
}
p["unknownsToResolveBeforeImplementation"] = [
    "Block layout: the campus plan squared to the grid at 7 wu per plan unit (board card B3), shifted 0.5 wu west; the west wing is clipped at the plot edge.",
    "Entrance: a glass vestibule on the atrium north face under the yellow brick; it opens into the lobby (board card B3).",
    "Rooms: one box per room from the B3 room table, 2 back walls (north, west) with caps, 0.5 wu door gaps toward the lobby.",
    "Roof-on state: not in the reference; built from the campus look (green roofs, yellow frames, glass atrium).",
]
Z = f"{W}/detail-zones"
R = f"{W}/ref/ai-roof-off-campus-v3.png"


def d(i, kind, desc, region, scale, affects, mtype, ref, ev, conf):
    return {"id": i, "kind": kind, "description": desc,
            "region": dict(zip(("x", "y", "width", "height"), region), units="normalized"),
            "scale": scale, "affects": affects, "mapsTo": {"type": mtype, "ref": ref}, "evidenceRef": ev, "confidence": conf}


CF, MO = "component.localFeatures", "material.localOverrides"
p["detailInventory"] = {
    "scanMethod": "grid-3x3 on the Figma AI reference", "targetMinDetails": 6, "note": p["detailInventory"]["note"],
    "details": [
        d("cut-caps", "contour", "Thick dark top edge on every cut wall: reads as a cut-away, not a ruin.",
          (0.15, 0.10, 0.70, 0.75), "meso", "geometry", CF, "workshop-floor.cutCaps", R, 0.85),
        d("canopy-studs", "contour", "Giant yellow 2 x 4 brick over the glass doors, round studs on top.",
          (0.42, 0.70, 0.16, 0.16), "meso", "geometry", CF, "canopy.studs", f"{Z}/zone-r2c1.png", 0.85),
        d("lobby-glass", "contour", "Lobby: thin glass walls with white posts around a white floor, open to the entrance hall.",
          (0.37, 0.32, 0.26, 0.28), "macro", "geometry", CF, "lobby-floor.glassWalls", f"{Z}/zone-r1c1.png", 0.8),
        d("room-floor-colours", "stain", "One flat pastel colour per room floor (blue, mint, peach, yellow, grey).",
          (0.15, 0.15, 0.70, 0.60), "macro", "material", MO, "floor-workshop.tone", R, 0.8),
        d("whiteboard", "contour", "Workshop: one long whiteboard on the north wall and one timber table.",
          (0.25, 0.15, 0.25, 0.20), "meso", "geometry", CF, "workshop-whiteboard.board", f"{Z}/zone-r0c0.png", 0.75),
        d("wall-map", "decal", "Map room: one large world map panel on the inner face of the round wall.",
          (0.78, 0.35, 0.14, 0.12), "meso", "geometry", CF, "map-panel.map", f"{Z}/zone-r1c2.png", 0.7),
        d("chair-rows", "contour", "Launch room: two rows of simple chairs facing one black screen.",
          (0.56, 0.52, 0.18, 0.18), "meso", "geometry", CF, "launch-screen.chairs", f"{Z}/zone-r1c2.png", 0.7),
        d("studio-button", "contour", "Recommendation studio: one big round red button on a white pedestal.",
          (0.25, 0.55, 0.25, 0.20), "meso", "geometry", CF, "studio-button.button", R, 0.6),
        d("glass-link", "contour", "Short low glass corridor from the lobby to the round map room.",
          (0.62, 0.40, 0.12, 0.08), "meso", "geometry", CF, "glass-link.link", f"{Z}/zone-r1c2.png", 0.65),
    ],
}
json.dump(a, open(f"{W}/assessment.json", "w"), indent=2)
di = json.load(open(f"{W}/di.json"))
di["detailInventory"] = p["detailInventory"]
json.dump(di, open(f"{W}/di.json", "w"), indent=2)
print("details", len(p["detailInventory"]["details"]))
