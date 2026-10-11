"""Fill the pre-spec assessment + detail inventory for the LEGO HQ yellow-plate entrance."""
import json
import sys

W = sys.argv[1]
a = json.load(open(f"{W}/assessment.json"))
p = a["preSpecAssessment"]
p["objectClass"] = {
    "primaryType": "building entrance: glass sliding-door module in a curtain wall under a giant yellow LEGO 2x4 plate canopy",
    "primaryDomain": "object",
    "formLanguage": ["hard-surface", "architectural", "toy-brick (LEGO plate + cylindrical studs)"],
    "structureKind": ["compound object", "repeated modules", "articulated assembly"],
    "motionPotential": ["static prop", "articulated (two sliding door leaves)"],
    "materialFamilies": ["plastic (glossy ABS-like yellow)", "glass-like", "metal (powder-coated frames)", "painted interior", "stone (paving)"],
    "notes": "Primary reference = elevated near-frontal aerial crop (matches the isometric game camera); ground view gives plate thickness and door proportions.",
}
p["complexity"] = {
    "tier": "moderate",
    "scores": {"silhouetteComplexity": 1, "componentCount": 2, "hierarchyDepth": 2, "repetitionDensity": 2,
               "materialLayerCount": 2, "localDetailDensity": 1, "occlusionRisk": 1, "actionReadinessNeed": 2},
    "estimatedCounts": {"macroComponents": 3, "mesoComponents": 15, "microFeatureGroups": 4, "materialLayers": 8, "repetitionSystems": 2},
    "reasoning": [
        "Silhouette: planar curtain-wall slab plus one box (the plate) projecting at door-head height: low silhouette complexity.",
        "Visible parts: curtain-wall frame, glass, plate, 8 studs, door head, 2 side lights, 2 sliding leaves, frosted bands, lit lobby, threshold.",
        "Two repetition systems: 2x4 stud grid on the plate and the 0.4 W mullion bays.",
        "Centre leaves must slide open for the walk-in moment -> articulated, action-ready hierarchy.",
        "Occlusion: minifigure statue and planters in the ground view; the aerial shows the module unobstructed.",
    ],
}
p["specDepthDecision"] = {
    "requiredDepth": "moderate", "minimumComponentLevels": ["macro", "meso", "micro"], "needsRepetitionSystems": True,
    "needsMaterialLocalOverrides": True, "needsMultipleReviewViews": True, "needsActionReadyHierarchy": True,
    "rationale": "Identity is the yellow plate with studs over a glass door; fidelity at sprite scale depends on plate proportion, stud grid and door placement.",
}
p["unknownsToResolveBeforeImplementation"] = [
    "How far the plate runs inside: aerial shows 2 stud rows through the glass -> assume a 2x4 plate centred on the glass plane.",
    "Door operation: meeting stiles at the centre in the ground view -> centre pair slides outward behind fixed side lights.",
    "Lobby interior not resolvable -> flat warm lit backdrop.",
    "Curtain-wall extent is cropped -> model a 2.4 W x 1.6 W segment around the module.",
]
Z = f"{W}/detail-zones"
R = f"{W}/ref"


def d(i, kind, desc, region, scale, affects, mtype, ref, ev, conf):
    return {"id": i, "kind": kind, "description": desc,
            "region": dict(zip(("x", "y", "width", "height"), region), units="normalized"),
            "scale": scale, "affects": affects, "mapsTo": {"type": mtype, "ref": ref}, "evidenceRef": ev, "confidence": conf}


CF, MO = "component.localFeatures", "material.localOverrides"
p["detailInventory"] = {
    "scanMethod": "grid-3x3 + ground view", "targetMinDetails": 9, "note": p["detailInventory"]["note"],
    "details": [
        d("stud-grid", "ridge", "Eight cylindrical studs in a 2x4 grid on the plate top; 4 outside, 4 seen through the glass.",
          (0.28, 0.28, 0.42, 0.40), "meso", "geometry", CF, "plate.studGrid", f"{Z}/zone-r1c1.png", 0.85),
        d("plate-gloss", "gloss", "Satin-gloss highlight on the plate top and stud caps; front face brightest yellow.",
          (0.28, 0.55, 0.42, 0.22), "meso", "material", MO, "plate.glossyFace", f"{R}/brick-aerial.png", 0.75),
        d("stud-contact-shadow", "stain", "Dark crescent contact shadow cast by each stud on the plate top.",
          (0.28, 0.55, 0.42, 0.12), "micro", "material", MO, "plate.studShadow", f"{R}/brick-aerial.png", 0.7),
        d("plate-glass-seam", "seam", "Line where the plate passes through the glass; plate continues inside, dimmer behind glass.",
          (0.28, 0.52, 0.42, 0.04), "meso", "geometry", CF, "plate.glassSeam", f"{R}/brick-aerial.png", 0.7),
        d("mullion-grid", "ridge", "Dark curtain-wall mullions in ~0.4 W bays with transoms at door-head height and above.",
          (0.0, 0.0, 1.0, 0.8), "meso", "geometry", CF, "frame.mullionGrid", f"{Z}/zone-r0c0.png", 0.8),
        d("glass-reflection", "gloss", "Dark glass with sky and plate reflections.",
          (0.0, 0.0, 1.0, 0.75), "meso", "material", MO, "glass.reflection", f"{R}/brick-aerial.png", 0.7),
        d("frosted-band", "decal", "Light frosted band across the door glass at mid height.",
          (0.28, 0.82, 0.42, 0.05), "micro", "material", CF, "door-leaf-left.frostedBand", f"{R}/brick-ground.png", 0.65),
        d("meeting-stiles", "contour", "Vertical meeting stiles at the centre where the two sliding leaves meet.",
          (0.45, 0.78, 0.1, 0.16), "micro", "geometry", CF, "door-leaf-left.meetingStile", f"{R}/brick-ground.png", 0.6),
        d("lobby-glow", "emissive", "Bright warm lobby visible through the door glass.",
          (0.28, 0.78, 0.42, 0.16), "meso", "material", CF, "lobby.warmGlow", f"{R}/brick-courtyard.png", 0.5),
    ],
}
json.dump(a, open(f"{W}/assessment.json", "w"), indent=2)
di = json.load(open(f"{W}/di.json"))
di["detailInventory"] = p["detailInventory"]
json.dump(di, open(f"{W}/di.json", "w"), indent=2)
print("details", len(p["detailInventory"]["details"]))
