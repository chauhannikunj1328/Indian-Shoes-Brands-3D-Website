"""Generate seamless wall + floor textures matching the reference video.

Wall  : matte warm-white plaster, very soft mottling + fine grain.
Floor : smooth light-grey microcement / resin, cloudy mottling + tiny speckles.

Run:  python3 store/scripts/make-textures.py
Out:  store/public/textures/{wall,wall_normal,floor,floor_normal}.jpg
All maps tile seamlessly (noise is filtered in the frequency domain, so it wraps).
"""
import os
import numpy as np
from PIL import Image

SIZE = 1024
OUT = os.path.join(os.path.dirname(__file__), '..', 'public', 'textures')
rng = np.random.default_rng(7)


def tile_noise(scale, size=SIZE):
    """Periodic noise; `scale` = feature size in pixels. Returns values ~[-1, 1]."""
    white = rng.standard_normal((size, size))
    f = np.fft.fftfreq(size)
    fx, fy = np.meshgrid(f, f)
    r = np.sqrt(fx**2 + fy**2)
    filt = np.exp(-(r * scale) ** 2)
    n = np.real(np.fft.ifft2(np.fft.fft2(white) * filt))
    return n / (np.abs(n).max() + 1e-9)


def normal_map(height, strength):
    """Tileable normal map from a height field (np.roll keeps the edges seamless)."""
    dx = (np.roll(height, -1, 1) - np.roll(height, 1, 1)) * strength
    dy = (np.roll(height, -1, 0) - np.roll(height, 1, 0)) * strength
    nz = np.ones_like(height)
    n = np.stack([-dx, -dy, nz], -1)
    n /= np.linalg.norm(n, axis=-1, keepdims=True)
    return Image.fromarray(((n * 0.5 + 0.5) * 255).astype(np.uint8))


def save_rgb(arr, tint, name):
    rgb = np.clip(arr[..., None] * np.array(tint)[None, None, :], 0, 1)
    Image.fromarray((rgb * 255).astype(np.uint8)).save(os.path.join(OUT, name), quality=90)


os.makedirs(OUT, exist_ok=True)

# ---------- wall: warm white plaster ----------
wall_h = 0.6 * tile_noise(180) + 0.3 * tile_noise(40) + 0.1 * tile_noise(3)
wall = 0.965 + 0.012 * wall_h  # near-white; the brand wallColor tints it in the scene
save_rgb(wall, (1.0, 0.995, 0.985), 'wall.jpg')
normal_map(wall_h, 1.2).save(os.path.join(OUT, 'wall_normal.jpg'), quality=90)

# ---------- floor: light grey microcement ----------
clouds = 0.55 * tile_noise(260) + 0.3 * tile_noise(70) + 0.15 * tile_noise(12)
speck = (rng.random((SIZE, SIZE)) > 0.9985).astype(float)
speck = np.real(np.fft.ifft2(np.fft.fft2(speck) * np.exp(-(np.sqrt(
    np.add.outer(np.fft.fftfreq(SIZE) ** 2, np.fft.fftfreq(SIZE) ** 2)) * 1.6) ** 2)))
speck = speck / (speck.max() + 1e-9)
floor = 0.86 + 0.035 * clouds - 0.05 * speck
save_rgb(floor, (0.985, 0.975, 0.955), 'floor.jpg')
normal_map(0.7 * clouds + 0.3 * tile_noise(4), 0.6).save(
    os.path.join(OUT, 'floor_normal.jpg'), quality=90)

print('textures written to', os.path.abspath(OUT))
