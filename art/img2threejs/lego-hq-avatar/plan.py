"""Real campus plan fitted to the walk grid (grey box). Plan tiles: gx right 0..PW, gy down 0..PH; one tile = 1 wu.

Source: the campus outline traced from map data and turned so the walls line up, shifted one tile east so the round
building fits on the plot. The real forecourt notch is filled in: from the city camera a door at its back is never seen, so
the main door sits on the south front facing the plaza, like the earlier campus. Walls are snapped to tile edges (moves under half a tile) because the avatar walks from tile
to tile: a wall must not cut through the middle of a tile. Each courtyard is centred on a tile, so the rooms around it
are whole tiles. Rows 0 to 9 hold the building, row 10 is the plaza along the street.
"""
import math

from shapely.geometry import Point, Polygon, box
from shapely.ops import unary_union

PW, PH = 15, 11
RC, RO, RI = (2.5, 6.5), 1.85, 0.58          # round building: centre, outer wall, courtyard


def arc(c, r, a0, a1, n):
    return [(c[0] + r * math.cos(a0 + (a1 - a0) * i / n), c[1] + r * math.sin(a0 + (a1 - a0) * i / n)) for i in range(n + 1)]


# outer wall, clockwise on screen (y down); the round building is an arc from the south-west leg round to the west wing
a_sw = math.atan2(-(RC[1] - (RC[1] + math.sqrt(RO ** 2 - (4 - RC[0]) ** 2))), 4 - RC[0])   # where the arc meets x = 4 (south)
a_nw = -math.acos((3 - RC[0]) / RO)                                                          # where it meets x = 3 (north)
OUTLINE = ([(13, 4), (15, 4), (15, 8), (13, 8), (13, 10), (4, 10)]   # the real forecourt notch is filled: the main door is on the front
           + arc(RC, RO, a_sw, a_nw + 2 * math.pi, 40)
           + [(3, 2), (6, 2), (6, 0), (7, 0), (7, 0.5), (10, 0.5), (10, 2), (12.8, 2)])
SHELL = Polygon(OUTLINE)
ROUND = Point(RC).buffer(RO, 64)
COURTS = {   # name: polygon (all centred on tiles except the long middle court, which spans two)
    "round": Point(RC).buffer(RI, 48),
    "north": box(7.9, 0.9, 9.1, 2.1),
    "west": box(4.9, 2.9, 6.1, 4.1),
    "middle": box(7.3, 3.15, 8.7, 3.85),
    "east-wing": box(10.9, 2.9, 12.1, 4.1),
    "east": box(12.9, 5.0, 14.1, 7.0),
    "south-west": box(4.9, 7.85, 6.1, 8.85),
    "south-east": box(10.9, 7.85, 12.1, 8.85),
    "garden": box(3.0, 4.9, 6.1, 7.0).difference(ROUND),       # the larger court that wraps the round building
}
# Courts that are only light wells in the roof: the ground floor runs on under them, so a room has no hole to walk round
# (Gustav, 2026-10-18: the hole in the shelf room made the shelf hard to reach). The roof keeps them as glazed wells.
ROOF_ONLY_COURTS = {"south-west"}
GROUND_COURTS = {k: v for k, v in COURTS.items() if k not in ROOF_ONLY_COURTS}
BUILDING = SHELL.difference(unary_union(list(GROUND_COURTS.values())))

# Areas by tile (route approved on the board: door, lobby, 1 shelf, 2 test, 3 team, 4 map, 5 AI lab). Open plan: no
# walls between areas, the floor tone tells them apart; only the outside walls and the courtyard walls stand.
ROOMS = {   # code: (name, number on the route, tiles as (x0, x1, y0, y1) inclusive ranges)
    "L": ("Lobby", 0, [(6, 9, 3, 6), (7, 8, 7, 9)]),   # plus the old forecourt, out to the front wall
    "S": ("Shelf room", 1, [(4, 6, 7, 9)]),
    "T": ("Test room", 2, [(9, 12, 7, 9), (10, 12, 5, 6)]),
    "M": ("Team room", 3, [(6, 9, 0, 2), (3, 5, 2, 4)]),
    "Y": ("Systems map room", 4, [(0, 3, 4, 8)]),     # tiles inside the round building only (see room_of)
    "A": ("AI lab", 5, [(13, 14, 4, 7), (10, 12, 2, 4)]),
}
DOORS = [   # the main door, then the old room doors (kept as the route's main links; the plan is open)
    (8, 9, 8, 10),    # main door on the south front, lobby - plaza, under the yellow plate
    (6, 6, 6, 7),     # lobby - shelf room
    (9, 6, 9, 7),     # lobby - test room
    (6, 3, 6, 2),     # lobby - team room
    (3, 4, 3, 5),     # team room - Systems map room (round building)
    (9, 2, 10, 2),    # team room - AI lab
    (12, 7, 13, 7),   # test room - AI lab (back way: soft order, no locked doors)
]
HERO = {    # room code: (tile, label) where the hero object will stand; the tile is blocked
    "S": ((4, 8), "1 Shelf"),
    "T": ((11, 6), "2 Test"),
    "M": ((7, 0), "3 Team screen"),     # on the north wall, in front of the walk row
    "Y": ((1, 6), "4 Systems map"),
    "A": ((14, 5), "5 AI lab table"),
}
BLOCKED = {(4, 9), (11, 5), (12, 5)}   # the shelf runs over two tiles (hero tile + (4, 9)); the tester on (11, 5), the screen on (12, 5)
OUTSIDE_TILES = {(x, y) for x in range(PW) for y in (10,)}
MARGIN = 0.3   # a tile is walkable when its centre is this far from every wall


def room_of(x, y):
    """Room code that owns tile (x, y) (whole or partial), or None."""
    cell = box(x, y, x + 1, y + 1)
    if not cell.intersects(BUILDING) or cell.intersection(BUILDING).area < 1e-3:
        return None
    if ROUND.contains(Point(x + 0.5, y + 0.5)):
        return "Y"
    for code, (_n, _k, rects) in ROOMS.items():
        if code == "Y":
            continue
        if any(x0 <= x <= x1 and y0 <= y <= y1 for x0, x1, y0, y1 in rects):
            return code
    return None


def _polys(g):
    gs = [g] if g.geom_type == "Polygon" else list(getattr(g, "geoms", []))
    return unary_union([p for p in gs if p.geom_type in ("Polygon", "MultiPolygon") and p.area > 1e-4])


def room_region(code):
    """The room's floor: its tiles cut to the building, the round room is the ring inside the round wall."""
    if code == "Y":
        return _polys(ROUND.difference(COURTS["round"]).intersection(SHELL))
    cells = [box(x, y, x + 1, y + 1) for x in range(PW) for y in range(PH) if room_of(x, y) == code]
    return _polys(unary_union(cells).intersection(BUILDING).difference(ROUND))


def walkable(x, y):
    p = Point(x + 0.5, y + 0.5)
    if not BUILDING.contains(p) or BUILDING.exterior.distance(p) < MARGIN:
        return False
    if any(i.distance(p) < MARGIN for i in BUILDING.interiors):
        return False
    return (x, y) not in {t for t, _l in HERO.values()} | BLOCKED


def walk_map():
    rows = []
    for y in range(PH):
        row = ""
        for x in range(PW):
            if (x, y) in OUTSIDE_TILES:
                row += "P"
            elif walkable(x, y) and room_of(x, y):
                row += room_of(x, y)
            else:
                row += "#"
        rows.append(row)
    return rows


if __name__ == "__main__":
    print("\n".join(walk_map()))
