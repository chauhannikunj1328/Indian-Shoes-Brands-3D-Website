"""Make a 3D shoe model (GLB) as small as possible for the website, using only numpy + Pillow.

  1. Textures: resized to `size` px (default 512) and saved as JPEG (PNG if transparent).
  2. Geometry, with the standard glTF extension KHR_mesh_quantization (three.js reads it natively,
     no decoder needed):
       positions  float32 x3 (12 bytes) -> int16 x3 + pad (8 bytes); the node's scale/translation
                  turns the integers back into the original coordinates
       normals    float32 x3 (12 bytes) -> int8 normalized x3 + pad (4 bytes)
       uvs        float32 x2 (8 bytes)  -> uint16 normalized x2 (4 bytes)
       indices    uint32 -> uint16 when the mesh has fewer than 65536 vertices
  The shape stays the same to well under a millimetre at shelf size.

Run:  python3 store/scripts/optimize-glb.py in.glb out.glb [texture_size]
"""
import io
import json
import struct
import sys

import numpy as np
from PIL import Image

FLOAT, BYTE, SHORT, USHORT, UINT = 5126, 5120, 5122, 5123, 5125
NP = {FLOAT: '<f4', BYTE: 'i1', SHORT: '<i2', USHORT: '<u2', UINT: '<u4', 5121: 'u1'}
NCOMP = {'SCALAR': 1, 'VEC2': 2, 'VEC3': 3, 'VEC4': 4}


def read_glb(path):
    data = open(path, 'rb').read()
    assert data[:4] == b'glTF'
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


def read_accessor(gltf, binc, idx):
    a = gltf['accessors'][idx]
    v = gltf['bufferViews'][a['bufferView']]
    n = NCOMP[a['type']]
    dt = np.dtype(NP[a['componentType']])
    start = v.get('byteOffset', 0) + a.get('byteOffset', 0)
    stride = v.get('byteStride', 0) or dt.itemsize * n
    raw = np.frombuffer(binc, dtype=np.uint8, count=stride * (a['count'] - 1) + dt.itemsize * n, offset=start)
    rows = np.lib.stride_tricks.as_strided(raw, shape=(a['count'], dt.itemsize * n), strides=(stride, 1))
    return np.ascontiguousarray(rows).view(dt).reshape(a['count'], n)


def shrink_image(raw, size):
    img = Image.open(io.BytesIO(raw))
    img.thumbnail((size, size), Image.LANCZOS)
    out = io.BytesIO()
    if img.mode in ('RGBA', 'LA') and img.getchannel('A').getextrema()[0] < 250:
        img.save(out, 'PNG', optimize=True)
        return out.getvalue(), 'image/png'
    img.convert('RGB').save(out, 'JPEG', quality=82, optimize=True, progressive=True)
    return out.getvalue(), 'image/jpeg'


def optimize(src, dst, size=512):
    gltf, binc = read_glb(src)
    new_bin = bytearray()
    new_views, new_accessors = [], []

    def add_view(data, stride=None, target=None):
        while len(new_bin) % 4:
            new_bin.append(0)
        v = {'buffer': 0, 'byteOffset': len(new_bin), 'byteLength': len(data)}
        if stride:
            v['byteStride'] = stride
        if target:
            v['target'] = target
        new_bin.extend(data)
        new_views.append(v)
        return len(new_views) - 1

    def add_accessor(view, ctype, count, typ, normalized=False, mn=None, mx=None):
        a = {'bufferView': view, 'componentType': ctype, 'count': count, 'type': typ}
        if normalized:
            a['normalized'] = True
        if mn is not None:
            a['min'], a['max'] = mn, mx
        new_accessors.append(a)
        return len(new_accessors) - 1

    # images first (keep their order)
    for img in gltf.get('images', []):
        if 'bufferView' in img:
            v = gltf['bufferViews'][img['bufferView']]
            raw = binc[v.get('byteOffset', 0):v.get('byteOffset', 0) + v['byteLength']]
            data, mime = shrink_image(raw, size)
            img['bufferView'] = add_view(data)
            img['mimeType'] = mime

    quant_for_mesh = {}
    for mi, mesh in enumerate(gltf['meshes']):
        for prim in mesh['primitives']:
            attrs = prim['attributes']
            pos = read_accessor(gltf, binc, attrs['POSITION']).astype(np.float64)
            lo, hi = pos.min(0), pos.max(0)
            center = (lo + hi) / 2
            scale = np.maximum((hi - lo) / 2 / 32767.0, 1e-9)
            q = np.round((pos - center) / scale).astype(np.int16)
            q4 = np.zeros((len(q), 4), np.int16)
            q4[:, :3] = q
            new_attrs = {'POSITION': add_accessor(add_view(q4.tobytes(), 8, 34962), SHORT, len(q), 'VEC3',
                                                  mn=q.min(0).tolist(), mx=q.max(0).tolist())}
            quant_for_mesh[mi] = (center.tolist(), scale.tolist())
            if 'NORMAL' in attrs:
                nrm = read_accessor(gltf, binc, attrs['NORMAL']).astype(np.float64)
                nrm /= np.maximum(np.linalg.norm(nrm, axis=1, keepdims=True), 1e-9)
                n4 = np.zeros((len(nrm), 4), np.int8)
                n4[:, :3] = np.round(nrm * 127).astype(np.int8)
                new_attrs['NORMAL'] = add_accessor(add_view(n4.tobytes(), 4, 34962), BYTE, len(nrm), 'VEC3', normalized=True)
            if 'TEXCOORD_0' in attrs:
                uv = np.clip(read_accessor(gltf, binc, attrs['TEXCOORD_0']).astype(np.float64), 0, 1)
                u = np.round(uv * 65535).astype(np.uint16)
                new_attrs['TEXCOORD_0'] = add_accessor(add_view(u.tobytes(), 4, 34962), USHORT, len(u), 'VEC2', normalized=True)
            for k, v in attrs.items():  # anything else is copied unchanged
                if k not in new_attrs:
                    arr = read_accessor(gltf, binc, v)
                    a = gltf['accessors'][v]
                    new_attrs[k] = add_accessor(add_view(arr.tobytes(), None, 34962), a['componentType'], a['count'], a['type'],
                                                a.get('normalized', False))
            prim['attributes'] = new_attrs
            if 'indices' in prim:
                idx = read_accessor(gltf, binc, prim['indices']).ravel()
                if len(pos) < 65536:
                    idx = idx.astype(np.uint16)
                    prim['indices'] = add_accessor(add_view(idx.tobytes(), None, 34963), USHORT, len(idx), 'SCALAR')
                else:
                    prim['indices'] = add_accessor(add_view(idx.astype(np.uint32).tobytes(), None, 34963), UINT, len(idx), 'SCALAR')

    # the mesh node carries the de-quantization (scale + translation); original transform moves to a parent
    for node in list(gltf['nodes']):
        if 'mesh' in node and node['mesh'] in quant_for_mesh:
            center, scale = quant_for_mesh[node['mesh']]
            if any(k in node for k in ('matrix', 'rotation', 'scale', 'translation')):
                child = {'mesh': node.pop('mesh'), 'translation': center, 'scale': scale}
                gltf['nodes'].append(child)
                node.setdefault('children', []).append(len(gltf['nodes']) - 1)
            else:
                node['translation'] = center
                node['scale'] = scale

    gltf['bufferViews'] = new_views
    gltf['accessors'] = new_accessors
    gltf['buffers'] = [{'byteLength': len(new_bin)}]
    for key in ('extensionsUsed', 'extensionsRequired'):
        lst = gltf.setdefault(key, [])
        if 'KHR_mesh_quantization' not in lst:
            lst.append('KHR_mesh_quantization')

    js = json.dumps(gltf, separators=(',', ':')).encode()
    js += b' ' * ((4 - len(js) % 4) % 4)
    while len(new_bin) % 4:
        new_bin.append(0)
    with open(dst, 'wb') as f:
        f.write(struct.pack('<4sII', b'glTF', 2, 12 + 8 + len(js) + 8 + len(new_bin)))
        f.write(struct.pack('<I4s', len(js), b'JSON') + js)
        f.write(struct.pack('<I4s', len(new_bin), b'BIN\x00') + bytes(new_bin))


if __name__ == '__main__':
    optimize(sys.argv[1], sys.argv[2], int(sys.argv[3]) if len(sys.argv) > 3 else 512)
