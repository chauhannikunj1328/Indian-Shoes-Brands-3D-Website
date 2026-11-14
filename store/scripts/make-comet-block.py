"""COMET logo block assets, modelled on Comet's real store signage (wearcomet.com store locator):
white raised logo on a charcoal textured-concrete wall, halo-lit from behind.

Source: Comet's official logo from wearcomet.com/pages/comets-brand-assets
        (saved as assets/comet/brand/comet_logo_with_shooting_star_black.png)

Run:  python3 store/scripts/make-comet-block.py
Out:  store/public/brands/comet/logo_shape.json  - traced vector outlines (letters + star), for a 3D extrusion
      store/public/brands/comet/logo_glow.png    - soft halo that glows on the wall behind the logo
      store/public/brands/comet/block_concrete.jpg - seamless charcoal textured-concrete finish
"""
import json
import os

import numpy as np
from contourpy import contour_generator
from PIL import Image, ImageFilter

# (scipy is avoided on purpose: Pillow filters + numpy are enough and have fewer install issues)


def _to_img(a):
    return Image.fromarray((np.clip(a, 0, 1) * 255).astype(np.uint8))


def blur(a, radius):
    return np.array(_to_img(a).filter(ImageFilter.GaussianBlur(radius))).astype(float) / 255


def grow(a, size):
    return np.array(_to_img(a).filter(ImageFilter.MaxFilter(size))).astype(float) / 255


def wrap_blur(a, sigma):
    """Gaussian blur that wraps around the edges (keeps textures seamless)."""
    f = np.fft.fftfreq(a.shape[0])
    k = np.exp(-2 * (np.pi * sigma) ** 2 * (f[:, None] ** 2 + f[None, :] ** 2))
    return np.real(np.fft.ifft2(np.fft.fft2(a) * k))

HERE = os.path.dirname(__file__)
SRC = os.path.join(HERE, '..', '..', 'assets', 'comet', 'brand', 'comet_logo_with_shooting_star_black.png')
OUT = os.path.join(HERE, '..', 'public', 'brands', 'comet')
TRACE_W = 1600  # trace resolution (px across the logo)
GLOW_PAD = 0.25  # glow texture extends this fraction of the logo width beyond it on each side


def load_mask():
    a = np.array(Image.open(SRC).convert('RGBA'))[..., 3].astype(float) / 255
    ys, xs = np.where(a > 0.5)
    a = a[ys.min():ys.max() + 1, xs.min():xs.max() + 1]
    h, w = a.shape
    im = Image.fromarray((a * 255).astype(np.uint8)).resize((TRACE_W, round(TRACE_W * h / w)), Image.LANCZOS)
    return np.array(im).astype(float) / 255


def rdp(pts, eps):
    """Ramer-Douglas-Peucker line simplification."""
    if len(pts) < 3:
        return pts
    a, b = pts[0], pts[-1]
    ab = b - a
    n = np.hypot(*ab) or 1e-9
    d = np.abs(ab[0] * (pts[:, 1] - a[1]) - ab[1] * (pts[:, 0] - a[0])) / n
    i = int(np.argmax(d))
    if d[i] > eps:
        return np.vstack([rdp(pts[: i + 1], eps)[:-1], rdp(pts[i:], eps)])
    return np.vstack([a, b])


def rdp_closed(pts, eps):
    """Simplify a closed loop: split it at the point farthest from the start, simplify both halves."""
    if np.allclose(pts[0], pts[-1]):
        pts = pts[:-1]
    k = int(np.argmax(np.hypot(*(pts - pts[0]).T)))
    first = rdp(pts[: k + 1], eps)
    second = rdp(np.vstack([pts[k:], pts[:1]]), eps)
    return np.vstack([first[:-1], second[:-1]])  # no repeated end point


def area(p):
    x, y = p[:, 0], p[:, 1]
    return 0.5 * (np.dot(x, np.roll(y, -1)) - np.dot(y, np.roll(x, -1)))


def inside(pt, poly):
    x, y = pt
    xs, ys = poly[:, 0], poly[:, 1]
    xj, yj = np.roll(xs, 1), np.roll(ys, 1)
    cross = ((ys > y) != (yj > y)) & (x < (xj - xs) * (y - ys) / (yj - ys + 1e-12) + xs)
    return np.count_nonzero(cross) % 2 == 1


def trace(mask, pad=4, smooth=0.8, level=0.5):
    """Trace the logo into vector outlines. A lower `level` on a wider blur traces a grown
    (outset) version of the logo with rounded corners, used for the piping border."""
    z = blur(np.pad(mask, pad), smooth)  # pad so every outline closes; smoothing
    loops = [l for l in contour_generator(z=z).lines(level) if len(l) > 8]
    polys = []
    for l in loops:
        p = rdp_closed(np.asarray(l), 0.6)
        if len(p) >= 3 and abs(area(p)) > 30:
            polys.append(p)
    polys.sort(key=lambda p: -abs(area(p)))
    # nesting depth decides outer (even) vs hole (odd); a hole belongs to its smallest container
    parent, depth = [None] * len(polys), [0] * len(polys)
    for i, p in enumerate(polys):
        for j in range(i - 1, -1, -1):
            if inside(p[0], polys[j]):
                parent[i], depth[i] = j, depth[j] + 1
                break
    h, w = z.shape
    norm = lambda p: [[round((x - w / 2) / TRACE_W, 5), round(-(y - h / 2) / TRACE_W, 5)] for x, y in p]
    shapes = {}
    for i, p in enumerate(polys):
        if depth[i] % 2 == 0:
            shapes[i] = {'outer': norm(p), 'holes': []}
    for i, p in enumerate(polys):
        if depth[i] % 2 == 1:
            shapes[parent[i]]['holes'].append(norm(p))
    return {'width': 1, 'height': round(mask.shape[0] / TRACE_W, 5), 'shapes': list(shapes.values())}


def glow(mask):
    h, w = mask.shape
    pad = int(w * GLOW_PAD)
    m = np.pad(mask, pad)
    g = blur(grow(m, 9), w * 0.035)
    g = np.clip(g / g.max() * 1.15, 0, 1) ** 1.2
    rgba = np.zeros(g.shape + (4,), np.uint8)
    rgba[..., :3] = (232, 240, 255)  # cool white, like LED halo lighting
    rgba[..., 3] = (g * 255).astype(np.uint8)
    Image.fromarray(rgba, 'RGBA').resize((1024, round(1024 * g.shape[0] / g.shape[1])), Image.LANCZOS).save(
        os.path.join(OUT, 'logo_glow.png'))


def tinted_concrete(name, rgb_hex, size=1024):
    """Same seamless concrete grain, tinted to a colour (e.g. royal dark blue for the Comet block)."""
    rng = np.random.default_rng(3)

    def noise(scale):
        f = np.fft.fftfreq(size)
        r = np.hypot(*np.meshgrid(f, f))
        n = np.real(np.fft.ifft2(np.fft.fft2(rng.standard_normal((size, size))) * np.exp(-(r * scale) ** 2)))
        return n / np.abs(n).max()

    v = 0.5 * noise(220) + 0.3 * noise(50) + 0.2 * noise(4)
    pits = (rng.random((size, size)) > 0.9975).astype(float)
    pits = wrap_blur(pits, 1.2)
    col = np.array([int(rgb_hex[i:i + 2], 16) for i in (1, 3, 5)]) / 255
    value = 1 + 0.16 * v - 0.55 * pits / (pits.max() or 1)
    rgb = np.clip(value[..., None] * col[None, None, :], 0, 1)
    Image.fromarray((rgb * 255).astype(np.uint8)).save(os.path.join(OUT, name), quality=90)


def concrete(size=1024):
    rng = np.random.default_rng(3)

    def noise(scale):
        f = np.fft.fftfreq(size)
        r = np.hypot(*np.meshgrid(f, f))
        n = np.real(np.fft.ifft2(np.fft.fft2(rng.standard_normal((size, size))) * np.exp(-(r * scale) ** 2)))
        return n / np.abs(n).max()

    v = 0.5 * noise(220) + 0.3 * noise(50) + 0.2 * noise(4)  # clouds + grain, tileable
    pits = (rng.random((size, size)) > 0.9975).astype(float)
    pits = wrap_blur(pits, 1.2)
    base = 0.30 + 0.045 * v - 0.25 * pits / (pits.max() or 1)  # charcoal grey, like Comet's store walls
    rgb = np.clip(base[..., None] * np.array([1.0, 1.0, 1.02]), 0, 1)
    Image.fromarray((rgb * 255).astype(np.uint8)).save(os.path.join(OUT, 'block_concrete.jpg'), quality=90)


os.makedirs(OUT, exist_ok=True)
mask = load_mask()
data = trace(mask)
json.dump(data, open(os.path.join(OUT, 'logo_shape.json'), 'w'), separators=(',', ':'))
# piping border (like the navy piping around the star panel on Comet's Ajrakh shoe):
# the same logo grown outward by ~1.2% of its width, rounded corners
outline = trace(mask, pad=40, smooth=10, level=0.12)
json.dump(outline, open(os.path.join(OUT, 'logo_outline_shape.json'), 'w'), separators=(',', ':'))
print('outline shapes:', len(outline['shapes']), 'holes:', sum(len(s['holes']) for s in outline['shapes']))
data['glowPad'] = GLOW_PAD
glow(mask)
concrete()
# royal dark blue = the logo's navy piping colour (outlineColor in brands.js), matching the Ajrakh indigo
tinted_concrete('block_concrete_blue.jpg', '#2C4466')
print('shapes:', len(data['shapes']), 'holes:', sum(len(s['holes']) for s in data['shapes']),
      'points:', sum(len(s['outer']) + sum(map(len, s['holes'])) for s in data['shapes']),
      'aspect h/w:', data['height'])
