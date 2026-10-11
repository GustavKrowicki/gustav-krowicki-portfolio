"""ObjectSculptSpec for the LEGO campus, rebuilt procedurally from Gustav's AI Studio image.

Frame = the Krea GLB frame (so the sprite converter's normalisation and offset match the live sprite):
x in [-0.49837, 0.49610], z in [-0.50078, 0.50084], ground slab y -0.11908..-0.111, +Y up.
Buildings sit on a grid rotated 32 deg in the tile; plan coordinates (u, v) map to world by
x = u cos32 - v sin32, z = u sin32 + v cos32. Footprints/heights come from measure/plan.json
(vectorised Krea height map); colours from measure/palette.json (AI image samples).
Extrudes: rotation [-pi/2, 0, 0], profile (x, -z), extruded up +Y from the node's y.
Boxes in the building grid: rotation [0, -32 deg, 0]. Child transforms are parent-relative.
"""
import copy
import json
import math
import sys

W = sys.argv[1]
spec = json.load(open(f"{W}/object-sculpt-spec.json"))
root_t = spec["componentTree"][0]
mat_t = spec["materials"][0]
plan = {r["id"]: r for r in json.load(open(f"{W}/measure/plan.json"))}
ground = json.load(open(f"{W}/measure/ground.json"))

AI, PLAN, SPRITE, COURT = "ai-studio-campus", "krea-plan", "krea-sprite-baseline", "ai-studio-courtyard"
spec["viewEvidence"] = [
    {"id": AI, "view": "primary: AI Studio game-like isometric rendition (style, colour, identity)", "image": f"{W}/ref/ai-studio-campus.jpg",
     "imageRegion": {"x": 0, "y": 0, "width": 1, "height": 1, "units": "normalized"},
     "observations": ["green roofs with dark parapets", "round courtyard building", "atrium skylight circle (19 domes)",
                      "two yellow-framed blocks", "minifigure statue on the tree plaza", "stud-less yellow bar at the plaza entrance"],
     "confidence": 0.85},
    {"id": PLAN, "view": "measured: top-down height/colour maps of the Krea GLB, vectorised (structure only)", "image": f"{W}/measure/plan_preview.png",
     "imageRegion": {"x": 0, "y": 0, "width": 1, "height": 1, "units": "normalized"},
     "observations": ["building grid rotated 32 deg", "roof heights per mass", "courtyard holes", "ground regions and tree positions"],
     "confidence": 0.85},
    {"id": SPRITE, "view": "framing baseline: live sprite lego-hq_south (converter 384 px, zoom 1.0, vOffset 0.31)", "image": f"{W}/ref/krea-sprite-south-white.png",
     "imageRegion": {"x": 0, "y": 0, "width": 1, "height": 1, "units": "normalized"},
     "observations": ["silhouette and offset the replacement must keep"], "confidence": 0.9},
    {"id": COURT, "view": "secondary: AI Studio courtyard close-up", "image": f"{W}/ref/ai-studio-courtyard.jpg",
     "imageRegion": {"x": 0, "y": 0, "width": 1, "height": 1, "units": "normalized"},
     "observations": ["perforated facade", "minifigure statue proportions"], "confidence": 0.6},
]

X0, X1, Z0, Z1 = -0.49837, 0.49610, -0.50078, 0.50084
GB, GT = -0.11908, -0.111
FRAME_T = 0.0002
RC = ((X0 + X1) / 2, GB + FRAME_T / 2, (Z0 + Z1) / 2)
A = math.radians(32.0); CA, SA = math.cos(A), math.sin(A)
XROT = [-math.pi / 2, 0, 0]
YROT = [0, -A, 0]
FLOOR = 0.03


def r4(v):
    return [round(float(x), 5) for x in v]


def uv2xz(u, v):
    return (u * CA - v * SA, u * SA + v * CA)


def rel(x, y, z):
    return (x - RC[0], y - RC[1], z - RC[2])


def prof_uv(poly):
    """(u, v) polygon -> extrude profile points (x, -z)."""
    out = []
    for u, v in poly:
        x, z = uv2xz(u, v)
        out.append([round(x, 5), round(-z, 5)])
    return out


def area(poly):
    return sum(a[0] * b[1] - b[0] * a[1] for a, b in zip(poly, poly[1:] + poly[:1])) / 2


def offset(poly, d):
    """Miter offset of a simple polygon; d > 0 grows it."""
    n = len(poly); sgn = 1 if area(poly) > 0 else -1; out = []
    for i in range(n):
        p0, p1, p2 = poly[i - 1], poly[i], poly[(i + 1) % n]
        def normal(a, b):
            dx, dy = b[0] - a[0], b[1] - a[1]; L = math.hypot(dx, dy) or 1e-9
            return (dy / L * sgn, -dx / L * sgn)
        n1, n2 = normal(p0, p1), normal(p1, p2)
        k = 1 + n1[0] * n2[0] + n1[1] * n2[1]
        if k < 1e-6:
            out.append([p1[0] + n1[0] * d, p1[1] + n1[1] * d]); continue
        out.append([p1[0] + (n1[0] + n2[0]) * d / k, p1[1] + (n1[1] + n2[1]) * d / k])
    return out


def clip_tile(poly_uv, margin=0.0):
    """Clip a (u, v) polygon to the tile square in world x/z (Sutherland-Hodgman), as the source tile does."""
    pts = [list(uv2xz(u, v)) for u, v in poly_uv]
    for axis, lim, keep_less in ((0, X1 - margin, True), (0, X0 + margin, False), (1, Z1 - margin, True), (1, Z0 + margin, False)):
        out = []
        for i, cur in enumerate(pts):
            prev = pts[i - 1]
            cin = cur[axis] <= lim if keep_less else cur[axis] >= lim
            pin = prev[axis] <= lim if keep_less else prev[axis] >= lim
            if cin != pin:
                t = (lim - prev[axis]) / (cur[axis] - prev[axis])
                out.append([prev[0] + t * (cur[0] - prev[0]), prev[1] + t * (cur[1] - prev[1])])
            if cin:
                out.append(cur)
        pts = out
    return [[x * CA + z * SA, -x * SA + z * CA] for x, z in pts]


def rect_uv(u0, u1, v0, v1):
    return [[u0, v0], [u1, v0], [u1, v1], [u0, v1]]


def bbox_rect(poly):
    us = [p[0] for p in poly]; vs = [p[1] for p in poly]
    return rect_uv(min(us), max(us), min(vs), max(vs))


def circle(cu, cv, r, n=48):
    return [[cu + r * math.cos(2 * math.pi * i / n), cv + r * math.sin(2 * math.pi * i / n)] for i in range(n)]


def comp(cid, name, level, role, primitive, parent, dims, pos, material, *, rot=None, scale=None, profile=None, importance=0.6,
         conf=0.75, features=None, evidence=None, attachment=None, topo="", sockets=None, anim_role="static", channels=None,
         constraints=None, pivot=None, surface=None):
    c = copy.deepcopy(root_t)
    c.update({"id": cid, "name": name, "level": level, "role": role, "importance": importance, "confidence": conf,
              "primitive": primitive, "topologyClass": "assembled-solid", "topologyRationale": topo, "parent": parent,
              "material": material, "materialLayers": [material], "localFeatures": features or [],
              "evidenceRefs": evidence or [AI, PLAN]})
    gd = c["geometryDescriptor"]
    gd["topologyIntent"] = "hard-surface, flat faces, crisp edges"
    gd["edgeTreatment"] = {"type": "none", "bevelRadius": 0.0, "segments": 1}
    if profile:
        # Outer loop counter-clockwise, holes clockwise: same-winding holes make ExtrudeGeometry build
        # inward-facing hole walls that get back-face culled (courtyards turned see-through).
        def orient(pts, ccw):
            return pts if (area(pts) > 0) == ccw else list(reversed(pts))
        profile = dict(profile, points=orient(profile["points"], True), holes=[orient(h, False) for h in profile.get("holes", [])])
        gd["profile2D"] = profile
    c["dimensions"] = {"width": round(dims[0], 5), "height": round(dims[1], 5), "depth": round(dims[2], 5), "units": "Krea tile units (1.0 = tile)", "confidence": conf}
    c["transform"] = {"position": r4(pos), "rotation": r4(rot or [0, 0, 0]), "scale": r4(scale or [1, 1, 1])}
    ap = c["actionProfile"]
    ap["animationRole"] = anim_role
    ap["pivot"] = pivot or {"mode": "center", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": conf}
    ap["transformChannels"] = channels or {"translate": False, "rotate": False, "scale": False, "bend": False, "twist": False,
                                           "detach": False, "visibility": True, "materialState": True}
    ap["collider"] = {"type": "box", "offset": [0, 0, 0], "scale": r4(dims), "isTrigger": False, "notes": "box proxy"}
    ap["constraints"] = constraints or []
    ap["sockets"] = sockets or []
    ap["destruction"] = {"breakable": False, "fractureGroup": cid, "seamRefs": [], "detachableFragments": [], "breakImpulse": 0.0, "debrisMaterial": material}
    c["attachment"] = attachment
    if surface:
        c["surfaceDetail"] = surface
    c["fidelityTier"] = "game-prop"
    return c


def att(parent, socket, start, end, contact="flush-mount", **extra):
    a = {"parentId": parent, "parentSocket": socket, "localStart": r4(start), "localEnd": r4(end), "contactType": contact,
         "embedDepth": 0.0005, "gapTolerance": 0.0005}
    a.update(extra)
    return a


C = []
GROUND_SURF = {"macroRoughness": 0.9, "microRoughness": 0.05, "bumpAmplitude": 0.0, "normalPattern": "flat painted ground",
               "displacementPattern": "none", "occlusionPattern": "contact shadow under buildings and trees", "edgeWearPattern": "none", "notes": ""}
# Root: an invisible paper-thin frame carrying the Krea GLB's exact extents, so the sprite converter's
# bbox normalisation (centre, base, 3 / maxDim) is identical to the live sprite's.
C.append(comp("root", "Tile extents frame (invisible)", "macro", "base", "box", None, (X1 - X0, FRAME_T, Z1 - Z0), RC, "tile-frame",
              scale=(X1 - X0, FRAME_T, Z1 - Z0), importance=0.2, conf=0.95, evidence=[PLAN, SPRITE],
              sockets=[{"id": "ground-top", "localPosition": [0, GT - RC[1], 0], "notes": "top of the ground tile"}],
              topo="Bounding frame only: a thin box with a fully transparent material."))
tile = json.load(open(f"{W}/measure/tile_outline.json"))
C.append(comp("ground", "Campus ground tile", "macro", "base", "extrude", "root", (X1 - X0, GT - GB, Z1 - Z0), rel(0, GB, 0), "grass",
              rot=XROT, profile={"points": [[round(x, 5), round(-z, 5)] for x, z in tile], "depth": round(GT - GB, 5)},
              importance=0.8, conf=0.9, evidence=[PLAN, SPRITE],
              features=[{"id": "ground.tile", "kind": "contour", "notes": "Krea tile outline: wavy edges, cut south-west corner"}],
              attachment=att("root", "ground-top", (X0, GB, Z0), (X1, GT, Z1), "butt"),
              topo="Tile outline traced from the Krea plan, extruded to the ground thickness.", surface=GROUND_SURF))


def flat_region(cid, name, poly_xz, holes_xz, material, y, thick=0.0012, level="meso", feats=None):
    profile = {"points": [[round(x, 5), round(-z, 5)] for x, z in poly_xz], "depth": thick,
               "holes": [[[round(x, 5), round(-z, 5)] for x, z in h] for h in holes_xz]}
    xs = [p[0] for p in poly_xz]; zs = [p[1] for p in poly_xz]
    C.append(comp(cid, name, level, "ground-cover", "extrude", "root", (max(xs) - min(xs), thick, max(zs) - min(zs)),
                  rel(0, y, 0), material, rot=XROT, profile=profile, importance=0.45, conf=0.7, evidence=[PLAN, AI], features=feats,
                  attachment=att("root", "ground-top", (min(xs), GT, min(zs)), (max(xs), GT, max(zs)), "applied"),
                  topo="Painted ground region: thin extrude of the vectorised plan outline."))


# --- Ground cover --------------------------------------------------------------------------------
gi = {"sand": 0, "road": 0, "plaza": 0}
for r in ground["regions"]:
    if r["cells"] < 30:
        continue
    k = r["class"]; gi[k] += 1
    feats = [{"id": "ground.loopPath", "kind": "linework", "notes": "road loop around the sand field"}] if (k == "road" and gi[k] == 1) else None
    flat_region(f"{k}-{gi[k]}", f"{k.capitalize()} region {gi[k]}", r["outline"], r["holes"], {"sand": "sand", "road": "road", "plaza": "plaza"}[k],
                GT + {"sand": 0.0, "road": 0.0004, "plaza": 0.0008}[k], feats=feats)


# --- Buildings ------------------------------------------------------------------------------------
def floors_for(h):
    return max(1, round((h - GT) / FLOOR))


import facades as FC

BAY = 0.032          # box-window bay (AI south wing: window module ~1.1x floor height)
FRAME_D = 0.0028     # frame projection: the glass sits this far behind the frame face
MW, SILL, HEAD = 0.004, 0.0065, 0.004


def edge_panel(cid, name, level, material, p0, p1, y0, profile, depth, importance=0.5, feats=None, z0=0.0, topo=""):
    """Extruded panel in the vertical plane of a facade edge: local x along p0->p1, local +z outward, local y up."""
    yaw = FC.yaw_for(p0, p1)
    L = math.hypot(p1[0] - p0[0], p1[1] - p0[1])
    nx, nz = -(p1[1] - p0[1]) / L, (p1[0] - p0[0]) / L
    px, pz = p0[0] + nx * z0, p0[1] + nz * z0
    ys = [p[1] for p in profile["points"]]
    C.append(comp(cid, name, level, "facade", "extrude", "root", (L, max(ys) - min(ys), depth), rel(px, y0, pz), material,
                  rot=[0, yaw, 0], profile={**profile, "depth": round(depth, 5)}, importance=importance, features=feats, evidence=[AI],
                  attachment=att("root", "ground-top", (px, y0, pz), (px + (p1[0] - p0[0]), y0, pz + (p1[1] - p0[1])), "applied"),
                  topo=topo or "Facade panel: rectangle in the facade plane minus its openings, extruded outward."))


def floor_rows(y0, h):
    nf = max(1, round((h - GT) / FLOOR)); fh = (h - GT) / nf
    return [(GT + i * fh - y0, fh) for i in range(nf) if GT + i * fh >= y0 - 1e-6], fh


def facade(bid, name, outline_uv, holes_uv, y0, h, kind, brick_floors=0, accents=True):
    """Per-edge facade system (AI image): box | curtain | fins | perforated | mullions."""
    out_xz = [list(uv2xz(u, v)) for u, v in outline_uv]
    holes_xz = [[list(uv2xz(u, v)) for u, v in hl] for hl in holes_uv]
    H = h - y0
    rows, fh = floor_rows(y0, h)
    for k, (p0, p1, L) in enumerate(FC.facade_edges(out_xz, holes_xz, 0.004)):
        eid = f"{bid}-f{k + 1}"
        ext = FRAME_D  # extend panels past the corner so convex corners close
        if kind == "box":
            base_h = rows[brick_floors][0] if brick_floors and len(rows) > brick_floors else 0.0
            if brick_floors:
                edge_panel(f"{eid}-brick", f"{name} brick base {k + 1}", "meso", "brick", p0, p1, y0,
                           {"points": FC.rect_poly(-ext, 0, L + ext, base_h), "holes": []}, FRAME_D, 0.5,
                           topo="Brick ground storey panel.")
            nb = max(1, round(L / BAY)); bw = L / nb
            wins, acc_rects = [], []
            if L >= BAY * 0.75:
                for fi, (yb, _) in enumerate(rows):
                    if yb < base_h - 1e-6:
                        continue
                    for j in range(nb):
                        s0, s1 = j * bw + MW, (j + 1) * bw - MW
                        w0, w1 = yb + SILL, yb + fh - HEAD
                        if w1 > H - 0.001:
                            continue
                        wins.append(FC.rect_poly(s0, w0, s1, w1))
                        if accents and (j * 7 + fi * 3 + k) % 5 == 0:
                            acc_rects.append((s1 - 0.3 * (s1 - s0), w0 - SILL / 2, s1, w1 + HEAD / 2))
            edge_panel(f"{eid}-frame", f"{name} window frame {k + 1}", "meso", "frame-concrete", p0, p1, y0 + base_h,
                       {"points": FC.rect_poly(-ext, 0, L + ext, H - base_h), "holes": [[[x, y - base_h] for x, y in w] for w in wins]},
                       FRAME_D, 0.6, feats=[{"id": f"{eid}.boxWindows", "kind": "contour", "notes": "deep frames around recessed glass"}] if k == 0 else None,
                       topo="Box-window frame: facade rectangle minus one opening per bay and floor; glass sits behind it.")
            if acc_rects:
                # connect strips through hidden zones (head bands and the first pilaster) so each edge is one polygon
                conns = [(0.0005, base_h, MW - 0.0005, H - 0.0005)]
                for fi, (yb, _) in enumerate(rows):
                    if yb >= base_h - 1e-6:
                        conns.append((0.0005, yb + fh - HEAD * 0.75, L - 0.0005, yb + fh - HEAD * 0.25))
                grid = FC.raster_union(L, H, rects=acc_rects + conns)
                for pi, prof in enumerate(FC.grid_to_profile(grid)):
                    edge_panel(f"{eid}-accent{pi + 1}", f"{name} accent panels {k + 1}", "micro", "accent-ochre", p0, p1, y0, prof,
                               FRAME_D * 0.55, 0.4, feats=[{"id": f"{eid}.accents", "kind": "decal", "notes": "ochre panels beside the glass"}] if k == 0 else None,
                               topo="Coloured spandrel/shade panels in some bays (connected behind the frame).")
        elif kind == "curtain":
            pitch = 0.012; npn = max(1, round(L / pitch)); pw = L / npn; bar = 0.0012
            panes = []
            for fi, (yb, _) in enumerate(rows):
                for j in range(npn):
                    panes.append(FC.rect_poly(j * pw + bar / 2, yb + bar / 2, (j + 1) * pw - bar / 2, min(yb + fh, H) - bar / 2))
            edge_panel(f"{eid}-mullions", f"{name} mullions {k + 1}", "micro", "steel-mullion", p0, p1, y0,
                       {"points": FC.rect_poly(-0.0006, 0, L + 0.0006, H), "holes": panes}, 0.0012, 0.4,
                       topo="Curtain-wall mullion grid: rectangle minus panes.")
            # yellow diagonal bracing behind the glass line (zigzag over two floors), chords hidden at base and fascia
            span = min(H, 2 * fh); nz = max(1, round(L / span)); sw = L / nz; bars = []
            for j in range(nz):
                ya, yb2 = (0.0, H) if j % 2 == 0 else (H, 0.0)
                bars.append(((j * sw, ya), ((j + 1) * sw, yb2), 0.0045))
            grid = FC.raster_union(L, H, rects=[(0, 0, L, 0.0015), (0, H - 0.0015, L, H)], bars=bars)
            for pi, prof in enumerate(FC.grid_to_profile(grid, simplify=0.0004)):
                edge_panel(f"{eid}-brace{pi + 1}", f"{name} bracing {k + 1}", "micro", "brace-yellow", p0, p1, y0, prof, 0.0009, 0.5,
                           feats=[{"id": f"{eid}.bracing", "kind": "linework", "notes": "yellow diagonal steel bracing"}] if k == 0 else None,
                           topo="Diagonal bracing: rasterised union of thick segments traced back to a polygon.")
        elif kind == "perforated":
            g0 = rows[1][0] if len(rows) > 1 else 0.0
            holes = []
            hw, hh, px, py = 0.0034, 0.0026, 0.0058, 0.0048
            y = g0 + 0.003; r = 0
            while y + hh < H - 0.003:
                x = 0.002 + (px / 2 if r % 2 else 0)
                while x + hw < L - 0.002:
                    holes.append(FC.rect_poly(x, y, x + hw, y + hh)); x += px
                y += py; r += 1
            edge_panel(f"{eid}-perf", f"{name} perforated panel {k + 1}", "meso", "perforated-panel", p0, p1, y0 + g0,
                       {"points": FC.rect_poly(-0.002, 0, L + 0.002, H - g0), "holes": [[[a, b - g0] for a, b in hh_] for hh_ in holes]},
                       0.002, 0.6, feats=[{"id": f"{eid}.perforation", "kind": "hole", "notes": "staggered perforation over the glass"}] if k == 0 else None,
                       topo="Perforated white panel: rectangle minus a staggered grid of openings.")
            pitch = 0.012; npn = max(1, round(L / pitch)); pw = L / npn; bar = 0.0012
            panes = [FC.rect_poly(j * pw + bar / 2, bar / 2, (j + 1) * pw - bar / 2, g0 - bar / 2) for j in range(npn)]
            if g0 > 0.004:
                edge_panel(f"{eid}-groundglass", f"{name} ground-floor mullions {k + 1}", "micro", "steel-mullion", p0, p1, y0,
                           {"points": FC.rect_poly(0, 0, L, g0), "holes": panes}, 0.0012, 0.4, topo="Glazed ground floor mullions.")
        elif kind == "mullions":
            pitch = 0.012; npn = max(1, round(L / pitch)); pw = L / npn; bar = 0.0012
            panes = [FC.rect_poly(j * pw + bar / 2, bar / 2, (j + 1) * pw - bar / 2, H - bar / 2) for j in range(npn)]
            edge_panel(f"{eid}-mullions", f"{name} mullions {k + 1}", "micro", "steel-mullion", p0, p1, y0,
                       {"points": FC.rect_poly(0, 0, L, H), "holes": panes}, 0.0012, 0.4, topo="Glazing mullions.")


def building(bid, name, outline, holes, h, *, wall="window-glass", roof="roof-green", parapet=True, kind="box", brick_floors=0,
             importance=0.8, level="macro", feats=None, y0=None, base_until=None, accents=True):
    """Mass from y0 (ground) to roof height h with a facade system per edge, green roof inset and dark parapet.
    base_until: an ordinary box-window base up to that height with this box on top."""
    outline = clip_tile(outline, 0.0015)
    if base_until is not None:
        building(f"{bid}-base", f"{name} base", outline, holes, base_until, roof=None, parapet=False, importance=0.6, level="meso")
        y0 = base_until
    y0 = GT if y0 is None else y0
    prof = {"points": prof_uv(outline), "depth": round(h - y0, 5), "holes": [prof_uv(x) for x in holes]}
    us = [p[0] for p in outline]; vs = [p[1] for p in outline]
    dims = (max(us) - min(us), h - y0, max(vs) - min(vs))
    C.append(comp(bid, name, level, "building", "extrude", "root", dims, rel(0, y0, 0), wall, rot=XROT, profile=prof,
                  importance=importance, features=feats,
                  sockets=[{"id": "roof", "localPosition": [0, 0, round(h - y0, 5)], "notes": "roof plane"}],
                  attachment=att("root", "ground-top", (min(us), GT, min(vs)), (max(us), GT, max(vs)), "butt"),
                  topo="Rectilinear footprint (vectorised plan) extruded to the measured roof height; its walls are the glass line.",
                  surface={"macroRoughness": 0.7, "microRoughness": 0.05, "bumpAmplitude": 0.0, "normalPattern": "flat glass/core",
                           "displacementPattern": "none", "occlusionPattern": "frames project in front of it", "edgeWearPattern": "none", "notes": ""}))
    if kind:
        facade(bid, name, outline, holes, y0, h, kind, brick_floors=brick_floors, accents=accents)
    if roof is None:
        return
    inner = offset(outline, -0.004)
    C.append(comp(f"{bid}-roof", f"{name} roof", "meso", "roof", "extrude", "root", (dims[0], 0.0012, dims[2]), rel(0, h, 0), roof, rot=XROT,
                  profile={"points": prof_uv(inner), "depth": 0.0012, "holes": [prof_uv(offset(x, 0.004)) for x in holes]},
                  importance=0.7, attachment=att("root", "ground-top", (min(us), h, min(vs)), (max(us), h, max(vs)), "applied"),
                  topo="Roof surface inset inside the parapet."))
    if parapet:
        C.append(comp(f"{bid}-parapet", f"{name} parapet", "meso", "trim", "extrude", "root", (dims[0], 0.004, dims[2]), rel(0, h, 0), "parapet-dark",
                      rot=XROT, profile={"points": prof_uv(clip_tile(offset(outline, FRAME_D))), "depth": 0.004, "holes": [prof_uv(inner)]},
                      importance=0.6, attachment=att("root", "ground-top", (min(us), h, min(vs)), (max(us), h, max(vs)), "applied"),
                      topo="Parapet ring covering the frame tops."))


def yellow_block(bid, name, rect, h, base_until, importance=0.9, feats=None):
    """AI-style yellow-framed box on top of a wing: dark glass body, yellow top/bottom rails, yellow corner posts, yellow rim."""
    rect = clip_tile(rect, 0.0015)
    building(f"{bid}-base", f"{name} base", rect, [], base_until, roof=None, parapet=False, importance=0.6, level="meso")
    building(bid, name, rect, [], h, wall="window-dark", kind="mullions", parapet=False, importance=importance, feats=feats, y0=base_until)
    us = [p[0] for p in rect]; vs = [p[1] for p in rect]
    ring = {"points": prof_uv(clip_tile(offset(rect, 0.0012))), "holes": [prof_uv(offset(rect, -0.004))]}
    for rid, y0, y1 in ((f"{bid}-rail-top", h - 0.01, h + 0.003), (f"{bid}-rail-bottom", base_until, base_until + 0.008)):
        C.append(comp(rid, f"{name} {'top' if 'top' in rid else 'bottom'} rail", "meso", "trim", "extrude", "root",
                      (max(us) - min(us), y1 - y0, max(vs) - min(vs)), rel(0, y0, 0), "yellow-frame", rot=XROT,
                      profile={**ring, "depth": round(y1 - y0, 5)}, importance=0.7,
                      attachment=att("root", "ground-top", (min(us), y0, min(vs)), (max(us), y1, max(vs)), "applied"),
                      topo="Yellow frame rail: ring around the box."))
    for k, (u, v) in enumerate(rect):
        x, z = uv2xz(u, v)
        C.append(comp(f"{bid}-post-{k + 1}", f"{name} corner post {k + 1}", "micro", "trim", "box", "root", (0.008, h - base_until, 0.008),
                      rel(x, (h + base_until) / 2, z), "yellow-frame", rot=YROT, scale=(0.008, h - base_until, 0.008), importance=0.5,
                      attachment=att("root", "ground-top", (x, base_until, z), (x, h, z), "butt"), topo="Yellow corner post."))


P = plan
building("wing-north", "North wing", P["b-main-1"]["outline"], P["b-main-1"]["holes"], P["b-main-1"]["height"],
         feats=[{"id": "wing.greenRoofs", "kind": "stain", "notes": "green roof with dark parapet"}])
building("wing-west", "West wing (clipped by the tile edge)", P["b-main-2"]["outline"], P["b-main-2"]["holes"], P["b-main-2"]["height"])
building("wing-west-annex", "West wing annex", P["b-main-3"]["outline"], [], P["b-main-3"]["height"], importance=0.5, level="meso")
for k, rid in enumerate(("b-mid-2", "b-mid-3")):
    building(f"west-roof-box-{k + 1}", f"West wing rooftop block {k + 1}", P[rid]["outline"], [], P[rid]["height"], importance=0.4, level="meso",
             wall="facade-wall", kind=None)
yellow_block("bar-yellow-north", "Yellow-framed north bar", bbox_rect(P["b-high-1"]["outline"]), P["b-high-1"]["height"], P["b-main-1"]["height"],
             feats=[{"id": "bar.yellowFrame", "kind": "contour", "notes": "yellow rails, posts and rim around dark glass"}])
atrium_rect = bbox_rect(P["b-high-0"]["outline"])
building("atrium", "Central glass atrium", atrium_rect, [], P["b-high-0"]["height"], wall="atrium-glass", kind="curtain", parapet=False,
         importance=1.0, feats=[{"id": "atrium.glassBracing", "kind": "linework", "notes": "glass curtain wall, yellow diagonal bracing"}])
_ah = P["b-high-0"]["height"]
_ar = clip_tile(atrium_rect, 0.0015)
C.append(comp("atrium-fascia", "Atrium white roof edge", "meso", "trim", "extrude", "root", (0.32, 0.01, 0.26), rel(0, _ah - 0.007, 0), "fascia-white",
              rot=XROT, profile={"points": prof_uv(clip_tile(offset(_ar, 0.004))), "depth": 0.0095, "holes": [prof_uv(offset(_ar, -0.004))]},
              importance=0.7, evidence=[AI], features=[{"id": "atrium.fascia", "kind": "contour", "notes": "thick white overhanging roof edge"}],
              attachment=att("root", "ground-top", (0, _ah - 0.007, 0), (0, _ah + 0.0025, 0), "applied"),
              topo="Overhanging roof edge: ring around the atrium."))
building("wing-south-west", "South-west courtyard wing", P["b-mid-0"]["outline"], P["b-mid-0"]["holes"], P["b-mid-0"]["height"], brick_floors=1)
building("west-tower", "Raised block on the south-west wing", bbox_rect(P["b-high-2"]["outline"]), [], P["b-high-2"]["height"], importance=0.5,
         level="meso", base_until=P["b-mid-0"]["height"])
building("wing-south-east", "South-east courtyard wing", P["b-mid-1"]["outline"], P["b-mid-1"]["holes"], P["b-mid-1"]["height"], brick_floors=1)
yellow_block("block-yellow-south", "Yellow-framed south block", bbox_rect(P["b-top-0"]["outline"]), P["b-top-0"]["height"], P["b-mid-0"]["height"])
building("terrace-building", "Perforated building with roof terrace", P["b-low-0"]["outline"], P["b-low-0"]["holes"], P["b-low-0"]["height"],
         wall="window-dark", kind="perforated", roof="terrace", importance=0.85,
         feats=[{"id": "terrace.roofTerrace", "kind": "decal", "notes": "light terrace paving instead of a green roof"}])
building("greenhouse", "Roof-terrace greenhouse", P["b-main-4"]["outline"], [], P["b-main-4"]["height"], wall="glass-light", roof="glass-light",
         parapet=False, kind="mullions", importance=0.4, level="meso")
building("terrace-pavilion", "Roof-terrace pavilion", P["b-main-5"]["outline"], [], P["b-main-5"]["height"], parapet=False, kind=None, wall="facade-wall",
         importance=0.3, level="meso")
building("east-pavilion", "East pavilion", P["b-main-6"]["outline"], [], P["b-main-6"]["height"], kind="box", accents=False, importance=0.3, level="meso")

# Round building: ring r 0.128 around a courtyard r 0.040 (measured), brick plinth, green roof ring, dark glass bands
RCU, RCV, RO, RI, RH = 0.429, 0.118, 0.128, 0.040, P["b-main-0"]["height"]
outer, inner = circle(RCU, RCV, RO), circle(RCU, RCV, RI)
building("round-building", "Round courtyard building", outer, [inner], RH, wall="round-glass", kind=None, importance=0.95,
         feats=[{"id": "round-building.courtyard", "kind": "hole", "notes": "open round courtyard"}])
_fins = FC.gear_ring(*uv2xz(RCU, RCV), RO - 0.0005, RO + 0.0045, 150, 0.0013)
C.append(comp("round-fins", "Round building vertical fins", "meso", "facade", "extrude", "root", (2 * RO, RH - GT, 2 * RO), rel(0, GT, 0), "fin-dark",
              rot=XROT, profile={"points": [[round(x, 5), round(-z, 5)] for x, z in _fins], "depth": round(RH - GT, 5),
                                 "holes": [prof_uv(circle(RCU, RCV, RO - 0.003, 96))]},
              importance=0.85, evidence=[AI], features=[{"id": "round-building.fins", "kind": "ridge", "notes": "150 close-set dark vertical fins"}],
              attachment=att("root", "ground-top", (0, GT, 0), (0, RH, 0), "butt"),
              topo="One gear-shaped ring: the outline steps out for each fin, so all fins are a single extrude."))
C.append(comp("round-plinth", "Round building brick plinth", "meso", "base", "extrude", "root", (2 * 0.148, 0.012, 2 * 0.148), rel(0, GT, 0), "brick",
              rot=XROT, profile={"points": prof_uv(circle(RCU, RCV, 0.147)), "depth": 0.012, "holes": [prof_uv(circle(RCU, RCV, RO - 0.002))]},
              importance=0.6, attachment=att("root", "ground-top", (RCU - 0.141, GT, RCV), (RCU + 0.141, GT, RCV), "butt"),
              topo="Brick ring at the base of the round building."))

# Atrium roof skylight disc + 19 domes (1 centre + radial 6 + 12)
au = sum(p[0] for p in atrium_rect) / 4; av = sum(p[1] for p in atrium_rect) / 4
ah = P["b-high-0"]["height"] + 0.0012
ax, az = uv2xz(au, av)
C.append(comp("skylight-disc", "Atrium skylight disc", "meso", "skylight", "cylinder", "root", (0.21, 0.002, 0.21), (0, 0, 0),
              "skylight-white", importance=0.85, evidence=[AI],
              sockets=[{"id": "top", "localPosition": [0, 0, 0], "notes": "disc top; domes and radial rings sit here"}],
              features=[{"id": "atrium-roof.skylightCircle", "kind": "decal", "notes": "white disc with 19 blue domes"}],
              attachment=att("root", "ground-top", rel(ax, ah + 0.002, az), rel(ax, ah, az), "applied", baseRadius=0.105, endRadius=0.105),
              topo="Flat round disc: a short cylinder."))
C.append(comp("skylight-dome-centre", "Centre skylight dome", "micro", "skylight", "cylinder", "skylight-disc", (0.018, 0.004, 0.018), (0, 0, 0),
              "skylight-dome", importance=0.5, evidence=[AI],
              attachment=att("skylight-disc", "top", (0, -0.002, 0), (0, 0.002, 0), "applied", baseRadius=0.009, endRadius=0.008),
              topo="Small dome: a short tapered cylinder."))
spec_reps = [
    {"id": "skylight-ring-inner", "target": "skylight-disc", "parent": "skylight-disc", "level": "micro", "count": 6, "primitive": "cylinder",
     "material": "skylight-dome", "instanceScale": [0.018, 0.004, 0.018], "placement": {"mode": "radial", "axis": [0, 1, 0], "radius": 0.07},
     "distribution": "ring of 6 at r 0.035", "notes": "radius is doubled because the emitter places at radius * 0.5"},
    {"id": "skylight-ring-outer", "target": "skylight-disc", "parent": "skylight-disc", "level": "micro", "count": 12, "primitive": "cylinder",
     "material": "skylight-dome", "instanceScale": [0.018, 0.004, 0.018], "placement": {"mode": "radial", "axis": [0, 1, 0], "radius": 0.14, "startAngleDeg": 15},
     "distribution": "ring of 12 at r 0.07", "notes": "radius is doubled because the emitter places at radius * 0.5"},
]


# --- Trees (outside buildings or in courtyards) -----------------------------------------------------
def inside(pt, poly):
    x, y = pt; c = False
    for (x1, y1), (x2, y2) in zip(poly, poly[1:] + poly[:1]):
        if (y1 > y) != (y2 > y) and x < (x2 - x1) * (y - y1) / ((y2 - y1) or 1e-12) + x1:
            c = not c
    return c


solids = [(r["outline"], r["holes"]) for r in plan.values()]
tree_ids = []
for t in ground["trees"]:
    u = t["x"] * CA + t["z"] * SA; v = -t["x"] * SA + t["z"] * CA
    if any(inside((u, v), o) and not any(inside((u, v), h) for h in hs) for o, hs in solids):
        continue
    if math.hypot(u - RCU, v - RCV) < RO + 0.015 and math.hypot(u - RCU, v - RCV) > RI:
        continue
    # keep the entrance and its approach clear (plate at u 0.06 on the atrium's plaza face)
    atrium_v0 = min(p[1] for p in bbox_rect(P["b-high-0"]["outline"]))
    if 0.06 - 0.045 < u < 0.06 + 0.045 and atrium_v0 - 0.075 < v < atrium_v0 + 0.01:
        continue
    s = min(max(t["size"], 0.016), 0.05); top = min(max(t["top"], GT + 0.02), GT + 0.05)
    hgt = top - GT; trunk = 0.4 * hgt
    x = min(max(t["x"], X0 + s / 2), X1 - s / 2); z = min(max(t["z"], Z0 + s / 2), Z1 - s / 2)
    k = len(tree_ids) + 1; tid = f"tree-{k}"; tree_ids.append(tid)
    C.append(comp(f"{tid}-trunk", f"Tree {k} trunk", "micro", "tree", "box", "root", (0.004, trunk, 0.004), rel(x, GT + trunk / 2, z), "tree-trunk",
                  rot=YROT, scale=(0.004, trunk, 0.004), importance=0.3, conf=0.6, evidence=[PLAN, AI],
                  attachment=att("root", "ground-top", (x, GT, z), (x, GT + trunk, z), "butt"), topo="Blocky game tree trunk: a box."))
    C.append(comp(tid, f"Tree {k} crown", "micro", "tree", "box", "root", (s, hgt - trunk, s), rel(x, GT + trunk + (hgt - trunk) / 2, z), "tree-crown",
                  rot=YROT, scale=(s, hgt - trunk, s), importance=0.35, conf=0.6, evidence=[PLAN, AI],
                  features=[{"id": f"{tid}.blocky", "kind": "contour", "notes": "cube crown like the AI image's trees"}] if k == 1 else None,
                  attachment=att("root", "ground-top", (x, GT + trunk, z), (x, GT + hgt, z), "butt"), topo="Blocky game tree crown: a box."))

# --- Minifigure statue on the plaza ---------------------------------------------------------------
MU, MV = 0.068, -0.164
mx, mz = uv2xz(MU, MV)
MH = 0.036
C.append(comp("minifig-legs", "Minifigure statue legs", "meso", "statue", "box", "root", (0.012, 0.012, 0.007), rel(mx, GT + 0.006, mz), "minifig-blue",
              rot=YROT, scale=(0.012, 0.012, 0.007), importance=0.8, evidence=[AI, COURT],
              sockets=[{"id": "hips", "localPosition": [0, 0.006, 0], "notes": "torso sits here"}],
              attachment=att("root", "ground-top", (mx, GT, mz), (mx, GT + 0.012, mz), "butt"), topo="Minifigure legs block."))
C.append(comp("minifig-torso", "Minifigure statue torso", "meso", "statue", "box", "minifig-legs", (0.014, 0.013, 0.008), (0, 0.0125, 0), "minifig-red",
              scale=(0.014, 0.013, 0.008), importance=0.8, evidence=[AI, COURT],
              features=[{"id": "minifig.statue", "kind": "contour", "notes": "giant classic minifigure: red torso, blue legs, yellow head, blue cap"}],
              attachment=att("minifig-legs", "hips", (0, 0.006, 0), (0, 0.019, 0), "butt"), topo="Torso block."))
for side, sx in (("left", -1), ("right", 1)):
    C.append(comp(f"minifig-arm-{side}", f"Minifigure arm ({side})", "micro", "statue", "box", "minifig-legs", (0.004, 0.011, 0.005),
                  (sx * 0.0095, 0.0125 + (0.003 if side == "right" else 0), 0), "minifig-red", scale=(0.004, 0.011, 0.005), importance=0.4, evidence=[AI],
                  attachment=att("minifig-legs", "hips", (sx * 0.0095, 0.018, 0), (sx * 0.0095, 0.007, 0), "butt"), topo="Arm block."))
C.append(comp("minifig-head", "Minifigure head", "meso", "statue", "cylinder", "minifig-legs", (0.009, 0.007, 0.009), (0, 0, 0), "minifig-yellow",
              importance=0.7, evidence=[AI],
              attachment=att("minifig-legs", "hips", (0, 0.019, 0), (0, 0.026, 0), "butt", baseRadius=0.0045, endRadius=0.0045), topo="Head cylinder."))
C.append(comp("minifig-cap", "Minifigure cap", "micro", "statue", "cylinder", "minifig-legs", (0.01, 0.003, 0.01), (0, 0, 0), "minifig-blue",
              importance=0.5, evidence=[AI],
              attachment=att("minifig-legs", "hips", (0, 0.026, 0), (0, 0.029, 0), "butt", baseRadius=0.005, endRadius=0.0045), topo="Cap cylinder."))

# --- Main entrance: yellow 2x4 plate roofing a glass vestibule on the atrium's plaza face ------------
PW = 0.04                                  # plate width ~2x true size so it reads at campus scale
EU = 0.06
EV = min(p[1] for p in atrium_rect)        # atrium north facade line
PT, PHt = 0.21 * PW, 0.45 * PW
ex, ez = uv2xz(EU, EV)
C.append(comp("entrance-plate", "Giant yellow LEGO 2x4 plate (entrance roof)", "meso", "canopy", "box", "root", (PW, PT, 2 * PW),
              rel(ex, GT + PHt + PT / 2, ez), "lego-yellow", rot=YROT, scale=(PW, PT, 2 * PW), importance=0.95, conf=0.8, evidence=[AI],
              features=[{"id": "entrance-plate.studGrid", "kind": "ridge", "notes": "2 x 4 studs; plate half outside the atrium facade"}],
              sockets=[{"id": "stud-top", "localPosition": [0, PT / 2, 0], "notes": "studs"},
                       {"id": "underside-front", "localPosition": [0, -PT / 2, -PW], "notes": "door head under the plate's outer edge"}],
              attachment=att("root", "ground-top", (ex, GT + PHt, ez), (ex, GT + PHt + PT, ez), "penetrates"),
              topo="LEGO plate is a box; its long axis runs out of the facade toward the plaza (-v)."))
n = 0
for sv in (-0.75, -0.25, 0.25, 0.75):
    for su in (-0.25, 0.25):
        n += 1
        C.append(comp(f"entrance-stud-{n}", f"Entrance plate stud {n}", "micro", "stud", "cylinder", "entrance-plate", (0.3 * PW, 0.1 * PW, 0.3 * PW),
                      (0, 0, 0), "lego-yellow", importance=0.5, evidence=[AI],
                      attachment=att("entrance-plate", "stud-top", (su * PW, PT / 2, sv * PW), (su * PW, PT / 2 + 0.1 * PW, sv * PW), "moulded",
                                     baseRadius=0.15 * PW, endRadius=0.15 * PW),
                      topo="LEGO stud cylinder."))
UY = -PT / 2
C.append(comp("door-head", "Entrance door head", "meso", "trim", "box", "entrance-plate", (PW, 0.0015, 0.002), (0, UY - 0.00075, -PW + 0.001),
              "parapet-dark", scale=(PW, 0.0015, 0.002), importance=0.5,
              sockets=[{"id": "slide-track", "localPosition": [0, -0.00075, 0], "notes": "leaves slide along local X (facade direction)"}],
              attachment=att("entrance-plate", "underside-front", (-PW / 2, UY, -PW), (PW / 2, UY, -PW)), topo="Beam under the plate edge."))
PNW, PNH = PW / 4 - 0.0004, PHt - 0.0015
for side, sx in (("left", -1), ("right", 1)):
    C.append(comp(f"sidelight-{side}", f"Entrance side light ({side})", "micro", "panel", "box", "door-head", (PNW, PNH, 0.001),
                  (sx * 0.375 * PW, -0.00075 - PNH / 2, 0), "door-glass", scale=(PNW, PNH, 0.001), importance=0.4,
                  attachment=att("door-head", "slide-track", (sx * 0.375 * PW, 0, 0), (sx * 0.375 * PW, -PNH, 0)), topo="Glass panel."))
    C.append(comp(f"door-leaf-{side}", f"Entrance sliding door ({side})", "micro", "panel", "box", "door-head", (PNW, PNH, 0.001),
                  (sx * 0.125 * PW, -0.00075 - PNH / 2, 0.0015), "door-glass", scale=(PNW, PNH, 0.001), importance=0.6, anim_role="slider",
                  channels={"translate": True, "rotate": False, "scale": False, "bend": False, "twist": False, "detach": False, "visibility": True, "materialState": True},
                  constraints=[{"type": "slide", "axis": [1, 0, 0], "min": min(0, sx * 0.24 * PW), "max": max(0, sx * 0.24 * PW),
                                "notes": "slides behind the side light"}],
                  pivot={"mode": "edge", "localPosition": [-sx * PNW / 2, 0, 0], "axis": [1, 0, 0], "confidence": 0.7},
                  attachment=att("door-head", "slide-track", (sx * 0.125 * PW, 0, 0.0015), (sx * 0.125 * PW, -PNH, 0.0015), "sliding"),
                  topo="Glass leaf that slides along the facade."))
for side, sx in (("left", -1), ("right", 1)):
    C.append(comp(f"vestibule-side-{side}", f"Entrance vestibule side glass ({side})", "micro", "panel", "box", "entrance-plate", (0.001, PHt, PW),
                  (sx * (PW / 2 - 0.0005), UY - PHt / 2, -PW / 2), "door-glass", scale=(0.001, PHt, PW), importance=0.3,
                  attachment=att("entrance-plate", "underside-front", (sx * PW / 2, UY, 0), (sx * PW / 2, UY, -PW)), topo="Side glass."))
C.append(comp("vestibule-floor", "Lit entrance vestibule floor", "micro", "base", "box", "entrance-plate", (PW - 0.002, 0.0006, PW), (0, UY - PHt + 0.0003, -PW / 2),
              "lobby-light", scale=(PW - 0.002, 0.0006, PW), importance=0.4,
              features=[{"id": "vestibule.warmGlow", "kind": "emissive", "notes": "lit floor so open doors read in a zoomed cut-in"}],
              attachment=att("entrance-plate", "underside-front", (0, UY - PHt, 0), (0, UY - PHt, -PW)), topo="Floor slab."))
spec["componentTree"] = C

# --- Materials (flat, evidence-backed) --------------------------------------------------------------
pal = json.load(open(f"{W}/measure/palette.json"))


# City-style calibration: keep the AI image's hues, match the live sprite's overall value under the converter rig
# (measure/value_calibration.json: linear gain 0.515, saturation x1.1). Set CALIBRATE = False for the bright AI palette.
CALIBRATE = True
VCAL = json.load(open(f"{W}/measure/value_calibration.json"))


def calibrate(hexcol):
    import colorsys
    rgb = [int(hexcol[i:i + 2], 16) / 255 for i in (1, 3, 5)]
    lin = [c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4 for c in rgb]
    lin = [c * VCAL["globalLinearGain"] for c in lin]
    srgb = [c * 12.92 if c <= 0.0031308 else 1.055 * c ** (1 / 2.4) - 0.055 for c in lin]
    h, sat, v = colorsys.rgb_to_hsv(*srgb)
    r, g, b = colorsys.hsv_to_rgb(h, min(1.0, sat * 1.1), v)
    return "#%02x%02x%02x" % tuple(round(max(0, min(1, c)) * 255) for c in (r, g, b))


# Large surfaces that line up pixel-for-pixel with the live sprite take their per-material calibration
# (measure/calibration.json: albedo * live/ours at the same pixels, converter lighting on both).
PER_MATERIAL = {"grass", "roof-green", "sand", "road", "plaza", "tree-crown"}
PCAL = json.load(open(f"{W}/measure/calibration.json"))


def neutral(hexcol, keep=0.35):
    import colorsys
    rgb = [int(hexcol[i:i + 2], 16) / 255 for i in (1, 3, 5)]
    h, sat, v = colorsys.rgb_to_hsv(*rgb)
    return "#%02x%02x%02x" % tuple(round(c * 255) for c in colorsys.hsv_to_rgb(h, sat * keep, v))


def material(mid, name, cls, color, rough, metal, notes, evidence, **extra):
    if CALIBRATE and mid in PER_MATERIAL:
        notes = f"{notes}; AI colour {color} -> per-material calibration to the live sprite ({PCAL[mid]['new']})"
        color = PCAL[mid]["new"]
    elif CALIBRATE and mid == "facade-wall":
        notes = f"{notes}; AI colour {color} -> live facade value, hue kept neutral"
        color = neutral(PCAL[mid]["new"])
        # one more step toward the live facades (#31382f rendered): window rows then stay readable without striping
        color = "#%02x%02x%02x" % tuple(round(int(color[i:i + 2], 16) * 0.8) for i in (1, 3, 5))
    elif CALIBRATE and mid not in ("tile-frame", "lobby-light"):
        notes = f"{notes}; AI colour {color} calibrated to the city value level"
        color = calibrate(color)
    m = copy.deepcopy(mat_t)
    m.update({"id": mid, "name": name, "baseColor": color, "color": color, "materialClass": cls,
              "albedo": {"dominant": color, "secondary": [color], "samplingNotes": notes},
              "colorVariation": {"palette": [color], "pattern": "flat", "amplitude": 0.0, "heightCorrelation": 0.0},
              "roughness": {"base": rough, "variation": 0.02, "map": "independent-procedural-field", "localResponse": "flat"},
              "metalness": {"base": metal, "variation": 0.0}, "localOverrides": [], "notes": notes,
              "textureless": {"declared": True, "evidence": [evidence, "AI Studio image is a flat-shaded illustration; detail is below 1 px at the 384 px sprite"]}})
    m.update(extra)
    for field in ("normal", "bump", "displacement", "surfaceFrequencyBands", "textureProjection", "textureResolution", "referencePbr"):
        m.pop(field, None)
    return m


S = "measure/palette.json sample"
spec["materials"] = [
    material("grass", "Lawn", "unknown", pal["grass"], 0.9, 0.0, "AI ground grass", f"{S} grass {pal['grass']}"),
    material("tile-frame", "Invisible extents frame", "unknown", pal["grass"], 1.0, 0.0, "fully transparent; only carries the bbox",
             "converter normalisation parity (lab sprite view reproduces the live sprites pixel-exactly)", opacity={"base": 0.0}),
    material("sand", "Sand field", "stone", pal["sand"], 0.95, 0.0, "AI beige ground", f"{S} sand {pal['sand']}"),
    material("road", "Paths and roads", "stone", "#b9b2a6", 0.9, 0.0, "AI light paths, darkened one step to read against sand", f"{S} path {pal['path']}"),
    material("plaza", "Plaza paving", "stone", pal["plaza"], 0.85, 0.0, "AI plaza tiles", f"{S} plaza {pal['plaza']}"),
    material("facade-wall", "Facade panels", "stone", "#c4c1b8", 0.8, 0.0, "AI light facade frames between window rows", "AI image facade frames (by eye, samples hit windows)"),
    material("window-glass", "Recessed window glass", "glass", "#5d8794", 0.35, 0.1, "AI teal-dark window glass behind the frames",
             "AI image window panes (facade/ai-south-wing-brick.png, by eye)",
             localOverrides=[{"id": "window.bands", "kind": "linework", "notes": "glass line behind the box frames"}]),
    material("frame-concrete", "Window frames", "stone", "#d2cfc6", 0.8, 0.0, "AI light concrete box frames", "AI image frames (facade crops, by eye)"),
    material("accent-ochre", "Accent panels", "plastic", "#d39b2c", 0.6, 0.0, "AI ochre/yellow panels beside the glass", "AI image accent panels (by eye)"),
    material("steel-mullion", "Steel mullions", "metal", "#40464b", 0.5, 0.4, "AI dark curtain-wall mullions", "AI image atrium/ground-floor glazing (by eye)"),
    material("brace-yellow", "Yellow bracing", "plastic", "#f2cc1a", 0.5, 0.0, "AI yellow diagonal steel behind the atrium glass", "AI image atrium (by eye)"),
    material("fin-dark", "Dark fins", "metal", "#2c2e2d", 0.6, 0.3, "AI round building fins", "AI image round building (by eye)"),
    material("perforated-panel", "Perforated panels", "stone", "#e2e0d9", 0.8, 0.0, "AI white perforated cladding", "AI image terrace building (by eye)"),
    material("fascia-white", "White roof edge", "stone", "#ebeae5", 0.7, 0.0, "AI atrium roof edge", "AI image atrium (by eye)"),
    material("window-dark", "Dark glazing", "glass", "#4a5458", 0.4, 0.1, "AI dark glass in yellow blocks and ground floors", f"{S} window-dark {pal['window-dark']}"),
    material("roof-green", "Green roof", "unknown", pal["roof-green"], 0.9, 0.0, "AI green roofs", f"{S} roof-green {pal['roof-green']}",
             localOverrides=[{"id": "roof-green.sedum", "kind": "stain", "notes": "flat sedum green, the campus's dominant cue"}]),
    material("parapet-dark", "Dark parapet", "metal", "#3a3c3a", 0.6, 0.2, "AI dark roof edges", f"{S} parapet-dark {pal['parapet-dark']} (shadowed)",
             localOverrides=[{"id": "parapet.darkRim", "kind": "contour", "notes": "dark rim outlining every roof"}]),
    material("yellow-frame", "Yellow frame", "plastic", "#ecc61c", 0.5, 0.0, "AI yellow block frames", "AI image yellow frames (by eye; sample hit glass)",
             localOverrides=[{"id": "yellow.frame", "kind": "contour", "notes": "thick yellow frame"}]),
    material("atrium-glass", "Atrium glass", "glass", "#a9c7d1", 0.2, 0.1, "AI atrium curtain wall", f"{S} atrium-glass {pal['atrium-glass']}",
             localOverrides=[{"id": "atrium-glass.bracing", "kind": "linework", "notes": "white floor slabs on the glass"}]),
    material("skylight-white", "Skylight disc", "stone", pal["skylight-white"], 0.7, 0.0, "AI skylight disc", f"{S} skylight-white {pal['skylight-white']}"),
    material("skylight-dome", "Skylight domes", "glass", pal["skylight-dome"], 0.55, 0.1, "AI blue domes", f"{S} skylight-dome {pal['skylight-dome']}"),
    material("terrace", "Roof terrace paving", "stone", pal["terrace"], 0.85, 0.0, "AI light terrace", f"{S} terrace {pal['terrace']}"),
    material("glass-light", "Greenhouse glass", "glass", "#c9d6d6", 0.6, 0.0, "AI greenhouse", "AI image greenhouse (by eye)"),
    material("round-glass", "Round building glass", "glass", "#3e4447", 0.25, 0.1, "AI round building dark glass", f"{S} round-glass {pal['round-glass']}"),
    material("brick", "Brick plinth", "stone", "#a0634c", 0.85, 0.0, "AI brick base", f"{S} brick {pal['brick']} (lit)",
             localOverrides=[{"id": "brick.plinth", "kind": "contour", "notes": "brick ring at the round building's base"}]),
    material("tree-crown", "Tree crowns", "unknown", "#6a9a3a", 0.9, 0.0, "AI blocky trees", f"{S} tree-crown {pal['tree-crown']}",
             localOverrides=[{"id": "tree.blockyCrowns", "kind": "contour", "notes": "cube crowns"}]),
    material("tree-trunk", "Tree trunks", "wood", "#6b4a2e", 0.9, 0.0, "AI trunks", "AI image trunks (by eye)"),
    material("minifig-red", "Minifigure red", "plastic", "#c8341c", 0.4, 0.0, "AI statue torso", f"{S} mini-red {pal['mini-red']}"),
    material("minifig-blue", "Minifigure blue", "plastic", pal["mini-blue"], 0.4, 0.0, "AI statue legs and cap", f"{S} mini-blue {pal['mini-blue']}"),
    material("minifig-yellow", "Minifigure yellow", "plastic", "#f2c31b", 0.4, 0.0, "AI statue head", "AI image head (by eye)"),
    material("lego-yellow", "LEGO yellow plate", "plastic", "#e2b204", 0.42, 0.0, "entrance plate; aerial photo front face #ddae06",
             "photo evidence from the lego-entrance-brick run (plate front face)"),
    material("door-glass", "Entrance door glass", "glass", "#474d50", 0.06, 0.2, "entrance doors", "lego-entrance-brick run (aerial glazing)"),
    material("lobby-light", "Lit vestibule floor", "stone", "#d9d2c3", 0.8, 0.0, "stylised lit floor", "interior not resolvable; readability choice",
             emissive="#efe9dc", emissiveIntensity={"base": 0.3}),
]


def rgba(h):
    h = h.lstrip("#")
    return f"rgba({int(h[0:2], 16)}, {int(h[2:4], 16)}, {int(h[4:6], 16)}, 1.0)"


mats = {m["id"]: m for m in spec["materials"]}
for c in C:
    m = mats[c["material"]]
    c["colorMaterialRecipe"] = {"dominantAlbedo": rgba(m["baseColor"]), "secondaryAlbedo": rgba(m["albedo"]["secondary"][0]),
                                "materialClass": m["materialClass"], "materialClassConfidence": 0.75, "evidenceRefs": c["evidenceRefs"]}
spec["repetitionSystems"] = spec_reps + [
    {"id": "trees", "target": "root", "count": len(tree_ids), "elementComponentIds": tree_ids, "distribution": "measured positions from the Krea plan",
     "notes": "built individually"},
    {"id": "entrance-studs", "target": "entrance-plate", "count": 8, "elementComponentIds": [f"entrance-stud-{i}" for i in range(1, 9)],
     "distribution": "2 x 4 grid", "notes": "built individually"},
]
spec["silhouette"] = {"boundingShape": "square tile 0.995 x 1.0 x 0.008 with extruded masses up to 0.23 tall on a grid rotated 32 deg",
                      "aspectRatios": ["tile 1 : 1", "tallest mass 0.23 : 1"], "symmetry": "none (campus plan)",
                      "dominantCurves": ["round courtyard building", "skylight circle", "road loop"], "negativeSpaces": ["courtyards", "round courtyard"],
                      "landmarks": ["atrium at the centre", "yellow blocks north-west and south-east", "round building east", "plaza north of the atrium"]}
spec["coordinateFrame"] = {"front": "+Z (south in the converter's naming)", "up": "+Y", "scaleReference": "Krea GLB units; tile spans 1.0"}
spec["featureReviewTargets"] = [
    {"id": "campus-layout", "name": "Building masses, heights and courtyards match the plan and the sprite silhouette", "tier": "critical",
     "passIds": ["blockout", "structural-pass", "form-refinement", "material-pass"], "minimumScore": 0.8, "mustPass": True,
     "componentRefs": ["root", "wing-north", "wing-west", "atrium", "wing-south-west", "wing-south-east", "terrace-building", "round-building"]},
    {"id": "landmarks", "name": "Round building, atrium skylight circle and the two yellow-framed blocks read as in the AI image", "tier": "critical",
     "passIds": ["structural-pass", "form-refinement", "material-pass"], "minimumScore": 0.75, "mustPass": True,
     "componentRefs": ["round-building", "skylight-disc", "bar-yellow-north", "block-yellow-south"]},
    {"id": "plaza-entrance", "name": "Tree plaza with the minifigure statue and the yellow-plate entrance on the atrium", "tier": "important",
     "passIds": ["form-refinement", "material-pass", "interaction-pass"], "minimumScore": 0.65, "mustPass": False,
     "componentRefs": ["minifig-torso", "entrance-plate", "door-leaf-left", "door-leaf-right"]},
]
levels = {l: [c["id"] for c in C if c["level"] == l] for l in ("macro", "meso", "micro")}
for bp in spec["buildPasses"]:
    lv = {"blockout": ["macro"], "structural-pass": ["macro", "meso"]}.get(bp["id"], ["macro", "meso", "micro"])
    bp["componentRefs"] = [cid for l in lv for cid in levels[l]]
spec["qualityTargets"]["reviewViewpoints"] = ["converter south (yaw 45)", "converter west (135)", "converter north (225)", "converter east (315)", "AI image view"]
spec["lookDevTargets"]["qualityPriority"] = "game-prop"
spec["performanceBudget"].update({"qualityPriority": "game-prop", "targetTriangles": 60000, "maxDrawCalls": 400, "textureSize": 1024, "fpsTarget": 30})
spec["lightingFromPhoto"] = [
    {"id": "key", "type": "directional", "role": "key", "intensity": 0.8, "position": [5, 10, 5], "castsShadow": False,
     "evidence": "sprite converter rig: every city sprite is lit this way, so the replacement must be too"},
    {"id": "fill", "type": "directional", "role": "fill", "intensity": 0.3, "position": [-5, 5, -5], "evidence": "converter fill light"},
    {"id": "ambient", "type": "ambient", "role": "environment", "intensity": 0.6, "evidence": "converter ambient (no environment map, no reflections)"},
    {"id": "tone", "role": "exposure", "toneMapping": "None", "exposure": 1.0, "notes": "converter renders without tone mapping"},
    {"id": "contact", "role": "shadow", "notes": "no cast shadows in the converter; contact read comes from the dark parapets and window bands (ambient occlusion not baked)"},
]
pa = spec["preSpecAssessment"]
spec["assumptions"] = ["RESOLVED BY ASSUMPTION: " + u for u in (pa.get("unknownsToResolveBeforeImplementation") or [])]
pa["unknownsToResolveBeforeImplementation"] = []
spec["suitability"] = "pass"
json.dump(spec, open(f"{W}/object-sculpt-spec.json", "w"), indent=2)
print("components", len(C), "trees", len(tree_ids), "materials", len(spec["materials"]))
