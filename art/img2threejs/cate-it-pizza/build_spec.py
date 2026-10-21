"""ObjectSculptSpec for the pizza trailer on the food truck square (Linear POR-38): the burger trailer's spec
(art/img2threejs/cate-it-burger/build_spec.py) with TRAILER=pizza: cream paint with a red lower band and a green roof
band, a striped canvas awning, a stone oven with a glowing mouth and a flue through the roof, a chalkboard menu."""
import os
import runpy
import sys

os.environ["TRAILER"] = "pizza"
runpy.run_path(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "cate-it-burger", "build_spec.py"), run_name="__main__")
