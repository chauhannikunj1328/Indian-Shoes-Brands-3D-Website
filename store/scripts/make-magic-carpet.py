"""Gully Labs logo block, themed on their bestseller "Gully Number 001 - Magic Carpet"
(gullylabs.com/products/gully-number-001-magic-carpet, photos in assets/gullylabs/magic_carpet/):
  cream leather + beige canvas upper, blue embroidered swoosh, blue stitch outlines, red laces,
  and a red Persian-carpet print insole.

  carpet_tile.png  seamless red carpet field (insole print) - also used inside the 3D shoe
  mc_front.jpg     block front: a "magic carpet" rug hung on cream leather, blue stitch frame
  mc_side.jpg      block sides: the shoe's side panel - canvas, leather overlays, blue swoosh

Run:  python3 store/scripts/make-magic-carpet.py
"""
import math
import os

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

HERE = os.path.dirname(__file__)
OUT = os.path.join(HERE, '..', 'public', 'brands', 'gullylabs')

LEATHER = (240, 233, 214)  # off-white / antique cream leather
CANVAS = (233, 214, 178)  # beige canvas
BLUE = (29, 79, 201)  # embroidered swoosh / stitching blue
NAVY = (27, 42, 110)
RED = (196, 56, 32)  # carpet ground
RED_DK = (150, 34, 26)
CREAM = (244, 232, 205)
PINK = (226, 140, 130)
GREEN = (70, 110, 80)
rng = np.random.default_rng(7)

S = 2  # supersample factor for anti-aliasing


def grain(w, h, base, amount=0.03, scale=3):
    n = rng.standard_normal((h // scale, w // scale))
    n = np.array(Image.fromarray(((n * 0.5 + 0.5).clip(0, 1) * 255).astype(np.uint8)).resize((w, h), Image.BICUBIC)) / 255
    fine = rng.standard_normal((h, w)) * 0.5 + 0.5
    v = 0.6 * n + 0.4 * fine
    rgb = np.array(base)[None, None, :] / 255 * (1 - amount / 2 + amount * v[..., None])
    return Image.fromarray((rgb.clip(0, 1) * 255).astype(np.uint8))


def canvas_weave(w, h, base):
    """Fine woven canvas texture."""
    y, x = np.mgrid[0:h, 0:w]
    weave = 0.5 + 0.25 * np.sin(x * 1.3) * np.sin(y * 1.3) + 0.25 * np.sin((x + y) * 0.9)
    img = np.array(grain(w, h, base, 0.04), dtype=float) / 255
    img *= (0.97 + 0.05 * weave[..., None])
    return Image.fromarray((img.clip(0, 1) * 255).astype(np.uint8))


def dashed(d, pts, color, width, dash, gap):
    seg_left, on = dash, True
    for (x0, y0), (x1, y1) in zip(pts[:-1], pts[1:]):
        L = math.hypot(x1 - x0, y1 - y0)
        if L == 0:
            continue
        t = 0
        while t < L:
            step = min(seg_left, L - t)
            if on:
                a = (x0 + (x1 - x0) * t / L, y0 + (y1 - y0) * t / L)
                b = (x0 + (x1 - x0) * (t + step) / L, y0 + (y1 - y0) * (t + step) / L)
                d.line([a, b], fill=color, width=width)
            t += step
            seg_left -= step
            if seg_left <= 1e-6:
                on = not on
                seg_left = dash if on else gap


def rect_pts(x0, y0, x1, y1):
    return [(x0, y0), (x1, y0), (x1, y1), (x0, y1), (x0, y0)]


# ---------- carpet ----------
def motif(d, cx, cy, s, palette):
    """Small Persian 'tree of life' / flower motif inside a lattice diamond."""
    a, b, c = palette
    # stem
    d.line([(cx, cy - s * 0.75), (cx, cy + s * 0.7)], fill=a, width=max(2, int(s * 0.09)))
    # paired leaves up the stem
    for k, yy in enumerate(np.linspace(-0.45, 0.45, 4)):
        lw = s * (0.42 - 0.06 * k)
        for side in (-1, 1):
            x = cx + side * lw * 0.55
            y = cy + yy * s
            d.ellipse([x - lw * 0.32, y - s * 0.09, x + lw * 0.32, y + s * 0.09], fill=b if k % 2 else a)
    # flower on top
    r = s * 0.17
    d.ellipse([cx - r, cy - s * 0.85 - r, cx + r, cy - s * 0.85 + r], fill=c)
    d.ellipse([cx - r * 0.45, cy - s * 0.85 - r * 0.45, cx + r * 0.45, cy - s * 0.85 + r * 0.45], fill=a)
    # base
    d.rectangle([cx - s * 0.28, cy + s * 0.68, cx + s * 0.28, cy + s * 0.78], fill=a)


def carpet_field(w, h, cell):
    """Diamond-lattice carpet field. Seamless when w, h are multiples of cell."""
    img = grain(w, h, RED, 0.08, 2)
    d = ImageDraw.Draw(img)
    palettes = [(NAVY, CREAM, PINK), (NAVY, GREEN, CREAM), (CREAM, NAVY, PINK)]
    lw = max(3, cell // 16)
    # lattice lines (wrap around for seamlessness)
    for k in range(-w // cell - 2, (w + h) // cell + 3):
        x = k * cell
        for dx in (-w, 0, w):
            d.line([(x + dx, 0), (x + dx + h, h)], fill=RED_DK, width=lw)
            d.line([(x + dx, h), (x + dx + h, 0)], fill=RED_DK, width=lw)
    # small cream dots on the lattice crossings
    for iy in range(0, h // (cell // 2) + 2):
        for ix in range(0, w // cell + 2):
            x = ix * cell + (cell / 2 if iy % 2 else 0)
            y = iy * cell / 2
            for dx in (-w, 0, w):
                for dy in (-h, 0, h):
                    r = cell * 0.05
                    d.ellipse([x + dx - r, y + dy - r, x + dx + r, y + dy + r], fill=CREAM)
    # motifs in the diamond centres
    for iy in range(0, h // (cell // 2) + 1):
        for ix in range(0, w // cell + 1):
            x = ix * cell + (0 if iy % 2 else cell / 2)
            y = iy * cell / 2
            pal = palettes[(ix + iy) % 3]
            for dx in (-w, 0, w):
                for dy in (-h, 0, h):
                    motif(d, x + dx, y + dy, cell * 0.36, pal)
    return img


def rug(w, h):
    """Hung rug: borders + carpet field, with fringe top and bottom."""
    fringe = int(h * 0.05)
    body_h = h - 2 * fringe
    img = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    body = Image.new('RGB', (w, body_h), NAVY)
    d = ImageDraw.Draw(body)
    m = min(w, body_h)
    b1 = int(m * 0.07)  # outer navy band width
    # outer band: navy with cream + red rosettes
    step = b1 * 1.0
    for edge in range(4):
        n = int(((w if edge < 2 else body_h) - b1) / step)
        for i in range(n + 1):
            t = b1 / 2 + i * step
            x, y = [(t, b1 / 2), (t, body_h - b1 / 2), (b1 / 2, t), (w - b1 / 2, t)][edge]
            r = b1 * 0.3
            d.polygon([(x, y - r), (x + r, y), (x, y + r), (x - r, y)], fill=CREAM)
            d.ellipse([x - r * 0.45, y - r * 0.45, x + r * 0.45, y + r * 0.45], fill=RED)
    # guard stripes
    g = int(m * 0.012)
    d.rectangle([b1, b1, w - b1, body_h - b1], fill=CREAM)
    d.rectangle([b1 + g, b1 + g, w - b1 - g, body_h - b1 - g], fill=RED_DK)
    inner = b1 + 2 * g
    cell = int(m * 0.22)
    field = carpet_field(w - 2 * inner, body_h - 2 * inner, cell)
    body.paste(field, (inner, inner))
    # central medallion
    cx, cy = w / 2, body_h / 2
    for r, col in [(0.2, NAVY), (0.17, CREAM), (0.15, RED), (0.09, NAVY), (0.05, PINK)]:
        R = m * r
        d.polygon([(cx, cy - R * 1.35), (cx + R, cy), (cx, cy + R * 1.35), (cx - R, cy)], fill=col)
    img.paste(body, (0, fringe))
    # fringe threads
    fd = ImageDraw.Draw(img)
    for x in np.arange(w * 0.01, w * 0.99, w / 90):
        for y0, y1 in [(0, fringe), (h - fringe, h)]:
            wob = rng.uniform(-3, 3) * S
            fd.line([(x, y0 + (y0 == 0) * rng.uniform(0, fringe * 0.25)), (x + wob, y1 - (y1 == h) * rng.uniform(0, fringe * 0.25))], fill=CREAM, width=max(2, int(w / 400)))
    return img


def stitch_frame(d, x0, y0, x1, y1, W):
    dashed(d, rect_pts(x0, y0, x1, y1), BLUE, int(W * 0.004), W * 0.016, W * 0.008)


def tick_marks(d, x, y, n, W, angle=0.0):
    """The shoe's '|||' cross stitches."""
    L = W * 0.03
    for i in range(n):
        xx = x + i * W * 0.012
        d.line([(xx, y - L / 2), (xx + math.sin(angle) * L, y + L / 2)], fill=BLUE, width=int(W * 0.005))


def front(W=2500, H=2000):
    W2, H2 = W * S, H * S
    img = grain(W2, H2, LEATHER, 0.035, 6).convert('RGBA')
    d = ImageDraw.Draw(img)
    m = W2 * 0.035
    stitch_frame(d, m, m, W2 - m, H2 - m, W2)
    # the rug, hung from a blue rod near the top
    rw, rh = int(W2 * 0.58), int(H2 * 0.8)
    rx, ry = (W2 - rw) // 2, int(H2 * 0.1)
    shadow = Image.new('RGBA', (W2, H2), (0, 0, 0, 0))
    ImageDraw.Draw(shadow).rectangle([rx + W2 * 0.01, ry + H2 * 0.03, rx + rw + W2 * 0.01, ry + rh + H2 * 0.012], fill=(60, 40, 20, 90))
    img.alpha_composite(shadow.filter(ImageFilter.GaussianBlur(W2 * 0.012)))
    img.alpha_composite(rug(rw, rh), (rx, ry))
    rod_y = ry + int(rh * 0.05) - W2 * 0.006
    d.rounded_rectangle([rx - W2 * 0.03, rod_y - W2 * 0.007, rx + rw + W2 * 0.03, rod_y + W2 * 0.007], radius=W2 * 0.007, fill=BLUE)
    # cross stitches in the corners, like the shoe
    for x, y in [(m * 2, H2 * 0.5), (W2 - m * 2 - W2 * 0.024, H2 * 0.5)]:
        tick_marks(d, x, y, 3, W2)
    return img.convert('RGB').resize((W, H), Image.LANCZOS)


def bezier(p0, p1, p2, p3, n=120):
    t = np.linspace(0, 1, n)[:, None]
    p = (1 - t) ** 3 * np.array(p0) + 3 * (1 - t) ** 2 * t * np.array(p1) + 3 * (1 - t) * t ** 2 * np.array(p2) + t ** 3 * np.array(p3)
    return [tuple(q) for q in p]


def band(d, pts, width, color, edge):
    """Thick embroidered band along a curve (swoosh), with a darker edge."""
    for (a, b) in zip(pts[:-1], pts[1:]):
        d.line([a, b], fill=edge, width=int(width * 1.15))
    for (a, b) in zip(pts[:-1], pts[1:]):
        d.line([a, b], fill=color, width=int(width))
    r = width / 2
    for p in (pts[0], pts[-1]):
        d.ellipse([p[0] - r, p[1] - r, p[0] + r, p[1] + r], fill=color)


def taper(d, pts, width):
    """Embroidered band that tapers to a point at its end, with satin-stitch texture."""
    n = len(pts)
    left, right = [], []
    for i, (x, y) in enumerate(pts):
        a, b = pts[max(0, i - 1)], pts[min(n - 1, i + 1)]
        ang = math.atan2(b[1] - a[1], b[0] - a[0]) + math.pi / 2
        t = i / (n - 1)
        wdt = width * (0.75 + 0.25 * math.sin(min(t * 4, 1) * math.pi / 2)) * (1 - t ** 3)
        left.append((x + math.cos(ang) * wdt / 2, y + math.sin(ang) * wdt / 2))
        right.append((x - math.cos(ang) * wdt / 2, y - math.sin(ang) * wdt / 2))
    poly = left + right[::-1]
    d.polygon(poly, fill=BLUE, outline=NAVY, width=max(2, int(width * 0.08)))
    for i in range(0, n - 1, 1):
        l, r = left[i], right[min(n - 1, i + 2)]
        d.line([l, r], fill=(62, 110, 225), width=max(2, int(width * 0.05)))


def side(W=2500, H=2000):
    W2, H2 = W * S, H * S
    img = canvas_weave(W2, H2, CANVAS).convert('RGBA')
    leather = grain(W2, H2, LEATHER, 0.035, 6).convert('RGBA')
    # leather overlays: heel/toe ends + bottom 'sole' band, shaped like the shoe's side panels
    mask = Image.new('L', (W2, H2), 0)
    md = ImageDraw.Draw(mask)
    md.rectangle([0, H2 * 0.8, W2, H2], fill=255)  # lower band
    md.polygon(bezier((0, 0), (W2 * 0.18, 0), (W2 * 0.26, H2 * 0.45), (W2 * 0.16, H2 * 0.82)) + [(0, H2 * 0.82)], fill=255)  # heel panel
    md.polygon([(W2, 0)] + bezier((W2 * 0.86, 0), (W2 * 0.76, H2 * 0.3), (W2 * 0.8, H2 * 0.6), (W2 * 0.7, H2 * 0.82)) + [(W2, H2 * 0.82)], fill=255)  # toe panel
    img.paste(leather, (0, 0), mask)
    d = ImageDraw.Draw(img)
    sw = int(W2 * 0.004)
    # blue stitch outlines along the panel edges
    for curve in [bezier((W2 * 0.18, 0), (W2 * 0.26, H2 * 0.45), (W2 * 0.26, H2 * 0.45), (W2 * 0.16, H2 * 0.82)),
                  bezier((W2 * 0.86, 0), (W2 * 0.76, H2 * 0.3), (W2 * 0.8, H2 * 0.6), (W2 * 0.7, H2 * 0.82)),
                  [(0, H2 * 0.8), (W2, H2 * 0.8)]]:
        off = [(x - W2 * 0.012, y) for x, y in curve] if curve[0][1] == 0 else [(x, y - H2 * 0.012) for x, y in curve]
        dashed(d, off, BLUE, sw, W2 * 0.016, W2 * 0.008)
        for a, b in zip(curve[:-1], curve[1:]):
            d.line([a, b], fill=(205, 192, 165), width=sw)
    # the big embroidered blue swoosh: two bands sweeping from the heel down to a point near the toe
    s1 = bezier((W2 * 0.07, H2 * 0.3), (W2 * 0.3, H2 * 0.36), (W2 * 0.5, H2 * 0.44), (W2 * 0.7, H2 * 0.56))
    s2 = bezier((W2 * 0.05, H2 * 0.5), (W2 * 0.28, H2 * 0.54), (W2 * 0.48, H2 * 0.58), (W2 * 0.7, H2 * 0.6))
    taper(d, s1, W2 * 0.034)
    taper(d, s2, W2 * 0.05)
    # cross stitches and toe perforations
    tick_marks(d, W2 * 0.2, H2 * 0.88, 3, W2, 0.3)
    tick_marks(d, W2 * 0.75, H2 * 0.88, 3, W2)
    for i in range(6):
        for j in range(3):
            x, y = W2 * (0.9 + 0.017 * i), H2 * (0.2 + 0.04 * j + 0.01 * i)
            r = W2 * 0.0035
            d.ellipse([x - r, y - r, x + r, y + r], fill=(190, 175, 150))
    return img.convert('RGB').resize((W, H), Image.LANCZOS)


def front_plain(W=2500, H=2000):
    """Front face without the printed rug: the rug is now a real 3D carpet hung in front (Store.jsx)."""
    W2, H2 = W * S, H * S
    img = grain(W2, H2, LEATHER, 0.035, 6)
    d = ImageDraw.Draw(img)
    m = W2 * 0.035
    stitch_frame(d, m, m, W2 - m, H2 - m, W2)
    for x, y in [(m * 2, H2 * 0.5), (W2 - m * 2 - W2 * 0.024, H2 * 0.5)]:
        tick_marks(d, x, y, 3, W2)
    return img.resize((W, H), Image.LANCZOS)


def back_wall(W=5000, H=2000, top_strip=0.12):
    """Bay back wall (20 x 8): cream leather, one thin blue stitched frame below the tagline strip."""
    img = grain(W, H, LEATHER, 0.035, 6)
    d = ImageDraw.Draw(img)
    m = H * 0.044
    # frame runs high along the top and dips down (notch) only under the centred tagline
    # (tagline text spans 36%..64% of the width - see bay_tagline.png)
    hi, lo = m, H * (top_strip + 0.02)
    n0, n1, slope = W * 0.335, W * 0.665, W * 0.025
    pts = [(m, H - m), (m, hi), (n0, hi), (n0 + slope, lo), (n1 - slope, lo), (n1, hi), (W - m, hi), (W - m, H - m), (m, H - m)]
    dashed(d, pts, BLUE, int(H * 0.005), H * 0.02, H * 0.01)
    for x in (m * 2, W - m * 2 - H * 0.03):
        for i in range(3):
            xx = x + i * H * 0.015
            d.line([(xx, H * 0.5 - H * 0.019), (xx, H * 0.5 + H * 0.019)], fill=BLUE, width=int(H * 0.006))  # same level as the side walls
    return img


def plain_leather(W=2500, H=2000):
    """Plain cream leather, no design (CTA wall)."""
    return grain(W, H, LEATHER, 0.035, 6)


def rug_body(w=1600, h=2000):
    """Just the woven rug (no fringe - the fringe is modelled as 3D threads)."""
    full = rug(w * S, int(h * S / 0.9))
    f = int(full.height * 0.05)
    body = full.crop((0, f, full.width, full.height - f)).convert('RGB')
    return body.resize((w, h), Image.LANCZOS)


# ---------- seamless material (bump) maps ----------
def fft_noise(n, beta, seed):
    """Seamless 1/f^beta noise, 0..1."""
    r = np.random.default_rng(seed)
    f = np.fft.fftfreq(n)
    fx, fy = np.meshgrid(f, f)
    k = np.sqrt(fx ** 2 + fy ** 2)
    k[0, 0] = 1
    spec = (r.standard_normal((n, n)) + 1j * r.standard_normal((n, n))) / k ** beta
    spec[0, 0] = 0
    v = np.real(np.fft.ifft2(spec))
    return (v - v.min()) / (v.max() - v.min())


def band(n, lo, hi, seed):
    r = np.random.default_rng(seed)
    f = np.fft.fftfreq(n) * n
    fx, fy = np.meshgrid(f, f)
    k = np.sqrt(fx ** 2 + fy ** 2)
    spec = (r.standard_normal((n, n)) + 1j * r.standard_normal((n, n))) * ((k > lo) & (k < hi))
    v = np.real(np.fft.ifft2(spec))
    return v / np.abs(v).max()


def save_gray(a, name):
    a = (a - a.min()) / (a.max() - a.min())
    Image.fromarray((a * 255).astype(np.uint8)).save(os.path.join(OUT, name))


def leather_bump(n=1024):
    """Pebbled leather: rounded pebbles separated by fine creases."""
    pebbles = band(n, 40, 70, 11)
    creases = 1 - np.abs(band(n, 50, 90, 12)) ** 0.5
    fine = band(n, 150, 400, 13)
    return 0.55 * (pebbles * 0.5 + 0.5) + 0.35 * creases + 0.1 * (fine * 0.5 + 0.5)


def canvas_bump(n=1024, threads=128):
    y, x = np.mgrid[0:n, 0:n] * 2 * np.pi * threads / n
    warp = np.sin(x) ** 2 * (np.sin(y / 2) > 0)
    weft = np.sin(y) ** 2 * (np.sin(y / 2) <= 0)
    over = np.where(np.sin(x / 2) * np.sin(y / 2) > 0, np.abs(np.sin(x)), np.abs(np.sin(y)))
    return 0.7 * over + 0.15 * (warp + weft) + 0.15 * (band(n, 200, 500, 14) * 0.5 + 0.5)


def rug_bump(n=1024, knots=160):
    """Hand-knotted pile: a grid of knots plus fuzzy fibre noise."""
    y, x = np.mgrid[0:n, 0:n] * 2 * np.pi * knots / n
    knot = (np.cos(x) * 0.5 + 0.5) * (np.cos(y) * 0.5 + 0.5)
    return 0.45 * knot + 0.35 * (band(n, 120, 400, 15) * 0.5 + 0.5) + 0.2 * fft_noise(n, 1.2, 16)


def satin_bump(n=512, lines=48):
    """Satin-stitch embroidery: tight diagonal threads."""
    y, x = np.mgrid[0:n, 0:n] * 2 * np.pi * lines / n
    return np.abs(np.sin((x + y) / 2)) ** 0.6 * 0.85 + 0.15 * (band(n, 100, 250, 17) * 0.5 + 0.5)


if __name__ == '__main__':
    os.makedirs(OUT, exist_ok=True)
    tile = carpet_field(1024, 1024, 256).resize((512, 512), Image.LANCZOS)
    tile.save(os.path.join(OUT, 'carpet_tile.png'))
    front().save(os.path.join(OUT, 'mc_front.jpg'), quality=90)
    side().save(os.path.join(OUT, 'mc_side.jpg'), quality=90)
    front_plain().save(os.path.join(OUT, 'mc_front_plain.jpg'), quality=90)
    rug_body(2100, 1600).save(os.path.join(OUT, 'mc_rug.jpg'), quality=92)  # 8.4 x 6.4 world units
    back_wall().save(os.path.join(OUT, 'mc_back.jpg'), quality=90)
    plain_leather().save(os.path.join(OUT, 'mc_plain.jpg'), quality=90)
    save_gray(leather_bump(), 'leather_bump.png')
    save_gray(canvas_bump(), 'canvas_bump.png')
    save_gray(rug_bump(), 'rug_bump.png')
    save_gray(satin_bump(), 'satin_bump.png')
    print('wrote carpet_tile, mc_front(_plain), mc_side, mc_rug, leather/canvas/rug/satin bump maps')
