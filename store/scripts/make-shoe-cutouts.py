"""Cut shoe product photos out of their plain studio background (transparent PNG), for the bay shelves.

Input:  assets/<brand>/<wall>/list.json (handle, title, type, price_inr, image) + <handle>.jpg photos
Output: store/public/brands/<brand>/<wall>/<handle>.png  (cropped, transparent)
        store/public/brands/<brand>/<wall>.json           (shelf list, in order: row by row, left to right)

Run:  python3 store/scripts/make-shoe-cutouts.py comet women_wall
"""
import json
import os
import sys

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

HERE = os.path.dirname(__file__)
ROOT = os.path.join(HERE, '..', '..')


def cutout(path, threshold=22):
    im = Image.open(path).convert('RGB')
    a = np.asarray(im).astype(float)
    h, w, _ = a.shape
    border = np.concatenate([a[:6].reshape(-1, 3), a[-6:].reshape(-1, 3), a[:, :6].reshape(-1, 3), a[:, -6:].reshape(-1, 3)])
    bg = np.median(border, axis=0)
    diff = np.sqrt(((a - bg) ** 2).sum(-1))
    # soft-ish shadows on the floor are close to the background; the shoe is clearly different
    hard = (diff > threshold).astype(np.uint8) * 255
    m = Image.fromarray(hard).filter(ImageFilter.MaxFilter(5)).filter(ImageFilter.MinFilter(5))
    # background = everything connected to the border; the rest (incl. holes in the shoe) is the shoe
    pad = Image.new('L', (w + 2, h + 2), 0)
    pad.paste(m, (1, 1))
    ImageDraw.floodfill(pad, (0, 0), 128)
    shoe = (np.asarray(pad)[1:-1, 1:-1] != 128)
    # keep only the biggest horizontal band of rows (drops stray text like "Designer Special")
    rows = shoe.sum(1) > 2
    best, cur, start = (0, 0, 0), 0, 0
    for y in range(h + 1):
        if y < h and rows[y]:
            if cur == 0:
                start = y
            cur += 1
        elif cur:
            mass = shoe[start:y].sum()
            if mass > best[0]:
                best = (mass, start, y)
            cur = 0
    keep = np.zeros_like(shoe)
    keep[best[1]:best[2]] = shoe[best[1]:best[2]]
    alpha = Image.fromarray((keep * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(1.2))
    rgba = im.convert('RGBA')
    rgba.putalpha(alpha)
    ys, xs = np.where(keep)
    pad_px = 6
    box = (max(0, xs.min() - pad_px), max(0, ys.min() - pad_px), min(w, xs.max() + pad_px), min(h, ys.max() + pad_px))
    out = rgba.crop(box)
    if out.width > 900:
        out = out.resize((900, round(out.height * 900 / out.width)), Image.LANCZOS)
    return out


# how different from the backdrop a pixel must be to count as shoe (Gully's grey studio floor has stronger shadows)
THRESHOLD = {'comet': 22, 'gullylabs': 34}


def main(brand, wall):
    src = os.path.join(ROOT, 'assets', brand, wall)
    out_dir = os.path.join(ROOT, 'store', 'public', 'brands', brand, wall)
    os.makedirs(out_dir, exist_ok=True)
    items = json.load(open(os.path.join(src, 'list.json')))
    shelf = []
    for it in items:
        img = cutout(os.path.join(src, it['handle'] + '.jpg'), THRESHOLD.get(brand, 22))
        img.save(os.path.join(out_dir, it['handle'] + '.png'))
        shelf.append({**{k: it[k] for k in ('handle', 'title', 'type', 'price_inr')},
                      'image': f"/brands/{brand}/{wall}/{it['handle']}.png",
                      'aspect': round(img.width / img.height, 3),
                      # optional real 3D model (GLB) + flip, kept from list.json
                      **{k: it[k] for k in ('model', 'modelFlip') if k in it},
                      'url': {'comet': 'https://www.wearcomet.com', 'gullylabs': 'https://gullylabs.com'}.get(brand, '') + f"/products/{it['handle']}"})
        print(it['handle'], img.size)
    json.dump(shelf, open(os.path.join(ROOT, 'store', 'public', 'brands', brand, wall + '.json'), 'w'), indent=1)


if __name__ == '__main__':
    main(*sys.argv[1:3])
