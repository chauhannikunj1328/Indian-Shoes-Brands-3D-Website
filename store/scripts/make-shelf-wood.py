"""Light oak veneer for the shoe display backboards (like the wood panel in the reference store video).

Run:  python3 store/scripts/make-shelf-wood.py
Out:  store/public/textures/oak_panel.jpg  (seamless, horizontal grain)
"""
import os

import numpy as np
from PIL import Image

HERE = os.path.dirname(__file__)
OUT = os.path.join(HERE, '..', 'public', 'textures', 'oak_panel.jpg')
rng = np.random.default_rng(3)
N = 1024


def noise(n, sx, sy, seed):
    """Seamless anisotropic noise: long along x (grain direction), short along y."""
    r = np.random.default_rng(seed)
    f = np.fft.fftfreq(n) * n
    fx, fy = np.meshgrid(f, f)
    k = np.sqrt((fx / sx) ** 2 + (fy / sy) ** 2)
    k[0, 0] = 1
    spec = (r.standard_normal((n, n)) + 1j * r.standard_normal((n, n))) / k ** 1.6
    spec[0, 0] = 0
    v = np.real(np.fft.ifft2(spec))
    return (v - v.min()) / (v.max() - v.min())


grain = noise(N, 1.0, 14.0, 1)  # long streaks
fine = noise(N, 1.0, 60.0, 2)  # fine pores
warp = noise(N, 3.0, 3.0, 3)  # gentle waviness of the rings
y = np.arange(N)[:, None] / N
rings = 0.5 + 0.5 * np.sin(2 * np.pi * (y * 9 + warp * 1.2))
v = 0.5 * grain + 0.3 * rings ** 3 + 0.2 * fine

light = np.array([226, 190, 140]) / 255  # pale oak
dark = np.array([196, 150, 98]) / 255
rgb = light[None, None, :] * (1 - v[..., None] * 0.55) + dark[None, None, :] * (v[..., None] * 0.55)
os.makedirs(os.path.dirname(OUT), exist_ok=True)
Image.fromarray((rgb.clip(0, 1) * 255).astype(np.uint8)).save(OUT, quality=90)
print('wrote', OUT)
