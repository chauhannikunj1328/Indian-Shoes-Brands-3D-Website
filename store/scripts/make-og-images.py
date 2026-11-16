"""Social share cards (1200x630) for the home page and each brand: public/og/<name>.jpg

The card shows the IndianShoes wordmark, a headline and six of the brand's real shoe cut-outs.
Run:  python3 store/scripts/make-og-images.py
"""
import json
import os

from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.join(os.path.dirname(__file__), '..')
PUB = os.path.join(ROOT, 'public')
OUT = os.path.join(PUB, 'og')
W, H = 1200, 630
BG = (244, 244, 242)
INK = (20, 20, 20)
BLUE = (29, 79, 201)

BRANDS = [  # id, name, accent colour, pretty line under the name
    ('neemans', 'Neemans', (34, 34, 34), 'Comfort sneakers and slip-ons in 3D'),
    ('comet', 'Comet', (235, 239, 41), 'Aeres, Apex, Astra, Aeon and X Lows in 3D'),
    ('gullylabs', 'Gully Labs', BLUE, 'Hand-lasted Indian sneakers in 3D'),
    ('bondstreet', 'Bond Street', BLUE, 'Everyday casual sneakers in 3D'),
]


def font(size, bold=True):
    for f in ['/System/Library/Fonts/HelveticaNeue.ttc', '/System/Library/Fonts/Helvetica.ttc']:
        if os.path.exists(f):
            return ImageFont.truetype(f, size, index=1 if bold else 0)
    return ImageFont.load_default()


def shoes_of(brand, n, skip=0):
    """n varied shoes of a brand: spread over the lineup, never two of the same model (first two words of the title)."""
    items = []
    for wall in ('women_wall', 'women_back', 'men_back', 'men_right', 'men_a', 'men_b', 'men_c', 'men_d'):
        p = os.path.join(PUB, 'brands', brand, wall + '.json')
        if os.path.exists(p):
            items += json.load(open(p))
    seen, out = set(), []
    step = max(1, len(items) // (n + skip + 2))
    for i in range(0, len(items), step):
        key = ' '.join(items[i]['title'].lower().split()[:2])
        if key in seen:
            continue
        seen.add(key)
        out.append(items[i])
    for it in items:  # not enough distinct models: top up with other styles
        if len(out) >= skip + n:
            break
        if it not in out:
            out.append(it)
    return out[skip:skip + n]


def paste_fit(card, path, box):
    im = Image.open(path).convert('RGBA')
    x0, y0, x1, y1 = box
    im.thumbnail((x1 - x0, y1 - y0), Image.LANCZOS)
    card.alpha_composite(im, (x0 + (x1 - x0 - im.width) // 2, y0 + (y1 - y0 - im.height) // 2))


def wrap(draw, text, fnt, width):
    lines, cur = [], ''
    for w in text.split():
        t = (cur + ' ' + w).strip()
        if draw.textlength(t, font=fnt) <= width:
            cur = t
        else:
            lines.append(cur)
            cur = w
    return lines + [cur]


def card(name, headline, sub, shoes):
    c = Image.new('RGBA', (W, H), BG + (255,))
    d = ImageDraw.Draw(c)
    # soft panel behind the shoes
    d.rounded_rectangle((610, 48, 1156, 582), radius=36, fill=(255, 255, 255, 255))
    wm = Image.open(os.path.join(PUB, 'brands', 'indianshoes', 'wordmark.png')).convert('RGBA')
    wm.thumbnail((300, 70), Image.LANCZOS)
    c.alpha_composite(wm, (56, 56))
    f_big, f_sub, f_small = font(66), font(30, False), font(26)
    y = 190
    for ln in wrap(d, headline, f_big, 500):
        d.text((56, y), ln, font=f_big, fill=INK)
        y += 78
    y += 10
    for ln in wrap(d, sub, f_sub, 500):
        d.text((56, y), ln, font=f_sub, fill=(80, 80, 78))
        y += 40
    d.rounded_rectangle((56, 528, 56 + 8, 566), radius=4, fill=BLUE)
    d.text((78, 530), 'theindianshoes.com', font=f_small, fill=INK)
    cells = [(626, 66, 880, 238), (886, 66, 1140, 238), (626, 248, 880, 420), (886, 248, 1140, 420), (626, 430, 880, 570), (886, 430, 1140, 570)]
    for it, box in zip(shoes, cells):
        paste_fit(c, os.path.join(PUB, it['image'].lstrip('/')), box)
    c.convert('RGB').save(os.path.join(OUT, name + '.jpg'), quality=88, optimize=True)


os.makedirs(OUT, exist_ok=True)
mix = [shoes_of(b[0], 2) for b in BRANDS]  # one from each brand first, then a second from the first two
home = [m[0] for m in mix] + [mix[0][1], mix[1][1]]
card('home', "Walk through India's sneaker brands in 3D", 'Neemans, Comet, Gully Labs and Bond Street in one 3D store.', home)
for bid, name, _, line in BRANDS:
    card(bid, f'{name} sneakers', line + ' on IndianShoes.', shoes_of(bid, 6))
print(sorted(os.listdir(OUT)))
