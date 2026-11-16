"""Bond Street shelf shoes: one clean, level, transparent PNG per product.

Bond Street's product photos are 2000x2000 marketing shots. Photo 2 of most products is a white layout with a big
top-down shoe (upper left), a second shoe angled ~30 degrees (lower right, with a floor shadow) and a logo (top right).
This cuts out ONLY that second shoe: the two shoes are split by eroding the "not white" mask, GrabCut (OpenCV) refines
the lower-right shoe's edge, the floor shadow is removed, and the cut-out is rotated so its sole is level.

Needs OpenCV (not a project dependency):  python3 -m venv /tmp/v && /tmp/v/bin/pip install opencv-python-headless pillow
Run:  /tmp/v/bin/python store/scripts/make-bondstreet-cutouts.py [limit]
Input:  assets/bondstreet/products-rows.json  (rows = [handle, title, price_inr, [image file names]])
Output: store/public/brands/bondstreet/<wall>/<handle>.png + <wall>.json (4 walls x 12 shoes)
"""
import io
import json
import os
import sys
import urllib.request

import cv2
import numpy as np
from PIL import Image

ROOT = os.path.join(os.path.dirname(__file__), '..', '..')
OUT = os.path.join(ROOT, 'store', 'public', 'brands', 'bondstreet')
WALLS = ['men_a', 'men_b', 'men_c', 'men_d']
PER_WALL = 12
W = 1000  # working size
# products whose cut-out was checked by eye and rejected (a stacked pair / a wrongly levelled high-top)
EXCLUDE = {'mens-black-white-casual-sneakers', 'mens-white-blue-pu-upper-casual-sneakers'}


K3 = np.ones((3, 3), np.uint8)


def dilate(m, it):
    return cv2.dilate(m.astype(np.uint8), K3, iterations=it) > 0


def label(m):
    n, lab = cv2.connectedComponents(m.astype(np.uint8), connectivity=8)
    return lab, n - 1


def fill_holes(m):
    m8 = m.astype(np.uint8)
    h, w = m8.shape
    ff = np.zeros((h + 2, w + 2), np.uint8)
    inv = m8.copy()
    cv2.floodFill(inv, ff, (0, 0), 2)  # outside background becomes 2; enclosed holes stay 0
    return (inv != 2)



def fetch(url):
    data = urllib.request.urlopen(urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'}), timeout=60).read()
    return np.array(Image.open(io.BytesIO(data)).convert('RGB'))


def white_layout(a):
    s = cv2.resize(a, (200, 200), interpolation=cv2.INTER_AREA).astype(float)
    b = np.concatenate([s[:6].reshape(-1, 3), s[-6:].reshape(-1, 3), s[:, :6].reshape(-1, 3), s[:, -6:].reshape(-1, 3)])
    return b.mean() > 243 and b.std(0).max() < 10


def cut_side_shoe(full):
    """full: 2000x2000 RGB white layout. Returns an RGBA float crop of the lower-right shoe (level), or None."""
    img = cv2.resize(full, (W, W), interpolation=cv2.INTER_AREA)
    diff = np.sqrt(((img.astype(float) - 255) ** 2).sum(-1))
    # "ink": anything clearly not the white backdrop (it is 255, but some photos have a faint glow of a few levels).
    ink = (diff > 8).astype(np.uint8)
    ink[:int(W * 0.30), int(W * 0.58):] = 0  # the logo, top right
    ink = cv2.morphologyEx(ink, cv2.MORPH_CLOSE, np.ones((5, 5), np.uint8))
    # split touching shoes: erode hard, label, keep the lower-right blob as foreground seed
    core = cv2.erode(ink, np.ones((15, 15), np.uint8))
    lab, n = label(core)
    if n == 0:
        return None
    best, score = 0, -1
    for i in range(1, n + 1):
        ys, xs = np.where(lab == i)
        if len(ys) < 4000:
            continue
        s = xs.mean() + 1.2 * ys.mean()
        if s > score:
            best, score = i, s
    if not best:
        return None
    fg_seed = lab == best
    other = (lab > 0) & ~fg_seed
    # GrabCut: sure FG = lower-right core, sure BG = other shoe's core (dilated) + far white, unknown = rest of the ink
    mask = np.full((W, W), cv2.GC_BGD, np.uint8)
    mask[dilate(ink > 0, 14)] = cv2.GC_PR_BGD
    mask[ink > 0] = cv2.GC_PR_FGD
    mask[dilate(other, 10)] = cv2.GC_BGD
    mask[fg_seed] = cv2.GC_FGD
    bg = np.zeros((1, 65), np.float64)
    fg = np.zeros((1, 65), np.float64)
    cv2.grabCut(img, mask, None, bg, fg, 4, cv2.GC_INIT_WITH_MASK)
    m = ((mask == cv2.GC_FGD) | (mask == cv2.GC_PR_FGD)).astype(np.uint8)
    lab2, n2 = label(m)
    if n2 == 0:
        return None
    hit = lab2[fg_seed & (lab2 > 0)]
    if not len(hit):
        return None
    # keep only the component that holds the seed
    keep = lab2 == np.bincount(hit).argmax()
    keep = fill_holes(keep)
    # GrabCut loses white midsoles that sit on the white backdrop, so the shoe itself is taken from the "not pure white"
    # mask (this shoe only: nearest to its seed, not the other shoe's). GrabCut's lower edge is used as the guide that
    # keeps the soft floor shadow below the sole out.
    d_fg = cv2.distanceTransform((~fg_seed).astype(np.uint8), cv2.DIST_L2, 5)
    d_ot = cv2.distanceTransform((~other).astype(np.uint8), cv2.DIST_L2, 5) if other.any() else np.full((W, W), 1e9, np.float32)
    whole = fill_holes(cv2.morphologyEx(ink, cv2.MORPH_CLOSE, np.ones((5, 5), np.uint8)) > 0) & (d_fg <= d_ot)
    lw, nw = label(whole)
    hit = lw[fg_seed & (lw > 0)]
    if not len(hit):
        return None
    whole = lw == np.bincount(hit).argmax()
    bottom = np.full(W, -1)
    for x in np.where(keep.any(0))[0]:
        bottom[x] = np.where(keep[:, x])[0].max()
    yy = np.arange(W)[:, None]
    keep = fill_holes(whole & (yy <= bottom[None, :] + 4) & (bottom[None, :] >= 0))
    # ---- level the shoe and cut off the floor shadow, geometrically ----
    # The soft shadow is a faint, smooth band hanging below the sole; colour can't tell it from white sole rubber.
    # But the shoe body is thick and the band is thin, so a big opening ("body") drops the band. The body gives the
    # true angle and the true sole line; the full shoe is then kept only above that line.
    area = float(keep.sum())
    k = int(0.26 * np.sqrt(area)) | 1
    disk = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (k, k))
    body = cv2.morphologyEx(keep.astype(np.uint8), cv2.MORPH_OPEN, disk) > 0
    if not body.any():
        body = keep.copy()
    lb, nb = label(body)
    body = lb == (np.bincount(lb[lb > 0]).argmax())
    rgba = np.dstack([img.astype(np.float32), cv2.GaussianBlur(keep.astype(np.float32), (0, 0), 1.0) * 255])
    bodyf = body.astype(np.float32) * 255

    def warp(M):
        a = cv2.warpAffine(rgba, M, (2 * W, 2 * W), flags=cv2.INTER_CUBIC, borderValue=(255, 255, 255, 0))
        b = cv2.warpAffine(bodyf, M, (2 * W, 2 * W), flags=cv2.INTER_LINEAR, borderValue=0) > 127
        return a, b

    ys, xs = np.where(body)
    cx, cy = float(xs.mean()), float(ys.mean())
    mu20, mu02, mu11 = ((xs - cx) ** 2).mean(), ((ys - cy) ** 2).mean(), ((xs - cx) * (ys - cy)).mean()
    axis = 0.5 * np.degrees(np.arctan2(2 * mu11, mu20 - mu02))
    shift = np.array([[1, 0, W / 2], [0, 1, W / 2]], np.float64)
    pick = None
    for ang in (axis, -axis):  # the principal axis is unambiguous; the sign is picked by which is wider
        M = cv2.getRotationMatrix2D((cx, cy), float(ang), 1.0)
        M[:, 2] += shift[:, 2]
        a, b = warp(M)
        yy_, xx_ = np.where(b)
        if not len(yy_):
            continue
        wh = (xx_.max() - xx_.min() + 1) / (yy_.max() - yy_.min() + 1)
        if pick is None or wh > pick[0]:
            pick = (wh, ang, a, b)
    if pick is None:
        return None
    _, total, rot, rbody = pick

    def lower_outline(b):
        edge = b & ~(cv2.erode(b.astype(np.uint8), K3) > 0)
        ys_, xs_ = np.where(edge)
        keep_ = ys_ > ys_.mean()
        return xs_[keep_].astype(float), ys_[keep_].astype(float)

    def level_score(px, py, theta, c):
        """peak of the lower outline's height histogram after turning it by theta degrees about c (higher = flatter)"""
        t = np.radians(theta)
        yr = -np.sin(t) * (px - c[0]) + np.cos(t) * (py - c[1])
        h, e = np.histogram(yr, bins=np.arange(yr.min() - 1, yr.max() + 3, 2.0))
        return h.max(), 0.5 * (e[h.argmax()] + e[h.argmax() + 1])

    # second pass: turn the body so the dominant flat edge of its underside (the sole) is exactly level
    px, py = lower_outline(rbody)
    ys2, xs2 = np.where(rbody)
    c2 = (float(xs2.mean()), float(ys2.mean()))
    cand = np.arange(-20.0, 20.5, 0.5)
    sc = np.array([level_score(px, py, th, c2)[0] for th in cand])
    ok = np.where(sc >= sc.max() * 0.98)[0]  # among near-ties prefer the smallest turn
    th = float(cand[ok[np.abs(cand[ok]).argmin()]])
    best = None
    for ang in (th, -th):
        M2 = cv2.getRotationMatrix2D(c2, float(ang), 1.0)
        b2 = cv2.warpAffine(rbody.astype(np.float32) * 255, M2, (2 * W, 2 * W), flags=cv2.INTER_LINEAR, borderValue=0) > 127
        qx, qy = lower_outline(b2)
        score = level_score(qx, qy, 0.0, (0.0, 0.0))
        if best is None or score[0] > best[0]:
            best = (score[0], ang, M2, b2, score[1])
    _, ang2, M2, rbody, sole_level = best
    rot = cv2.warpAffine(rot, M2, (2 * W, 2 * W), flags=cv2.INTER_CUBIC, borderValue=(255, 255, 255, 0))
    total += ang2
    # cut at the sole: everything below it is floor shadow
    alpha_r = rot[..., 3] > 25
    sole_y = float(sole_level) + 10
    yy = np.arange(2 * W)[:, None]
    final = alpha_r & (yy <= sole_y)
    final = fill_holes(final)
    lf, nf = label(final)
    if nf == 0:
        return None
    final = lf == (np.bincount(lf[lf > 0]).argmax())
    rot[..., 3] = cv2.GaussianBlur(final.astype(np.float32), (0, 0), 1.2) * 255
    ys, xs = np.where(final)
    pad = 6
    box = (max(0, xs.min() - pad), max(0, ys.min() - pad), min(2 * W, xs.max() + pad), min(2 * W, ys.max() + pad))
    out = rot[box[1]:box[3], box[0]:box[2]]
    return np.clip(out, 0, 255).astype(np.uint8), total


def main(limit=None, out_dir=None):
    data = json.load(open(os.path.join(ROOT, 'assets', 'bondstreet', 'products-rows.json')))
    items = []
    for h, title, price, imgs in data['rows']:
        if h in EXCLUDE:
            continue
        if limit and len(items) >= limit:
            break
        res = None
        for n in imgs:
            try:
                a = fetch(data['cdn'] + n)
            except Exception as e:  # noqa: BLE001
                print('  fetch failed', h, e)
                continue
            if white_layout(a):
                res = cut_side_shoe(a)
                if res is not None:
                    break
        if res is None:
            print('  skipped (no clean second-shoe cut)', h)
            continue
        rgba, ang = res
        asp = rgba.shape[1] / rgba.shape[0]
        if not 1.2 < asp < 3.2:
            print('  odd aspect, skipped', h, round(asp, 2))
            continue
        items.append({'handle': h, 'title': title, 'type': 'Sneakers', 'price_inr': price, 'aspect': round(asp, 3),
                      'url': f"{data['site']}/products/{h}", '_img': rgba})
        print(len(items), h, round(asp, 2), 'rotated', round(ang, 1))
    out = out_dir or OUT
    # spread the shoes evenly over the 4 walls (at most PER_WALL each)
    n = min(len(items), PER_WALL * len(WALLS))
    sizes = [n // len(WALLS) + (1 if i < n % len(WALLS) else 0) for i in range(len(WALLS))]
    start = 0
    for w, wall in enumerate(WALLS):
        part = items[start:start + sizes[w]]
        start += sizes[w]
        os.makedirs(os.path.join(out, wall), exist_ok=True)
        lst = []
        for it in part:
            im = Image.fromarray(it['_img'], 'RGBA')
            if im.width > 480:
                im = im.resize((480, round(im.height * 480 / im.width)), Image.LANCZOS)
            im.save(os.path.join(out, wall, it['handle'] + '.png'))
            lst.append({**{k: v for k, v in it.items() if k != '_img'}, 'image': f"/brands/bondstreet/{wall}/{it['handle']}.png"})
        json.dump(lst, open(os.path.join(out, wall + '.json'), 'w'), indent=1)
    return items


if __name__ == '__main__':
    main(int(sys.argv[1]) if len(sys.argv) > 1 else None, sys.argv[2] if len(sys.argv) > 2 else None)
