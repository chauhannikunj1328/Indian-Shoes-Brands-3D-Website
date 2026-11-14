"""Neemans logo block assets: traces the Neemans wordmark (from neemans.com's header, saved as
assets/neemans/brand/logo.png, transparent) into the vector outlines + halo glow the logo block uses.

Run:  python3 store/scripts/make-neemans-assets.py
Out:  store/public/brands/neemans/{logo_shape.json, logo_outline_shape.json, logo_glow.png, logo.png}
"""
import json
import os
import shutil
import sys

sys.path.insert(0, os.path.dirname(__file__))
from logo_trace import glow, load_mask, trace  # noqa: E402

HERE = os.path.dirname(__file__)
SRC = os.path.join(HERE, '..', '..', 'assets', 'neemans', 'brand', 'logo.png')
OUT = os.path.join(HERE, '..', 'public', 'brands', 'neemans')

mask = load_mask(SRC)
json.dump(trace(mask), open(os.path.join(OUT, 'logo_shape.json'), 'w'))
# piping: the same logo grown a little, traced as its own outline
json.dump(trace(mask, pad=40, smooth=10, level=0.12, eps=0.9), open(os.path.join(OUT, 'logo_outline_shape.json'), 'w'))
glow(mask, os.path.join(OUT, 'logo_glow.png'), rgb=(255, 244, 228))
shutil.copy(SRC, os.path.join(OUT, 'logo.png'))
print('ok')
