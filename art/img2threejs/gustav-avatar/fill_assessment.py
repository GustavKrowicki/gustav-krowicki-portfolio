"""Fill the pre-spec assessment + detail inventory for Gustav's city avatar (from the walk sprites).

Usage: python3 -I fill_assessment.py <workspace>
"""
import json
import sys

W = sys.argv[1]
a = json.load(open(f"{W}/assessment.json"))
p = a["preSpecAssessment"]
p["objectClass"] = {
    "primaryType": "stylized low-poly game avatar of an adult man (portfolio owner) in a light jacket, dark tee and jeans",
    "primaryDomain": "character",
    "formLanguage": ["organic", "stylized low-poly", "chibi-leaning (3.1 heads)", "rounded primitives"],
    "structureKind": ["articulated humanoid", "layered clothing over body segments"],
    "motionPotential": ["skinned skeleton", "walk cycle", "idle loop"],
    "materialFamilies": ["skin", "hair (matte)", "cotton cloth (jacket, tee)", "denim", "leather (shoes)", "thin plastic frames (glasses)"],
    "notes": "Reference = the four 16-frame walk GIFs (56 px tall). Fixed gate view = east frame 0 at 12x (three-quarter, "
             "face-on, carrying a laptop). Only silhouette, colour blocks and band heights are measurable at this size.",
}
p["complexity"] = {
    "tier": "moderate",
    "scores": {"silhouetteComplexity": 2, "componentCount": 2, "hierarchyDepth": 3, "repetitionDensity": 1,
               "materialLayerCount": 2, "localDetailDensity": 1, "occlusionRisk": 1, "actionReadinessNeed": 3},
    "estimatedCounts": {"macroComponents": 4, "mesoComponents": 20, "microFeatureGroups": 4, "materialLayers": 9,
                        "repetitionSystems": 0},
    "reasoning": [
        "Silhouette: big rounded mop head on a short fitted jacket torso and two straight jean legs; arms close to the body.",
        "Hierarchy is the humanoid chain pelvis > spine > neck > head, clavicle > arm > hand, thigh > shin > foot (3+ levels).",
        "Materials: 7 flat colour blocks (hair, skin, jacket, tee, jeans, shoes, glasses frame) plus eyes.",
        "Local detail is minimal at 56 px: fringe edge, glasses, open jacket front, trouser hem over the shoe.",
        "Action readiness is the main requirement: it must walk (4 directions for sprites) and idle, so it needs a real skeleton.",
    ],
}
p["specDepthDecision"] = {
    "requiredDepth": "moderate", "minimumComponentLevels": ["macro", "meso", "micro"], "needsRepetitionSystems": False,
    "needsMaterialLocalOverrides": True, "needsMultipleReviewViews": True, "needsActionReadyHierarchy": True,
    "rationale": "Identity at sprite scale = mop hair + light jacket over dark tee + dark jeans; the rig must animate a walk "
                 "without tearing at the jacket/limb overlaps.",
}
p["unknownsToResolveBeforeImplementation"] = [
    "Face features are 1-2 px: eye shape, brows, nose, mouth undetermined -> minimal stylized marks.",
    "Hands are 2-3 px blobs -> mitten hands, no digits (template digits removed; they cannot read at 24-48 px).",
    "Laptop appears only in the east frames -> left out of the body build (optional prop later).",
    "Jacket buttons/pockets not resolvable -> plain jacket with the open front (tee band) as the only front detail.",
    "Glasses frame colour is light grey in east/north frames -> thin light rims, no lenses.",
]
Z = f"{W}/detail-zones"
R = f"{W}/ref"


def d(i, kind, desc, region, scale, affects, mtype, ref, ev, conf):
    return {"id": i, "kind": kind, "description": desc,
            "region": dict(zip(("x", "y", "width", "height"), region), units="normalized"),
            "scale": scale, "affects": affects, "mapsTo": {"type": mtype, "ref": ref}, "evidenceRef": ev, "confidence": conf}


CF, MO = "component.localFeatures", "material.localOverrides"
p["detailInventory"] = {
    "scanMethod": "component-zones", "targetMinDetails": 6, "note": p["detailInventory"]["note"],
    "details": [
        d("fringe-edge", "contour", "Full fringe ends in a straight-ish edge at the brow line (0.58 of the head box), wider than the face.",
          (0.1, 0.03, 0.8, 0.22), "meso", "geometry", CF, "hair/fringe-edge", f"{Z}/upper.png", 0.75),
        d("hair-mop-volume", "contour", "Hair mass overhangs the skull on all sides (head box 16 px wide vs ~12 px face).",
          (0.05, 0.0, 0.9, 0.25), "macro", "geometry", CF, "hair/mop-overhang", f"{Z}/upper.png", 0.8),
        d("glasses-rims", "linework", "Thin light-grey rims around both eyes (seen east/north).",
          (0.1, 0.22, 0.6, 0.06), "micro", "geometry", CF, "glasses-frame-l", f"{R}/east-00-x12.png", 0.5),
        d("jacket-open-front", "seam", "Open jacket front: a dark olive tee band runs from the collar to the hem.",
          (0.35, 0.36, 0.2, 0.34), "meso", "geometry", CF, "tee-front", f"{Z}/middle.png", 0.7),
        d("jacket-hem", "contour", "Jacket hem sits at the hip (0.71 H from the top), covering the top of the jeans.",
          (0.15, 0.66, 0.75, 0.06), "meso", "geometry", CF, "jacket-skirt", f"{Z}/middle.png", 0.75),
        d("trouser-hem", "seam", "Straight jeans break over the shoe top; dark shoes read as a separate block.",
          (0.1, 0.88, 0.8, 0.1), "micro", "geometry", CF, "foot-l/shoe-break", f"{Z}/lower.png", 0.6),
        d("cloth-matte", "gloss", "Jacket, tee and denim are matte (no highlight in any frame); shoes slightly satin.",
          (0.1, 0.36, 0.8, 0.6), "meso", "material", MO, "jacket/matte-cotton", f"{Z}/middle.png", 0.6),
    ],
}
p["anatomy"] = json.load(open(f"{W}/anatomy.json"))["anatomy"]
json.dump(a, open(f"{W}/assessment.json", "w"), indent=2)
di = json.load(open(f"{W}/di.json"))
di["detailInventory"] = p["detailInventory"]
json.dump(di, open(f"{W}/di.json", "w"), indent=2)
print("details", len(p["detailInventory"]["details"]))
