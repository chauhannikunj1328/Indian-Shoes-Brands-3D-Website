"""Shared helpers: trace a logo PNG (transparent background) into vector outlines for a 3D extrusion.

Output JSON format (read by Store.jsx):
  {"width": 1, "height": h/w, "shapes": [{"outer": [[x, y], ...], "holes": [[[x, y], ...], ...]}, ...]}
Coordinates are normalised so the logo is 1 unit wide and centred on (0, 0), y up.

(scipy is avoided on purpose: Pillow filters + numpy + contourpy are enough.)
"""
import numpy as np
from contourpy import contour_generator
from PIL import Image, ImageFilter


def _img(a):
    return Image.fromarray((np.clip(a, 0, 1) * 255).astype(np.uint8))


def blur(a, radius):
    return np.array(_img(a).filter(ImageFilter.GaussianBlur(radius))).astype(float) / 255


def load_mask(path, trace_w=1600):
    """Alpha mask of the logo, cropped to its bounds and resized to `trace_w` px wide (0..1)."""
    a = np.array(Image.open(path).convert('RGBA'))[..., 3].astype(float) / 255
    ys, xs = np.where(a > 0.5)
    a = a[ys.min():ys.max() + 1, xs.min():xs.max() + 1]
    h, w = a.shape
    im = _img(a).resize((trace_w, round(trace_w * h / w)), Image.LANCZOS)
    return np.array(im).astype(float) / 255


def _rdp(pts, eps):
    if len(pts) < 3:
        return pts
    a, b = pts[0], pts[-1]
    ab = b - a
    n = np.hypot(*ab) or 1e-9
    d = np.abs(ab[0] * (pts[:, 1] - a[1]) - ab[1] * (pts[:, 0] - a[0])) / n
    i = int(np.argmax(d))
    if d[i] > eps:
        return np.vstack([_rdp(pts[: i + 1], eps)[:-1], _rdp(pts[i:], eps)])
    return np.vstack([a, b])


def _rdp_closed(pts, eps):
    if np.allclose(pts[0], pts[-1]):
        pts = pts[:-1]
    k = int(np.argmax(np.hypot(*(pts - pts[0]).T)))
    first = _rdp(pts[: k + 1], eps)
    second = _rdp(np.vstack([pts[k:], pts[:1]]), eps)
    return np.vstack([first[:-1], second[:-1]])


def _area(p):
    x, y = p[:, 0], p[:, 1]
    return 0.5 * (np.dot(x, np.roll(y, -1)) - np.dot(y, np.roll(x, -1)))


def _inside(pt, poly):
    x, y = pt
    xs, ys = poly[:, 0], poly[:, 1]
    xj, yj = np.roll(xs, 1), np.roll(ys, 1)
    cross = ((ys > y) != (yj > y)) & (x < (xj - xs) * (y - ys) / (yj - ys + 1e-12) + xs)
    return np.count_nonzero(cross) % 2 == 1


def glow(mask, out_path, pad_ratio=0.25, rgb=(232, 240, 255), spread=0.035):
    """Soft halo texture around the logo (logo centred, padded by pad_ratio of its width each side)."""
    h, w = mask.shape
    pad = int(w * pad_ratio)
    m = np.pad(mask, pad)
    g = np.array(_img(m).filter(ImageFilter.MaxFilter(9))).astype(float) / 255
    g = blur(g, w * spread)
    g = np.clip(g / g.max() * 1.15, 0, 1) ** 1.2
    rgba = np.zeros(g.shape + (4,), np.uint8)
    rgba[..., :3] = rgb
    rgba[..., 3] = (g * 255).astype(np.uint8)
    Image.fromarray(rgba, 'RGBA').resize((1024, round(1024 * g.shape[0] / g.shape[1])), Image.LANCZOS).save(out_path)


def trace(mask, pad=4, smooth=0.8, level=0.5, eps=0.6, min_area=30):
    """Trace a mask into nested outlines. A wider blur + lower level traces a grown (outset) version."""
    trace_w = mask.shape[1]
    z = blur(np.pad(mask, pad), smooth)
    loops = [l for l in contour_generator(z=z).lines(level) if len(l) > 8]
    polys = []
    for l in loops:
        p = _rdp_closed(np.asarray(l), eps)
        if len(p) >= 3 and abs(_area(p)) > min_area:
            polys.append(p)
    polys.sort(key=lambda p: -abs(_area(p)))
    parent, depth = [None] * len(polys), [0] * len(polys)
    for i, p in enumerate(polys):
        for j in range(i - 1, -1, -1):
            if _inside(p[0], polys[j]):
                parent[i], depth[i] = j, depth[j] + 1
                break
    h, w = z.shape
    norm = lambda p: [[round((x - w / 2) / trace_w, 5), round(-(y - h / 2) / trace_w, 5)] for x, y in p]
    shapes = {}
    for i, p in enumerate(polys):
        if depth[i] % 2 == 0:
            shapes[i] = {'outer': norm(p), 'holes': []}
    for i, p in enumerate(polys):
        if depth[i] % 2 == 1 and parent[i] in shapes:
            shapes[parent[i]]['holes'].append(norm(p))
    return {'width': 1, 'height': round(mask.shape[0] / trace_w, 5), 'shapes': list(shapes.values())}
