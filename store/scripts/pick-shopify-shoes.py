"""Pick shoes from a Shopify store's products.json and download their side-view studio photos, ready for
make-shoe-cutouts.py (same input layout as the Comet / Gully Labs shelves).

Input:  a products.json saved from https://<shop>/products.json?limit=250
Output: assets/<brand>/<wall>/list.json + <handle>.jpg   for the 4 walls (women_wall, women_back, men_back, men_right)
        (12 shoes each: 24 women + 24 men, in stock, at most MAX_PER_MODEL colours of one model)

Run:  python3 store/scripts/pick-shopify-shoes.py neemans /path/products.json https://neemans.com [handle,handle,...  to skip]
Then: python3 store/scripts/make-shoe-cutouts.py neemans women_wall   (x4 walls)
"""
import io
import json
import os
import re
import sys
import urllib.request

import numpy as np
from PIL import Image

ROOT = os.path.join(os.path.dirname(__file__), '..', '..')
WALLS = [('women_wall', 'women'), ('women_back', 'women'), ('men_back', 'men'), ('men_right', 'men')]
PER_WALL = 12
# one-gender brands: PICK_WALLS='men_a:men,men_b:men,men_c:men,men_d:men'
if os.environ.get('PICK_WALLS'):
    WALLS = [tuple(w.split(':')) for w in os.environ['PICK_WALLS'].split(',')]
MAX_PER_MODEL = 2
TYPES = {'sneakers', 'sneaker', 'slip on', 'shoes', 'shoe', 'casual shoes', 'running shoes'}


def gender(p):
    t = (p['title'] + ' ' + p.get('product_type', '')).lower()
    tags = ' '.join(p.get('tags', [])).lower() if isinstance(p.get('tags'), list) else str(p.get('tags', '')).lower()
    if 'women' in t or 'women' in tags:
        return 'women'
    if re.search(r'\bmen\b', t) or re.search(r'\bmen\b', tags):
        return 'men'
    return None


def model_key(p):
    # "Adaptis Sneakers For Men : Ivory" -> "adaptis sneakers"
    t = re.split(r'\bfor (men|women)\b|[:\-–]', p['title'], flags=re.I)[0]
    return re.sub(r'\s+', ' ', t).strip().lower()


def fetch(url):
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    return urllib.request.urlopen(req, timeout=60).read()


def clean_studio(im):
    """True if the picture is a shoe on a plain, even backdrop (no lifestyle scene, no text panel)."""
    a = np.asarray(im.convert('RGB').resize((400, 250))).astype(float)
    border = np.concatenate([a[:8].reshape(-1, 3), a[-8:].reshape(-1, 3), a[:, :8].reshape(-1, 3), a[:, -8:].reshape(-1, 3)])
    return border.std(0).max() < 14 and 1.3 < im.width / im.height < 2.2


def main(brand, products_json, site, exclude=''):
    skip = set(filter(None, exclude.split(',')))
    products = json.load(open(products_json))['products']
    pool = {'women': [], 'men': []}
    seen = {}
    for p in products:
        g = gender(p)
        if p['handle'] in skip:
            continue
        if not g or p.get('product_type', '').lower() not in TYPES or not any(v.get('available') for v in p['variants']):
            continue
        k = (g, model_key(p))
        if seen.get(k, 0) >= MAX_PER_MODEL:
            continue
        pool[g].append(p)
        seen[k] = seen.get(k, 0) + 1
    print({g: len(v) for g, v in pool.items()})
    for wall, g in WALLS:
        out = os.path.join(ROOT, 'assets', brand, wall)
        os.makedirs(out, exist_ok=True)
        items = []
        while pool[g] and len(items) < PER_WALL:
            p = pool[g].pop(0)
            chosen = None
            for img in p['images'][:6]:
                try:
                    im = Image.open(io.BytesIO(fetch(img['src'])))
                except Exception as e:  # noqa: BLE001
                    print('  fetch failed', p['handle'], e)
                    continue
                if clean_studio(im):
                    chosen = im
                    break
            if chosen is None:
                print('  no clean studio shot, skipping', p['handle'])
                continue
            chosen.convert('RGB').save(os.path.join(out, p['handle'] + '.jpg'), quality=92)
            items.append({'handle': p['handle'], 'title': re.sub(r'\s+', ' ', p['title']).strip(), 'type': p['product_type'],
                          'price_inr': int(float(p['variants'][0]['price'])), 'url': f"{site}/products/{p['handle']}"})
            print(wall, p['handle'])
        json.dump(items, open(os.path.join(out, 'list.json'), 'w'), indent=1)


if __name__ == '__main__':
    main(*sys.argv[1:5])
