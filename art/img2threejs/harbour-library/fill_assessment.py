"""Fill the pre-spec assessment + detail inventory for the harbour library (Linear POR-49, Figma board 732:3604, blockout D).

Detail source: ref/style-grey.png (Figma 730:3605, the grey AI result with the quay and bollards), cut into a 3 x 3 grid
(detail-zones/). Style only: the proportions come from blockout D (7 x 7, low). Every detail maps to a component
localFeature that build_spec.py writes.
Usage: python3 fill_assessment.py <building folder>
"""
import json
import sys

W = sys.argv[1]
a = json.load(open(f"{W}/assessment.json"))
p = a["preSpecAssessment"]
p["objectClass"] = {
    "primaryType": "architecture: a wide, low harbour library (a lopsided many-sided top box over a glass hall on a deck), as a toy-like 7 x 7 tile city building",
    "primaryDomain": "object",
    "formLanguage": ["hard-surface", "architectural", "faceted", "sharp corners"],
    "structureKind": ["stacked plates", "repeated modules (columns, railing bars, skylights, panel joints)"],
    "motionPotential": ["static"],
    "materialFamilies": ["light grey perforated metal", "blue-green glass band", "dark glass", "grey roof", "light stone", "harbour water"],
    "notes": "Style = the grey AI result (730:3605); proportions = blockout D (7 x 7, roof at 3.0 wu); scale = docs/city-rules.md against the 0.9 wu avatar.",
}
p["complexity"] = {
    "tier": "moderate",
    "scores": {"silhouetteComplexity": 2, "componentCount": 3, "hierarchyDepth": 2, "repetitionDensity": 3,
               "materialLayerCount": 2, "localDetailDensity": 2, "occlusionRisk": 2, "actionReadinessNeed": 1},
    "estimatedCounts": {"macroComponents": 25, "mesoComponents": 60, "microFeatureGroups": 5, "materialLayers": 16,
                        "repetitionSystems": 4},
    "reasoning": [
        "Silhouette: a wide flat lopsided 8-sided box hanging far out over a thinner 8-sided deck; about 2.3 times as wide as tall.",
        "Repetition: ~20 round columns, ~180 railing bars, 9 skylights, panel joints on every facade face.",
        "Identity is the hovering grey box with its single blue-green band over a dark glass hall, on a deck with a stair.",
        "Occlusion: the glass hall and the open ground floor sit in the shadow of the box and the deck.",
    ],
}
p["specDepthDecision"] = {
    "requiredDepth": "moderate", "minimumComponentLevels": ["macro", "meso", "micro"], "needsRepetitionSystems": True,
    "needsMaterialLocalOverrides": True, "needsMultipleReviewViews": True, "needsActionReadyHierarchy": False,
    "rationale": "The railing, columns and band only read as real geometry at sprite scale (62 px per wu).",
}
p["unknownsToResolveBeforeImplementation"] = [
    "Footprint 7 x 7 tiles, blockout D (Gustav 2026-10-21): low, roof at 3.0 wu.",
    "Outlines (deck, top box) and the hall square from the code blockout, in wu from the plot's north-west corner.",
    "The harbour lies along the east edge; the plot has room for only a narrow strip of water there, wider in the south-east.",
    "Signs (letters on the corner glass, the tall sign on a column), the light rail and the interior are later steps.",
    "South side first; the other sides wait for Gustav's OK.",
]
Z = f"{W}/detail-zones"


def d(i, kind, desc, region, scale, affects, mtype, ref, ev, conf):
    return {"id": i, "kind": kind, "description": desc,
            "region": dict(zip(("x", "y", "width", "height"), region), units="normalized"),
            "scale": scale, "affects": affects, "mapsTo": {"type": mtype, "ref": ref}, "evidenceRef": ev, "confidence": conf}


CF = "component.localFeatures"
p["detailInventory"] = {
    "scanMethod": "grid-3x3 on ref/style-grey.png", "targetMinDetails": 6, "note": p["detailInventory"]["note"],
    "details": [
        d("top-box", "contour", "Lopsided many-sided top box, flat on top, sharp corners, hanging far out.", (0.22, 0.0, 0.57, 0.5), "macro",
          "geometry", CF, "box-facade.skin", f"{Z}/zone-r0c1.png", 0.9),
        d("band", "contour", "One thin blue-green window band all round the top box.", (0.22, 0.2, 0.57, 0.25), "meso", "geometry", CF,
          "box-band.teal", f"{Z}/zone-r1c1.png", 0.9),
        d("soffit", "contour", "Underside of the top box sloping in toward the glass hall.", (0.3, 0.4, 0.4, 0.1), "meso", "geometry", CF,
          "soffit-1.slope", f"{Z}/zone-r1c1.png", 0.7),
        d("roof", "contour", "Flat grey roof with a grid of small white skylight boxes and solar panels.", (0.22, 0.0, 0.57, 0.4), "meso",
          "geometry", CF, "skylight-1.box", f"{Z}/zone-r0c1.png", 0.9),
        d("hall", "contour", "Dark glass library floor set back under the box, with mullions.", (0.33, 0.4, 0.35, 0.2), "meso", "geometry", CF,
          "hall-glass.dark", f"{Z}/zone-r1c1.png", 0.85),
        d("deck", "contour", "Deck on round grey columns with a fine metal railing; dark open space under it.", (0.22, 0.35, 0.6, 0.45),
          "macro", "geometry", CF, "railing-bar.fine", f"{Z}/zone-r2c1.png", 0.85),
        d("stair", "contour", "Wide light stone stair from the deck down to the plaza on the front-left (south) side.", (0.24, 0.55, 0.18, 0.25),
          "macro", "geometry", CF, "stair-1.step", f"{Z}/zone-r2c0.png", 0.9),
        d("quay", "contour", "Harbour water on the right (east) with a light stone quay edge and dark bollards.", (0.5, 0.5, 0.5, 0.5), "meso",
          "geometry", CF, "quay-edge.coping", f"{Z}/zone-r2c2.png", 0.85),
        d("panel-joints", "linework", "Perforated panel joints on the light grey skin.", (0.22, 0.2, 0.57, 0.3), "micro", "geometry", CF,
          "panel-joint.line", f"{Z}/zone-r1c2.png", 0.6),
    ],
}
json.dump(a, open(f"{W}/assessment.json", "w"), indent=2)
print("details", len(p["detailInventory"]["details"]))
