"""Fill anatomy.json (extract_landmarks.py scaffold) with values measured off the walk sprites.

All measurements are in sprite pixels on the 56 px figure (measure/proportions.json), converted to head units
(HU = head height, 18 px). Face landmarks are fractions of the head box (hair top to chin). Read off
ref/east-00-x12.png and ref/north-00-x12.png at 12x; overlay in landmarks.png.

Usage: python3 -I fill_anatomy.py <workspace>
"""
import json
import sys

W = sys.argv[1]
doc = json.load(open(f"{W}/anatomy.json"))
HEAD_PX, FIGURE_PX = 18.0, 56.0
hu = lambda px: round(px / HEAD_PX, 3)  # noqa: E731

anatomy = doc["anatomy"]
anatomy.update({
    "applies": True,
    "styleHeads": round(FIGURE_PX / HEAD_PX, 2),  # 3.11: chibi-leaning stylized game figure
    "proportions": {
        "headUnit": round(HEAD_PX / FIGURE_PX, 3),  # head height / figure height
        # template semantics: torso = shoulder line to crotch, legs = hip joint to sole
        "torso": hu(19),          # rows 21 -> 40 (jacket shoulder to jacket hem / crotch)
        "legs": hu(19),           # rows 38 -> 57 (hip joint under the jacket to the sole)
        "shoulderWidth": hu(14),  # jacket across the shoulders in the north/south frames, arms excluded
        "hipWidth": hu(11),       # jeans width just below the jacket hem
    },
    "pose": {
        "type": "walk-cycle (16 frames per direction); bind pose built as a neutral A-pose standing",
        "jointAngles": {},
        "note": "The sprite is a walk cycle, not a static pose. The model binds in a neutral stance; the walk "
                "pose lives in the authored clips (author_clips.py), never in the bind pose.",
    },
    "faceLandmarks": {
        "hairline": 0.58,   # fringe bottom edge, row 12-13 of the 2..20 head box: low, covers the forehead
        "eyeLine": 0.70,    # dark eye pixels at rows 14-15
        "eyeSpacing": 0.30,
        "noseBase": 0.80,
        "mouthLine": 0.90,
        "earTop": 0.62,
        "earBottom": 0.84,
    },
    "features": [
        "mop haircut wider than the face (head box 16 px wide x 18 px tall, hair to the ears)",
        "full fringe down to the brow line",
        "light-frame glasses (light grey rims around the eyes in east/north frames)",
        "light grey open jacket over a dark olive tee",
        "dark indigo straight jeans, dark shoes",
    ],
    "confidence": 0.6,
    "evidenceRefs": ["ref/east-00-x12.png", "ref/north-00-x12.png", "measure/proportions.json"],
    "confidenceNote": "56 px source: proportions +-1 px (~0.06 HU); face landmarks +-1 px of an 18 px head (~0.06).",
})
json.dump(doc, open(f"{W}/anatomy.json", "w"), indent=2)
print(json.dumps(anatomy["proportions"]), anatomy["styleHeads"])
