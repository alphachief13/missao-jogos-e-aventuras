"""Deterministic asset processing. All sprite sequences reuse the idle_0 scale."""
import colorsys
import numpy as np
from PIL import Image, ImageChops


def trim(img):
    img = img.convert('RGBA')
    img.putalpha(img.getchannel('A').point(lambda a: 0 if a < 16 else a))
    box = img.getchannel('A').getbbox()
    if box is None:
        raise ValueError('Empty image')
    return img.crop(box)


def split_poses(img, n):
    """8-connected alpha runs; merge tiny disconnected details with nearest body."""
    img = img.convert('RGBA')
    mask = np.asarray(img.getchannel('A')) >= 16
    runs, parents, previous = [], [], []

    def root(i):
        while parents[i] != i:
            parents[i] = parents[parents[i]]
            i = parents[i]
        return i

    for y, row in enumerate(mask):
        edges = np.flatnonzero(np.diff(np.r_[False, row, False]))
        current = []
        for x0, x1 in zip(edges[::2], edges[1::2]):
            idx = len(runs)
            runs.append((int(x0), int(x1), y))
            parents.append(idx)
            current.append(idx)
            for other in previous:
                lo, hi, _ = runs[other]
                if lo <= x1 and hi >= x0:
                    parents[root(idx)] = root(other)
        previous = current
    groups = {}
    for i, (x0, x1, y) in enumerate(runs):
        groups.setdefault(root(i), []).append((x0, x1, y))
    components = sorted(groups.values(), key=lambda rs: sum(b-a for a,b,_ in rs), reverse=True)
    if not components:
        raise ValueError('No opaque components')
    sizes = [sum(b-a for a,b,_ in rs) for rs in components]
    major = [rs for rs, area in zip(components, sizes) if area >= sizes[0] * .08]
    minor = [rs for rs, area in zip(components, sizes) if area < sizes[0] * .08]
    if len(major) != n:
        raise ValueError(f'Expected {n} poses, found {len(major)} substantial alpha components')

    def center(rs):
        area = sum(b-a for a,b,_ in rs)
        return np.array([sum((a+b-1)/2*(b-a) for a,b,_ in rs)/area,
                         sum(y*(b-a) for a,b,y in rs)/area])

    centers = [center(rs) for rs in major]
    for rs in minor:
        nearest = min(range(n), key=lambda j: np.linalg.norm(center(rs)-centers[j]))
        major[nearest].extend(rs)
    major.sort(key=lambda rs: center(rs)[0])
    frames = []
    for rs in major:
        alpha = np.zeros(mask.shape, dtype=np.uint8)
        original_alpha = np.asarray(img.getchannel('A'))
        for a,b,y in rs:
            alpha[y,a:b] = original_alpha[y,a:b]
        part = img.copy()
        part.putalpha(Image.fromarray(alpha))
        frames.append(trim(part))
    return frames


def fit_cell(frames, cell=(384,384), target_h=352, baseline=376, *, idle_0=None, scale=None):
    if scale is None:
        scale = target_h / trim(idle_0 if idle_0 is not None else frames[0]).height
    result = []
    for frame in frames:
        frame = trim(frame)
        frame = frame.resize((round(frame.width*scale), round(frame.height*scale)), Image.Resampling.LANCZOS)
        alpha = np.asarray(frame.getchannel('A'), dtype=float)
        cx = float((alpha.sum(axis=0)*np.arange(frame.width)).sum()/alpha.sum())
        x, y = round(cell[0]/2-cx), baseline-frame.height
        if x < 0 or y < 0 or x+frame.width > cell[0] or y+frame.height > cell[1]:
            raise ValueError('Pose exceeds cell at idle_0 scale; do not shrink individual frames')
        canvas = Image.new('RGBA', cell)
        canvas.alpha_composite(frame, (x,y))
        result.append(canvas)
    return result


def sheet(frames, cols):
    if not frames or cols < 1:
        raise ValueError('Frames and positive columns required')
    w,h = frames[0].size
    canvas = Image.new('RGBA', (cols*w, ((len(frames)+cols-1)//cols)*h))
    for i, frame in enumerate(frames):
        if frame.size != (w,h):
            raise ValueError('Mismatched cell sizes')
        canvas.alpha_composite(frame, ((i%cols)*w, (i//cols)*h))
    return canvas


def seamless(img):
    """Offset plus crossfade to a mirrored wrap, preserving exact matching edges."""
    img = img.convert('RGB')
    w,h = img.size
    offset = ImageChops.offset(img, w//2, h//2)
    a = np.asarray(offset, dtype=float)
    # Offset places the original wrap seams at the center. Crossfade those
    # central seams, then undo the offset; do not blend the already-smooth edges.
    for axis, length in ((1,w), (0,h)):
        band = max(2, length//64)
        for k in range(band):
            left = [slice(None)]*3
            right = [slice(None)]*3
            left[axis], right[axis] = length//2-1-k, length//2+k
            common = (a[tuple(left)] + a[tuple(right)]) / 2
            blend = .5*(1+np.cos(np.pi*k/band))
            a[tuple(left)] = a[tuple(left)]*(1-blend)+common*blend
            a[tuple(right)] = a[tuple(right)]*(1-blend)+common*blend
    result=Image.fromarray(np.uint8(np.clip(a,0,255)))
    return ImageChops.offset(result,-w//2,-h//2)


def hue_variant(img, para_hex):
    rgba = img.convert('RGBA')
    rgb = tuple(int(para_hex.lstrip('#')[i:i+2],16)/255 for i in (0,2,4))
    target_h, _, _ = colorsys.rgb_to_hsv(*rgb)
    hsv = np.asarray(rgba.convert('RGB').convert('HSV')).copy()
    colored = hsv[:,:,1] > 45
    hsv[:,:,0][colored] = round(target_h*255)
    result = Image.fromarray(hsv, 'HSV').convert('RGBA')
    result.putalpha(rgba.getchannel('A'))
    return result
