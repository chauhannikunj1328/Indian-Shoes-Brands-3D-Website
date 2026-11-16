"""Block + bay theme graphics for Neemans (terracotta knit) and Bond Street (royal blue speed sweeps + pinstripes),
the same level of design as the Comet and Gully Labs bays.

Run:  python3 store/scripts/make-neemans-bondstreet-theme.py
Out:  store/public/brands/neemans/{knit_front.jpg, knit_bump.png, bay_knit.jpg, bay_tagline.png}
      store/public/brands/bondstreet/{front_sweep.jpg, bay_pinstripe.jpg, bay_tagline.png}
"""
import math
import os
import shutil

from PIL import Image, ImageChops, ImageDraw, ImageFilter, ImageFont

HERE = os.path.dirname(__file__)
OUT = os.path.join(HERE, '..', 'public', 'brands')
SS = 2  # supersampling


def hexrgb(h):
    h = h.lstrip('#')
    return tuple(int(h[i : i + 2], 16) for i in (0, 2, 4))


# ---------------------------------------------------------------- knit (seamless V-stitch rows)
def knit(size, cols, rows, base, mid, hi, sh, noise=10, bump=False):
    W = size * SS
    cw, ch = W / cols, W / rows
    img = Image.new('RGB', (W, W), hexrgb(sh) if not bump else (0, 0, 0))
    d = ImageDraw.Draw(img)

    def legs(x0, y0):
        # a V: two legs meeting at the bottom centre, slightly overlapping the stitch below
        return [((x0 + cw * 0.12, y0), (x0 + cw * 0.5, y0 + ch * 0.98)), ((x0 + cw * 0.88, y0), (x0 + cw * 0.5, y0 + ch * 0.98))]

    def draw_all(color, lw, ox=0.0, oy=0.0):
        for r in range(rows):
            for c in range(cols):
                for a, b in legs(c * cw + ox, r * ch + oy):
                    for dx in (-W, 0, W):
                        for dy in (-W, 0, W):
                            p, q = (a[0] + dx, a[1] + dy), (b[0] + dx, b[1] + dy)
                            if max(p[0], q[0]) < -cw or min(p[0], q[0]) > W + cw or max(p[1], q[1]) < -ch or min(p[1], q[1]) > W + ch:
                                continue
                            d.line([p, q], fill=color, width=int(lw))
                            d.ellipse([p[0] - lw / 2, p[1] - lw / 2, p[0] + lw / 2, p[1] + lw / 2], fill=color)
                            d.ellipse([q[0] - lw / 2, q[1] - lw / 2, q[0] + lw / 2, q[1] + lw / 2], fill=color)

    lw = cw * 0.34
    if bump:
        draw_all((255, 255, 255), lw)
        img = img.filter(ImageFilter.GaussianBlur(SS * 1.6)).convert('L')
    else:
        draw_all(hexrgb(sh), lw * 1.15, ox=cw * 0.03, oy=ch * 0.05)  # soft shadow under each leg
        draw_all(hexrgb(mid), lw)
        draw_all(hexrgb(hi), lw * 0.38, ox=-cw * 0.03, oy=-ch * 0.02)  # light catching the top of the yarn
        img = img.filter(ImageFilter.GaussianBlur(SS * 0.5))
    img = img.resize((size, size), Image.LANCZOS)
    if not bump and noise:
        n = Image.effect_noise((size, size), noise).convert('RGB')
        img = ImageChops.add(img, n, scale=1.0, offset=-128)
    return img


# ---------------------------------------------------------------- tagline strips (3000 x 144, centred)
def font_try(paths, size):
    for p, idx in paths:
        try:
            return ImageFont.truetype(p, size, index=idx)
        except Exception:
            continue
    return ImageFont.load_default()


def tagline(path, text, color, icon, italic=False):
    W, H = 3000, 144
    img = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    f = font_try([('/System/Library/Fonts/Supplemental/Arial Black.ttf', 0)], 62)
    txt = Image.new('RGBA', (1600, H), (0, 0, 0, 0))
    td = ImageDraw.Draw(txt)
    td.text((0, 28), text, font=f, fill=color)
    bb = txt.getbbox()
    txt = txt.crop(bb)
    if italic:
        sh = 0.28
        txt = txt.transform((txt.width + int(txt.height * sh), txt.height), Image.AFFINE, (1, sh, -txt.height * sh, 0, 1, 0), Image.BICUBIC)
    ico = icon(H, color)
    gap = 56
    total = ico.width + gap + txt.width
    x = (W - total) // 2
    img.alpha_composite(ico, (x, (H - ico.height) // 2))
    img.alpha_composite(txt, (x + ico.width + gap, (H - txt.height) // 2))
    img.save(path)


def leaf_icon(h, color):
    s = 3
    sz = 78
    im = Image.new('RGBA', (sz * s, sz * s), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    pts = []
    for i in range(0, 41):  # outline of a leaf: two arcs from the stem tip to the leaf tip
        t = i / 40
        pts.append((sz * s * (0.12 + 0.76 * t), sz * s * (0.88 - 0.76 * t) - math.sin(t * math.pi) * sz * s * 0.34))
    for i in range(40, -1, -1):
        t = i / 40
        pts.append((sz * s * (0.12 + 0.76 * t), sz * s * (0.88 - 0.76 * t) + math.sin(t * math.pi) * sz * s * 0.34))
    d.polygon(pts, fill=color)
    # midrib
    d.line([(sz * s * 0.12, sz * s * 0.88), (sz * s * 0.82, sz * s * 0.18)], fill=(255, 255, 255, 0), width=1)
    d.line([(sz * s * 0.04, sz * s * 0.96), (sz * s * 0.2, sz * s * 0.8)], fill=color, width=int(s * 5))
    return im.resize((sz, sz), Image.LANCZOS)


def slashes_icon(h, color):
    sz = 100
    s = 3
    im = Image.new('RGBA', (sz * s, sz * s), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    for i, wd in enumerate((14, 14, 14)):
        x = (10 + i * 22) * s
        d.polygon([(x + 22 * s, 8 * s), (x + 22 * s + wd * s * 0.9, 8 * s), (x + wd * s * 0.9, 70 * s), (x, 70 * s)], fill=color)
    return im.resize((sz, sz), Image.LANCZOS)


# ---------------------------------------------------------------- Bond Street graphics
def sweep_front(path):
    """Royal-blue block face with a few wide italic speed sweeps (the logo is slanted) and a thin white pinstripe."""
    W, H = 2500, 2000
    base = hexrgb('#1f3a9e')
    img = Image.new('RGB', (W, H), base)
    over = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(over)
    slant = 0.36  # x shift per unit of height
    def band(x_left, width, rgba):
        d.polygon([(x_left, H), (x_left + width, H), (x_left + width + slant * H, 0), (x_left + slant * H, 0)], fill=rgba)
    band(-300, 520, (42, 75, 184, 255))
    band(430, 130, (255, 255, 255, 38))
    band(640, 70, (255, 255, 255, 26))
    band(1250, 640, (20, 42, 120, 120))
    band(1980, 160, (255, 255, 255, 30))
    over = over.filter(ImageFilter.GaussianBlur(1.2))
    img = Image.alpha_composite(img.convert('RGBA'), over).convert('RGB')
    # thin white pinstrip frame, like the stitched frames on the other blocks
    d2 = ImageDraw.Draw(img)
    m = 90
    d2.rectangle([m, m, W - m, H - m], outline=(255, 255, 255), width=5)
    img.save(path, quality=92)


def pinstripe(path, size=1024):
    """White wall with very faint blue steep-diagonal pinstripes (tiles seamlessly: slope 1:4)."""
    img = Image.new('RGB', (size, size), hexrgb('#f6f8fc'))
    d = ImageDraw.Draw(img)
    period = 128
    for k in range(-8, size // period + 8):
        for dy in (-size, 0, size):
            x0 = k * period
            d.line([(x0, dy), (x0 + size / 4, dy + size)], fill=hexrgb('#e3e9f6'), width=3)
    n = Image.effect_noise((size, size), 3).convert('RGB')
    img = ImageChops.add(img, n, scale=1.0, offset=-128)
    img.save(path, quality=92)


if __name__ == '__main__':
    n = os.path.join(OUT, 'neemans')
    knit(1024, 14, 20, '#b4502f', '#bf5b38', '#d98760', '#8c3a1f').save(os.path.join(n, 'knit_front.jpg'), quality=92)
    knit(1024, 14, 20, '#b4502f', '#bf5b38', '#d98760', '#8c3a1f', bump=True).save(os.path.join(n, 'knit_bump.png'))
    knit(1024, 26, 36, '#efe8da', '#f1ebdf', '#faf6ec', '#e2d8c4', noise=4).save(os.path.join(n, 'bay_knit.jpg'), quality=92)
    tagline(os.path.join(n, 'bay_tagline.png'), 'LIGHTER ON THE PLANET', hexrgb('#b4502f') + (255,), leaf_icon)

    b = os.path.join(OUT, 'bondstreet')
    sweep_front(os.path.join(b, 'front_sweep.jpg'))
    pinstripe(os.path.join(b, 'bay_pinstripe.jpg'))
    tagline(os.path.join(b, 'bay_tagline.png'), 'COMFORT WITH EVERY STEP', hexrgb('#1f3a9e') + (255,), slashes_icon, italic=True)
    print('ok')
