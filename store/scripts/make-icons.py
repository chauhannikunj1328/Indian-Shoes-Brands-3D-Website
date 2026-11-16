"""Favicon / app-icon set for IndianShoes: a white sneaker on black.

Run:  python3 store/scripts/make-icons.py      (needs PyMuPDF "fitz" and Pillow)
Out:  store/public/{favicon.svg, favicon.ico, favicon-16.png, favicon-32.png, favicon-48.png,
                    apple-touch-icon.png, icon-192.png, icon-512.png, icon-maskable-512.png}
"""
import io
import os

import fitz
from PIL import Image

OUT = os.path.join(os.path.dirname(__file__), '..', 'public')
BLUE = '#111111'

# 64x64 artwork: a low sneaker in side view (toe on the right), laces cut out in the brand blue
SHOE = (
    '<g transform="translate(-5.6 -5.95) scale(1.17)">'
    '<path fill="#fff" d="M11 44V27.5c0-2.6 1.9-4.5 4.5-4.5h6.2c1 0 1.9.4 2.6 1.1l3 3.1c.5.5 1.2.8 1.9.8h2.6'
    'c7.4 0 13.9 3.4 18.2 9.4l1.7 2.4c.6.8.9 1.8.9 2.8V44a3 3 0 0 1-3 3H14a3 3 0 0 1-3-3Z"/>'
    '<path fill="none" stroke="%s" stroke-width="2.2" stroke-linecap="round" d="M28 31.5l4.2 4.4M32.5 30.5l4.2 4.6M37 31l3.6 4"/>'
    '<path fill="%s" d="M11 40.2h43v2.2H11z" opacity=".22"/>'
    '</g>'
) % (BLUE, BLUE)


def svg(radius=14, pad=0.0):
    s = 64 * (1 - 2 * pad)
    o = 64 * pad
    art = SHOE if pad == 0 else f'<g transform="translate({o} {o}) scale({s / 64})">{SHOE}</g>'
    bg = f'<rect width="64" height="64" rx="{radius}" fill="{BLUE}"/>'
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64">{bg}{art}</svg>'


def png(svg_text, size):
    doc = fitz.open(stream=svg_text.encode(), filetype='svg')
    pg = doc[0]
    pix = pg.get_pixmap(matrix=fitz.Matrix(size / pg.rect.width, size / pg.rect.height), alpha=True)
    return Image.open(io.BytesIO(pix.tobytes('png'))).convert('RGBA')


rounded = svg(14)
open(os.path.join(OUT, 'favicon.svg'), 'w').write(rounded)
for n in (16, 32, 48):
    png(rounded, n).save(os.path.join(OUT, f'favicon-{n}.png'))
png(rounded, 64).save(os.path.join(OUT, 'favicon.ico'), format='ICO', sizes=[(16, 16), (32, 32), (48, 48)])
png(svg(0), 180).convert('RGB').save(os.path.join(OUT, 'apple-touch-icon.png'))  # iOS rounds the corners itself
png(rounded, 192).save(os.path.join(OUT, 'icon-192.png'))
png(rounded, 512).save(os.path.join(OUT, 'icon-512.png'))
png(svg(0, pad=0.14), 512).convert('RGB').save(os.path.join(OUT, 'icon-maskable-512.png'))  # safe zone for Android masks
print('icons written to', os.path.abspath(OUT))
