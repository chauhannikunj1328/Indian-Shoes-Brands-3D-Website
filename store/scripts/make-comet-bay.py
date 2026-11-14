"""Comet bay wall graphics, styled after wearcomet.com — MINIMAL version.

The shoes hang on the back wall, so it stays calm: soft off-white with the Comet
comet-star as a barely-there tone-on-tone shape, and the tagline small in ink.
Brand cues kept (from the site), just quieter:
  - oversized comet star (from their banner) -> whisper-grey on off-white
  - tagline "Never Shy, Never Sorry." in a bold grotesk, near-black #1F1F1F, small
  - lavender grid-paper background -> very faint on the side walls
  - lime yellow #EBEF29 -> only the baseboard trim (set in brands.js)

Run:  python3 store/scripts/make-comet-bay.py
Out:  store/public/brands/comet/bay_back.jpg  (back wall, 20 x 8 units -> 2.5 : 1)
      store/public/brands/comet/bay_grid.png  (seamless grid tile for the side walls)
"""
import math
import os
from PIL import Image, ImageDraw, ImageFont

OUT = os.path.join(os.path.dirname(__file__), '..', 'public', 'brands', 'comet')
WALL = (245, 245, 243)  # soft off-white backdrop for the shoes
STAR = (236, 236, 233)  # whisper-grey comet star, tone on tone
INK = (31, 31, 31)
GRID = (243, 241, 249)  # much fainter than the site's #EBE7F7

FONT_CANDIDATES = [
    os.path.expanduser('~/Library/Fonts/ClashGrotesk-Bold.otf'),  # close to Comet's Space Grotesk
    '/System/Library/Fonts/HelveticaNeue.ttc',
]


def font(size):
    for f in FONT_CANDIDATES:
        if os.path.exists(f):
            return ImageFont.truetype(f, size)
    return ImageFont.load_default()


def comet_star(cx, cy, r, tail_len, tail_angle_deg, rot_deg=0, inner=0.22):
    """Comet-logo style shape: a 4-point star with a long tapered tail. Returns (star_poly, tail_poly)."""
    pts = []
    for i in range(8):
        a = math.radians(rot_deg + i * 45)
        rr = r if i % 2 == 0 else r * inner
        pts.append((cx + rr * math.cos(a), cy - rr * math.sin(a)))
    ta = math.radians(tail_angle_deg)
    tip = (cx + tail_len * math.cos(ta), cy - tail_len * math.sin(ta))
    # tail: wide at the star, sharp at the far end
    na = ta + math.pi / 2
    w = r * 0.14  # narrow enough that the tail base stays hidden inside the star arms
    tail = [(cx + w * math.cos(na), cy - w * math.sin(na)), tip, (cx - w * math.cos(na), cy + w * math.sin(na))]
    return pts, tail


def back_wall(W=3000, H=1200):
    S = 2  # supersample for smooth edges
    im = Image.new('RGB', (W * S, H * S), WALL)
    d = ImageDraw.Draw(im)

    # giant comet star, barely visible (tone on tone), bleeding off the top-right like the site banner;
    # tail runs down-left along the star's left point (angle = 180 + rot), like the logo
    star, tail = comet_star(W * S * 0.80, H * S * 0.42, H * S * 0.55, W * S * 0.95, 195, rot_deg=15)
    d.polygon(tail, fill=STAR)
    d.polygon(star, fill=STAR)

    # small tagline + comet icon near the top, ink on the wall (no colour band)
    band = int(H * S * 0.12)
    f = font(int(band * 0.34))
    text = 'Never Shy, Never Sorry.'
    tw = d.textlength(text, font=f)
    icon_r = band * 0.20
    gap = band * 0.45
    total = icon_r * 4.2 + gap + tw
    x0 = (W * S - total) / 2
    s2, t2 = comet_star(x0 + icon_r * 4.2 - icon_r, band / 2 - icon_r * 0.3, icon_r, icon_r * 4.2, 195, rot_deg=15)
    d.polygon(t2, fill=INK)
    d.polygon(s2, fill=INK)
    d.text((x0 + icon_r * 4.2 + gap, band / 2), text, font=f, fill=INK, anchor='lm')

    im = im.resize((W, H), Image.LANCZOS)
    im.save(os.path.join(OUT, 'bay_back.jpg'), quality=92)


def tagline(W=3000, H=144):
    """Transparent strip with the comet icon + tagline, laid over the back wall's grid.
    W x H matches the top 12% band of the 20 x 8 back wall (150 px per world unit)."""
    S = 2
    im = Image.new('RGBA', (W * S, H * S), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    band = H * S
    f = font(int(band * 0.34))
    text = 'Never Shy, Never Sorry.'
    tw = d.textlength(text, font=f)
    icon_r = band * 0.20
    gap = band * 0.45
    total = icon_r * 4.2 + gap + tw
    x0 = (W * S - total) / 2
    s2, t2 = comet_star(x0 + icon_r * 4.2 - icon_r, band / 2 - icon_r * 0.3, icon_r, icon_r * 4.2, 195, rot_deg=15)
    d.polygon(t2, fill=INK + (255,))
    d.polygon(s2, fill=INK + (255,))
    d.text((x0 + icon_r * 4.2 + gap, band / 2), text, font=f, fill=INK + (255,), anchor='lm')
    im.resize((W, H), Image.LANCZOS).save(os.path.join(OUT, 'bay_tagline.png'))


def grid_tile(size=512, cell=64, line=3):
    im = Image.new('RGB', (size, size), (255, 255, 255))
    d = ImageDraw.Draw(im)
    for i in range(0, size, cell):  # lines start at 0 so the tile repeats seamlessly
        d.rectangle([i, 0, i + line - 1, size], fill=GRID)
        d.rectangle([0, i, size, i + line - 1], fill=GRID)
    im.save(os.path.join(OUT, 'bay_grid.png'))


os.makedirs(OUT, exist_ok=True)
back_wall()  # older back-wall graphic (comet star + tagline); kept for reference, not used by the scene now
tagline()  # tagline overlay used on top of the grid back wall
grid_tile()
print('written to', os.path.abspath(OUT))
