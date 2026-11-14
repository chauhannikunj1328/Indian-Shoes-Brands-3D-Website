"""Make a GLB light enough for the website: every embedded texture is resized (max `size` px) and
re-saved as JPEG (or PNG if it has transparency). The mesh itself is left as it is (it is already
low-poly from the generator). Uses only Pillow - no extra tools.

Run:  python3 store/scripts/shrink-glb.py in.glb out.glb [size]
"""
import io
import json
import struct
import sys

from PIL import Image


def read_glb(path):
    data = open(path, 'rb').read()
    magic, version, _ = struct.unpack('<4sII', data[:12])
    assert magic == b'glTF' and version == 2, 'not a glTF 2 binary'
    off, gltf, binc = 12, None, b''
    while off < len(data):
        ln, typ = struct.unpack('<I4s', data[off:off + 8])
        chunk = data[off + 8:off + 8 + ln]
        if typ == b'JSON':
            gltf = json.loads(chunk)
        elif typ == b'BIN\x00':
            binc = chunk
        off += 8 + ln
    return gltf, binc


def write_glb(path, gltf, binc):
    js = json.dumps(gltf, separators=(',', ':')).encode()
    js += b' ' * ((4 - len(js) % 4) % 4)
    binc += b'\x00' * ((4 - len(binc) % 4) % 4)
    total = 12 + 8 + len(js) + 8 + len(binc)
    with open(path, 'wb') as f:
        f.write(struct.pack('<4sII', b'glTF', 2, total))
        f.write(struct.pack('<I4s', len(js), b'JSON') + js)
        f.write(struct.pack('<I4s', len(binc), b'BIN\x00') + binc)


def shrink(src, dst, size=1024):
    gltf, binc = read_glb(src)
    views = gltf['bufferViews']
    image_views = {img['bufferView']: i for i, img in enumerate(gltf.get('images', [])) if 'bufferView' in img}
    new_bin = bytearray()
    for vi, v in enumerate(views):
        raw = binc[v.get('byteOffset', 0):v.get('byteOffset', 0) + v['byteLength']]
        if vi in image_views:
            img = Image.open(io.BytesIO(raw))
            img.thumbnail((size, size), Image.LANCZOS)
            out = io.BytesIO()
            has_alpha = img.mode in ('RGBA', 'LA') and img.getchannel('A').getextrema()[0] < 250
            if has_alpha:
                img.save(out, 'PNG', optimize=True)
                mime = 'image/png'
            else:
                img.convert('RGB').save(out, 'JPEG', quality=82, optimize=True)
                mime = 'image/jpeg'
            raw = out.getvalue()
            gltf['images'][image_views[vi]]['mimeType'] = mime
        while len(new_bin) % 4:
            new_bin += b'\x00'
        v['byteOffset'] = len(new_bin)
        v['byteLength'] = len(raw)
        new_bin += raw
    gltf['buffers'] = [{'byteLength': len(new_bin)}]
    write_glb(dst, gltf, bytes(new_bin))


if __name__ == '__main__':
    shrink(sys.argv[1], sys.argv[2], int(sys.argv[3]) if len(sys.argv) > 3 else 1024)
