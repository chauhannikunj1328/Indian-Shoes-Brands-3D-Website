"""Gully Labs area assets, styled after gullylabs.com and their flagship store ("Baithak", Panchsheel, Delhi):
  - white stucco facade with Gully blue (#003BD0) flowing dashed "stitch" lines and blue pointed-leaf
    (ogee) shapes with white stitching -> the logo block and the bay side walls
  - blue signboard with a white गलीLABS logo -> traced logo for a raised 3D sign
  - गL monogram + "Hand Lasted Indian Sneakers" strip -> top of the bay back wall

Sources (saved in assets/gullylabs/brand/): Gully Labs' white logo and गL monogram from gullylabs.com.

Run:  python3 store/scripts/make-gully-assets.py
Out:  store/public/brands/gullylabs/{logo_shape.json, facade.jpg, bay_tagline.png}
"""
import json
import math
import os
import sys

import numpy as np
from PIL import Image, ImageDraw, ImageFont

sys.path.insert(0, os.path.dirname(__file__))
from logo_trace import glow, load_mask, trace  # noqa: E402

HERE = os.path.dirname(__file__)
SRC = os.path.join(HERE, '..', '..', 'assets', 'gullylabs', 'brand')
OUT = os.path.join(HERE, '..', 'public', 'brands', 'gullylabs')
BLUE = (0, 59, 208)  # Gully blue, from gullylabs.com (--color-base-highlight)
STUCCO = (243, 242, 238)
rng = np.random.default_rng(5)


def font(size, bold=True):
    for f in ['/System/Library/Fonts/HelveticaNeue.ttc', '/System/Library/Fonts/Helvetica.ttc']:
        if os.path.exists(f):
            return ImageFont.truetype(f, size, index=1 if bold else 0)  # index 1 = Bold
    return ImageFont.load_default()


def stucco(w, h):
    """Rough white plaster, like the flagship facade."""
    n = rng.standard_normal((h // 4, w // 4))
    n = np.array(Image.fromarray(((n * 0.5 + 0.5).clip(0, 1) * 255).astype(np.uint8)).resize((w, h), Image.BICUBIC)) / 255
    fine = rng.standard_normal((h, w)) * 0.5 + 0.5
    v = 0.6 * n + 0.4 * fine
    rgb = np.array(STUCCO)[None, None, :] / 255 * (0.975 + 0.045 * (v[..., None] - 0.5))
    return Image.fromarray((rgb.clip(0, 1) * 255).astype(np.uint8))


def dashed(d, pts, color, width, dash, gap):
    """Draw a dashed polyline (the 'stitching')."""
    seg_left, on = dash, True
    for (x0, y0), (x1, y1) in zip(pts[:-1], pts[1:]):
        L = math.hypot(x1 - x0, y1 - y0)
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


def wave(x0, h, amp, period, phase, steps=200):
    return [(x0 + amp * math.sin(2 * math.pi * (y / period) + phase), y) for y in np.linspace(-20, h + 20, steps)]


def ogee(cx, cy, w, h, steps=80):
    """Pointed leaf / ogee shape (like the big blue shapes on the facade)."""
    pts = []
    for t in np.linspace(0, math.pi, steps):
        pts.append((cx + (w / 2) * math.sin(t) ** 1.3, cy - h / 2 + h * (1 - math.cos(t)) / 2))
    for t in np.linspace(math.pi, 0, steps):
        pts.append((cx - (w / 2) * math.sin(t) ** 1.3, cy - h / 2 + h * (1 - math.cos(t)) / 2))
    return pts


def facade(W=2500, H=2000):
    """10 x 8 world-unit wall face (250 px per unit). Seamless left-right so faces can share it."""
    S = 2
    im = stucco(W, H).resize((W * S, H * S))
    d = ImageDraw.Draw(im)
    lw, dash, gap = 9 * S, 46 * S, 26 * S
    # big blue ogee shapes with white stitching through them
    shapes = [(0.22, 0.30, 0.20, 0.55), (0.62, 0.58, 0.22, 0.62), (0.95, 0.25, 0.16, 0.42), (-0.05, 0.25, 0.16, 0.42)]
    for fx, fy, fw, fh in shapes:
        poly = ogee(fx * W * S, fy * H * S, fw * W * S, fh * H * S)
        d.polygon(poly, fill=BLUE)
    # flowing stitch lines: blue on white, white where they cross the blue shapes
    blue_mask = Image.new('L', im.size, 0)
    md = ImageDraw.Draw(blue_mask)
    for fx, fy, fw, fh in shapes:
        md.polygon(ogee(fx * W * S, fy * H * S, fw * W * S, fh * H * S), fill=255)
    lines_blue = Image.new('RGBA', im.size, (0, 0, 0, 0))
    lines_white = Image.new('RGBA', im.size, (0, 0, 0, 0))
    lb, lwh = ImageDraw.Draw(lines_blue), ImageDraw.Draw(lines_white)
    n = 14
    for i in range(n):
        x0 = (i + 0.5) / n * W * S
        pts = wave(x0, H * S, amp=55 * S * (0.6 + 0.4 * math.sin(i)), period=(900 + 140 * (i % 3)) * S, phase=i * 0.9)
        dashed(lb, pts, BLUE + (255,), lw, dash, gap)
        dashed(lwh, pts, (255, 255, 255, 255), lw, dash, gap)
    m = np.array(blue_mask) > 0
    a_blue = np.array(lines_blue)
    a_white = np.array(lines_white)
    a_blue[m, 3] = 0
    a_white[~m, 3] = 0
    im = im.convert('RGBA')
    im.alpha_composite(Image.fromarray(a_blue))
    im.alpha_composite(Image.fromarray(a_white))
    im.convert('RGB').resize((W, H), Image.LANCZOS).save(os.path.join(OUT, 'facade.jpg'), quality=90)


def facade_blue(W=2500, H=2000):
    """The flagship facade, blue-dominant (the user's pick): wide blue pointed-leaf panels with white
    stitching cover most of the wall; narrow white stucco gaps between them carry blue stitching."""
    S = 2
    im = stucco(W, H).resize((W * S, H * S))
    d = ImageDraw.Draw(im)
    # 4 tall blue ogee panels, alternately shifted up/down like the facade, almost touching
    shapes = [(0.125, 0.47, 0.27, 1.02), (0.375, 0.56, 0.27, 1.02), (0.625, 0.44, 0.27, 1.02), (0.875, 0.55, 0.27, 1.02),
              (-0.125, 0.53, 0.27, 1.02), (1.125, 0.47, 0.27, 1.02)]  # partial shapes at the edges
    blue_mask = Image.new('L', im.size, 0)
    md = ImageDraw.Draw(blue_mask)
    for fx, fy, fw, fh in shapes:
        poly = ogee(fx * W * S, fy * H * S, fw * W * S, fh * H * S)
        d.polygon(poly, fill=BLUE)
        md.polygon(poly, fill=255)
    # stitch lines: white on the blue panels, blue on the white gaps
    lines_blue = Image.new('RGBA', im.size, (0, 0, 0, 0))
    lines_white = Image.new('RGBA', im.size, (0, 0, 0, 0))
    lb, lwh = ImageDraw.Draw(lines_blue), ImageDraw.Draw(lines_white)
    lw, dash, gap = 9 * S, 46 * S, 26 * S
    n = 16
    for i in range(n):
        x0 = (i + 0.5) / n * W * S
        pts = wave(x0, H * S, amp=50 * S * (0.6 + 0.4 * math.sin(i)), period=(950 + 140 * (i % 3)) * S, phase=i * 0.9)
        dashed(lb, pts, BLUE + (255,), lw, dash, gap)
        dashed(lwh, pts, (255, 255, 255, 255), lw, dash, gap)
    m = np.array(blue_mask) > 0
    a_blue, a_white = np.array(lines_blue), np.array(lines_white)
    a_blue[m, 3] = 0
    a_white[~m, 3] = 0
    im = im.convert('RGBA')
    im.alpha_composite(Image.fromarray(a_blue))
    im.alpha_composite(Image.fromarray(a_white))
    print('blue coverage: %.0f%%' % (m.mean() * 100))
    im.convert('RGB').resize((W, H), Image.LANCZOS).save(os.path.join(OUT, 'facade_blue.jpg'), quality=90)


def facade_flagship(W=2500, H=2000, windows=False):
    """Close copy of the flagship storefront wall ("Baithak", Delhi; assets/gullylabs/brand/flagship_storefront.jpg):
    five vertical white stucco fins with dark window glass between them and a concrete band across;
    the three middle fins are painted Gully blue with pointed ends and white stitching, the outer two
    are white with meandering blue stitching and a half blue lozenge. 10 x 8 world units."""
    S = 2
    w, h = W * S, H * S
    if windows:
        # windows (dark glass, lighter towards the top) behind the fins
        gy = np.linspace(0, 1, h)[:, None, None]
        glass = (np.array([92, 112, 124]) * (1 - gy) + np.array([48, 58, 66]) * gy) / 255
        glass = np.repeat(glass, w, axis=1)
        im = Image.fromarray((glass * 255).astype(np.uint8)).convert('RGBA')
        d = ImageDraw.Draw(im)
        # window mullions + concrete transom band (as on the facade)
        for fy in (0.43, 0.58):
            d.rectangle([0, fy * h, w, fy * h + 0.012 * h], fill=(30, 36, 42))
        band = stucco(w, int(0.1 * h)).convert('RGBA')
        im.alpha_composite(band, (0, int(0.455 * h)))
    else:
        # no glass: one continuous white stucco wall behind the painted fins (user's choice)
        im = stucco(w, h).convert('RGBA')
    # five fins
    fins = [(0.02, 0.17), (0.235, 0.375), (0.43, 0.57), (0.625, 0.765), (0.83, 0.98)]
    if windows:  # separate stucco fins only make sense in front of glass (no seams otherwise)
        for x0, x1 in fins:
            im.alpha_composite(stucco(int((x1 - x0) * w), h).convert('RGBA'), (int(x0 * w), 0))
    d = ImageDraw.Draw(im)
    lw, dash, gap = 9 * S, 40 * S, 24 * S

    def pointed_panel(x0, x1, top, bottom, point_top, point_bottom):
        """Blue painted panel on a fin with pointed (arch) ends."""
        cx = (x0 + x1) / 2
        pts = []
        pts.append((cx, top * h) if point_top else (x0, top * h))
        if point_top:
            pts += [(x1, (top + 0.09) * h)]
        else:
            pts += [(x1, top * h)]
        pts += [(x1, (bottom - 0.09) * h) if point_bottom else (x1, bottom * h)]
        pts += [(cx, bottom * h)] if point_bottom else []
        pts += [(x0, (bottom - 0.09) * h) if point_bottom else (x0, bottom * h)]
        if point_top:
            pts += [(x0, (top + 0.09) * h)]
        return [(px * (w if px <= 1.0 else 1), py) if px <= 1.0 else (px, py) for px, py in pts]

    blue_mask = Image.new('L', im.size, 0)
    md = ImageDraw.Draw(blue_mask)
    panels = [  # (fin index, top, bottom, pointed top, pointed bottom)
        (1, 0.10, 0.78, False, True),
        (2, 0.04, 0.85, True, True),
        (3, 0.10, 0.78, False, True),
    ]
    for fi, top, bottom, pt, pb in panels:
        x0, x1 = fins[fi]
        poly = [(px * w if px <= 1.0 else px, py) for px, py in pointed_panel(x0, x1, top, bottom, pt, pb)]
        d.polygon(poly, fill=BLUE)
        md.polygon(poly, fill=255)
    # half lozenges on the outer fins (towards the windows)
    for (x0, x1), side in ((fins[0], 1), (fins[4], -1)):
        edge = x1 if side == 1 else x0
        inner = edge - side * 0.07
        poly = [(edge * w, 0.31 * h), (inner * w, 0.43 * h), (edge * w, 0.56 * h)]
        d.polygon(poly, fill=BLUE)
        md.polygon(poly, fill=255)
    # stitching: white dashes inside the blue panels, blue meandering dashes on the white fins
    m = np.array(blue_mask) > 0
    lines_w = Image.new('RGBA', im.size, (0, 0, 0, 0))
    lines_b = Image.new('RGBA', im.size, (0, 0, 0, 0))
    dw, db = ImageDraw.Draw(lines_w), ImageDraw.Draw(lines_b)
    if windows:
        # stitching grouped per fin (the gaps between fins are glass)
        for fi, (x0, x1) in enumerate(fins):
            for j in range(3):
                xc = (x0 + (j + 0.5) / 3 * (x1 - x0)) * w
                amp = (x1 - x0) * w * (0.22 if fi in (1, 2, 3) else 0.3)
                pts = wave(xc, h, amp=amp, period=(700 + 180 * ((fi + j) % 3)) * S, phase=fi * 1.7 + j * 2.1)
                dashed(dw, pts, (255, 255, 255, 255), lw, dash, gap)
                dashed(db, pts, BLUE + (255,), lw, dash, gap)
    else:
        # continuous wall: stitch lines spread evenly across the whole width, unbroken top to bottom,
        # so there are no empty white strips between the panels
        n = 18
        for i in range(n):
            xc = (i + 0.5) / n * w
            pts = wave(xc, h, amp=0.022 * w, period=(720 + 160 * (i % 3)) * S, phase=i * 1.9)
            dashed(dw, pts, (255, 255, 255, 255), lw, dash, gap)
            dashed(db, pts, BLUE + (255,), lw, dash, gap)
    fin_mask = Image.new('L', im.size, 0)
    fd = ImageDraw.Draw(fin_mask)
    if windows:
        for x0, x1 in fins:
            fd.rectangle([x0 * w, 0, x1 * w, h], fill=255)
    else:
        fd.rectangle([0, 0, w, h], fill=255)  # stitching everywhere
    f = np.array(fin_mask) > 0
    aw, ab = np.array(lines_w), np.array(lines_b)
    aw[~m, 3] = 0
    ab[m | ~f, 3] = 0
    im.alpha_composite(Image.fromarray(ab))
    im.alpha_composite(Image.fromarray(aw))
    if windows:
        # white base band along the bottom, like the facade's plinth
        base = stucco(w, int(0.07 * h)).convert('RGBA')
        im.alpha_composite(base, (0, h - int(0.07 * h)))
    im.convert('RGB').resize((W, H), Image.LANCZOS).save(os.path.join(OUT, 'facade_flagship.jpg'), quality=90)


def block_dark(W=2500, H=2000):
    """Dark version of the facade for the logo block: deep Gully blue with tone-on-tone stitch lines
    (no ogee shapes), so the raised white logo stands out. 10 x 8 world units (250 px per unit)."""
    S = 2
    base = np.array(stucco(W, H)).astype(float) / 255  # reuse the stucco grain
    deep = np.array([14, 36, 120]) / 255  # deep Gully blue
    grain = base.mean(axis=2, keepdims=True) / (np.array(STUCCO).mean() / 255)
    rgb = np.clip(deep[None, None, :] * (0.9 + 0.2 * (grain - 1) * 6 + 0.1), 0, 1)
    im = Image.fromarray((rgb * 255).astype(np.uint8)).resize((W * S, H * S)).convert('RGBA')
    lines = Image.new('RGBA', im.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(lines)
    tone = (40, 78, 196, 255)  # slightly lighter blue: tone-on-tone stitching
    n = 9
    for i in range(n):
        x0 = (i + 0.5) / n * W * S
        pts = wave(x0, H * S, amp=40 * S, period=(1300 + 160 * (i % 3)) * S, phase=i * 1.1)
        dashed(d, pts, tone, 7 * S, 44 * S, 28 * S)
    im.alpha_composite(lines)
    im.convert('RGB').resize((W, H), Image.LANCZOS).save(os.path.join(OUT, 'block_dark.jpg'), quality=90)


def bay_sides(W=2500, H=2000):
    """Simple, calm version for the bay side walls: white stucco with a few thin, gently wavy
    stitch lines in pale Gully blue. No ogee shapes. 10 x 8 world units (250 px per unit)."""
    S = 2
    im = stucco(W, H).resize((W * S, H * S)).convert('RGBA')
    lines = Image.new('RGBA', im.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(lines)
    pale = (150, 172, 236, 255)  # Gully blue at roughly 40% on white
    n = 5
    for i in range(n):
        x0 = (i + 0.5) / n * W * S
        pts = wave(x0, H * S, amp=28 * S, period=1700 * S, phase=i * 1.3)
        dashed(d, pts, pale, 5 * S, 40 * S, 28 * S)
    im.alpha_composite(lines)
    im.convert('RGB').resize((W, H), Image.LANCZOS).save(os.path.join(OUT, 'bay_sides.jpg'), quality=90)


def tagline(W=3000, H=144):
    """Transparent strip for the top of the bay back wall: गL monogram + tagline in Gully blue."""
    S = 2
    im = Image.new('RGBA', (W * S, H * S), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    band = H * S
    f = font(int(band * 0.30))
    text = 'HAND LASTED INDIAN SNEAKERS'
    tw = d.textlength(text, font=f)
    mono = Image.open(os.path.join(SRC, 'gl_monogram_black.png')).convert('RGBA')
    bb = mono.getbbox()
    mono = mono.crop(bb)
    mh = int(band * 0.46)
    mono = mono.resize((int(mono.width * mh / mono.height), mh), Image.LANCZOS)
    a = np.array(mono)
    a[..., :3] = BLUE  # recolour the black monogram to Gully blue
    mono = Image.fromarray(a)
    gap = band * 0.35
    total = mono.width + gap + tw
    x0 = (W * S - total) / 2
    im.alpha_composite(mono, (int(x0), int((band - mh) / 2)))
    d.text((x0 + mono.width + gap, band / 2), text, font=f, fill=BLUE + (255,), anchor='lm')
    im.resize((W, H), Image.LANCZOS).save(os.path.join(OUT, 'bay_tagline.png'))


os.makedirs(OUT, exist_ok=True)
# The source logo is small (326 px); trace it upscaled with extra smoothing for clean 3D edges.
mask = load_mask(os.path.join(SRC, 'gullylabs_logo_white.png'), trace_w=1600)
logo = trace(mask, smooth=3.0, eps=0.9)
json.dump(logo, open(os.path.join(OUT, 'logo_shape.json'), 'w'), separators=(',', ':'))
# गL monogram outline (chrome badge on the 3D shoe's tongue)
mono_mask = load_mask(os.path.join(SRC, 'gl_monogram_black.png'), trace_w=900)
mono = trace(mono_mask, smooth=1.5, eps=0.8)
json.dump(mono, open(os.path.join(OUT, 'monogram_shape.json'), 'w'), separators=(',', ':'))
print('monogram shapes:', len(mono['shapes']))
# piping border (bright Gully blue ring around the white letters) + soft halo behind the logo
outline = trace(mask, pad=40, smooth=10, level=0.12, eps=0.9)
json.dump(outline, open(os.path.join(OUT, 'logo_outline_shape.json'), 'w'), separators=(',', ':'))
glow(mask, os.path.join(OUT, 'logo_glow.png'), pad_ratio=0.25, rgb=(225, 235, 255))
facade()
# plain white stucco (same surface as the bay walls, no stitch lines) for the CTA wall
stucco(2500, 2000).save(os.path.join(OUT, 'stucco_plain.jpg'), quality=90)
facade_blue()
facade_flagship()
block_dark()
bay_sides()
tagline()
print('logo shapes:', len(logo['shapes']), 'holes:', sum(len(s['holes']) for s in logo['shapes']),
      'aspect h/w:', logo['height'])
