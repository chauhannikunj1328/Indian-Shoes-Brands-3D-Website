"""Assets for the enquiry (CTA) wall: the embossed IndianShoes wordmark and the embossed WhatsApp QR.

  1. Wordmark: render-wordmark.swift draws "इंडियनShoes" (Kohinoor Devanagari Bold), then it is traced
     into vector outlines for a 3D extrusion, like the Comet / Gully Labs block logos:
       public/brands/indianshoes/logo_shape.json          letters
       public/brands/indianshoes/logo_outline_shape.json  grown outline, for the piping border
       public/brands/indianshoes/logo_glow.png            soft halo behind the letters
  2. QR: public/textures/whatsapp_qr.png is read back into its module grid, stored as rows of dark runs
       public/brands/indianshoes/whatsapp_qr.json         {"size": n, "runs": [[row, col, length], ...]}
     so the wall can raise each dark module as a small block.

Run (from the repo root, macOS):  python3 store/scripts/make-cta-assets.py
"""
import json
import os
import subprocess
import sys

import numpy as np
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from logo_trace import glow, load_mask, trace  # noqa: E402

PUBLIC = os.path.join(HERE, '..', 'public')
OUT = os.path.join(PUBLIC, 'brands', 'indianshoes')
os.makedirs(OUT, exist_ok=True)

# 1. wordmark
png = os.path.join(OUT, 'wordmark.png')
subprocess.run(['swift', os.path.join(HERE, 'render-wordmark.swift'), png], check=True)
mask = load_mask(png, trace_w=1800)
letters = trace(mask, pad=40, smooth=0.8, level=0.5)
outline = trace(mask, pad=40, smooth=4, level=0.3)  # thin piping (the blocks use smooth=10, level=0.12)
json.dump(letters, open(os.path.join(OUT, 'logo_shape.json'), 'w'), separators=(',', ':'))
json.dump(outline, open(os.path.join(OUT, 'logo_outline_shape.json'), 'w'), separators=(',', ':'))
glow(mask, os.path.join(OUT, 'logo_glow.png'), pad_ratio=0.25)
print('wordmark shapes:', len(letters['shapes']), 'outline shapes:', len(outline['shapes']))

# 2. QR module grid (Core Image's QR has a 1-module quiet zone; it is dropped here, the plate gives the margin)
qr = np.array(Image.open(os.path.join(PUBLIC, 'textures', 'whatsapp_qr.png')).convert('L')) < 128
ys, xs = np.where(qr)
qr = qr[ys.min():ys.max() + 1, xs.min():xs.max() + 1]
# module size = the finder pattern's width / 7
row = qr[0]
finder_w = np.argmin(row) if not row.all() else len(row)
cell = finder_w / 7
n = round(qr.shape[0] / cell)
grid = np.array([[qr[int((r + 0.5) * cell), int((c + 0.5) * cell)] for c in range(n)] for r in range(n)])
runs = []
for r in range(n):
    c = 0
    while c < n:
        if grid[r, c]:
            s = c
            while c < n and grid[r, c]:
                c += 1
            runs.append([r, s, c - s])
        else:
            c += 1
json.dump({'size': n, 'runs': runs}, open(os.path.join(OUT, 'whatsapp_qr.json'), 'w'), separators=(',', ':'))
print('qr modules:', n, 'x', n, 'runs:', len(runs))
