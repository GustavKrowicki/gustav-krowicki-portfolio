"""ObjectSculptSpec for the African street food trailer on the food truck square (Linear POR-38): the burger trailer's spec
(art/img2threejs/cate-it-burger/build_spec.py) with TRAILER=african: warm ochre paint with a terracotta lower band, cream
diamonds on the dark roof band, a terracotta canvas awning, a charcoal grill and a big cooking pot, a wooden menu board."""
import os
import runpy

os.environ["TRAILER"] = "african"
runpy.run_path(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "cate-it-burger", "build_spec.py"), run_name="__main__")
