"""Fill the pre-spec assessment + detail inventory for the Workshop cut-away room."""
import json
import sys

W = sys.argv[1]
a = json.load(open(f"{W}/assessment.json"))
p = a["preSpecAssessment"]
p["objectClass"] = {
    "primaryType": "cut-away diorama of a furnished meeting room set up for a design workshop",
    "primaryDomain": "object",
    "formLanguage": ["hard-surface", "architectural interior", "furniture"],
    "structureKind": ["compound object", "repeated modules (chairs, laptops, sticky notes)"],
    "motionPotential": ["static prop", "ambient loop (laptop screen glow)"],
    "materialFamilies": ["painted plaster (whiteboard paint, gloss)", "concrete", "timber (oak)", "textile (carpet, upholstery)",
                         "metal (aluminium laptops)", "paper (sticky notes)", "plastic (chair frames)"],
    "notes": "Primary reference = eye-height phone photo from the door end; the diorama camera is the 30 deg city camera, "
             "so scale comes from docs/city-rules.md and the photo gives identity, layout and colour.",
}
p["complexity"] = {
    "tier": "moderate",
    "scores": {"silhouetteComplexity": 1, "componentCount": 2, "hierarchyDepth": 2, "repetitionDensity": 2,
               "materialLayerCount": 2, "localDetailDensity": 2, "occlusionRisk": 2, "actionReadinessNeed": 1},
    "estimatedCounts": {"macroComponents": 6, "mesoComponents": 20, "microFeatureGroups": 5, "materialLayers": 12, "repetitionSystems": 4},
    "reasoning": [
        "Silhouette: floor slab with two back walls (an L) and a column: low silhouette complexity.",
        "Visible parts: whiteboard wall, end wall, radiator, column, table, 4 chairs, 3 laptops, sticky notes on wall and table, marker list.",
        "Repetition: chairs, laptops, wall sticky-note grid, table sticky notes.",
        "Static prop with one ambient loop (screens) for the city's life rule.",
        "Occlusion: people stand in front of the whiteboard; the door wall and far table end are hidden.",
    ],
}
p["specDepthDecision"] = {
    "requiredDepth": "moderate", "minimumComponentLevels": ["macro", "meso", "micro"], "needsRepetitionSystems": True,
    "needsMaterialLocalOverrides": True, "needsMultipleReviewViews": True, "needsActionReadyHierarchy": False,
    "rationale": "Identity is the whiteboard wall with the list and sticky grid, the table with laptops and notes, and the teal chairs; "
                 "at sprite scale (~62 px per wu) proportions and colour blocks carry it.",
}
p["unknownsToResolveBeforeImplementation"] = [
    "Room size: ceiling tiles give ~3 x 6.5 m -> compressed to a 2 x 2 tile diorama (city rules section 2).",
    "Door wall and ceiling are not modelled: the diorama is cut away on the camera-facing sides.",
    "Whiteboard text must not be legible: stylised marker strokes.",
    "Table length is cropped: 1.3 wu table along the room's long axis.",
]
Z = f"{W}/detail-zones"
R = f"{W}/ref/photo-wide-1200.png"
R2 = f"{W}/ref/photo-wall-1200.png"


def d(i, kind, desc, region, scale, affects, mtype, ref, ev, conf):
    return {"id": i, "kind": kind, "description": desc,
            "region": dict(zip(("x", "y", "width", "height"), region), units="normalized"),
            "scale": scale, "affects": affects, "mapsTo": {"type": mtype, "ref": ref}, "evidenceRef": ev, "confidence": conf}


CF, MO = "component.localFeatures", "material.localOverrides"
p["detailInventory"] = {
    "scanMethod": "grid-3x3 + close wall view", "targetMinDetails": 6, "note": p["detailInventory"]["note"],
    "details": [
        d("marker-list", "linework", "Handwritten list in black marker on the left of the whiteboard: a heading, underline and 5 bulleted lines.",
          (0.27, 0.46, 0.11, 0.18), "meso", "geometry", CF, "whiteboard.markerList", f"{Z}/zone-r1c0.png", 0.8),
        d("sticky-grid", "decal", "Three column headings with yellow, lime and orange sticky notes in a loose grid at shoulder height.",
          (0.42, 0.49, 0.16, 0.08), "micro", "geometry", CF, "whiteboard.stickyGrid", R2, 0.75),
        d("whiteboard-gloss", "gloss", "Wall-sized painted whiteboard with large soft specular highlights.",
          (0.0, 0.1, 0.6, 0.6), "macro", "material", MO, "whiteboard.gloss", f"{Z}/zone-r0c0.png", 0.8),
        d("concrete-column", "contour", "Round exposed-concrete column, floor to ceiling, near the end wall.",
          (0.68, 0.37, 0.08, 0.31), "macro", "geometry", CF, "column.boardMarks", f"{Z}/zone-r1c2.png", 0.8),
        d("table-notes", "decal", "Sticky notes and paper strewn over the oak table between laptops.",
          (0.66, 0.68, 0.24, 0.11), "micro", "geometry", CF, "table.stickyNotes", f"{Z}/zone-r2c2.png", 0.7),
        d("laptops", "contour", "Open silver laptops along the table edge with dark screens.",
          (0.65, 0.78, 0.28, 0.19), "meso", "geometry", CF, "laptop-1.screen", f"{Z}/zone-r2c2.png", 0.7),
        d("chair-teal", "contour", "Swivel chairs: teal upholstered seat and back, white frame and star base.",
          (0.22, 0.70, 0.42, 0.30), "meso", "geometry", CF, "chair-1.frame", f"{Z}/zone-r2c1.png", 0.75),
        d("teal-carpet", "stain", "Dark teal carpet across the floor.",
          (0.4, 0.67, 0.3, 0.16), "macro", "material", MO, "carpet.tone", f"{Z}/zone-r2c1.png", 0.7),
        d("radiator", "contour", "Low white radiator panel under the end wall.",
          (0.64, 0.62, 0.03, 0.04), "micro", "geometry", CF, "radiator.panel", R2, 0.55),
    ],
}
json.dump(a, open(f"{W}/assessment.json", "w"), indent=2)
di = json.load(open(f"{W}/di.json"))
di["detailInventory"] = p["detailInventory"]
json.dump(di, open(f"{W}/di.json", "w"), indent=2)
print("details", len(p["detailInventory"]["details"]))
