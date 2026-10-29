"""Register/post-process a native image generation; never silently generate without refs.

Run the native image tool after opening ALL --ref images, then pass its local output
as --source. Without --source this writes a request for the operator, not an API call.
"""
import argparse
import hashlib
import json
import shutil
from datetime import datetime, timezone
from pathlib import Path

from PIL import Image, ImageFilter, ImageOps
import numpy as np

ROOT = Path(__file__).resolve().parents[1]
PREFIX = "Use the attached reference images as the strict visual base:"


def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument('--out', required=True, type=Path)
    p.add_argument('--size', required=True, choices=['1024x1024', '1536x1024', '1024x1536'])
    p.add_argument('--ref', required=True, action='append', type=Path)
    p.add_argument('--prompt-file', required=True, type=Path)
    p.add_argument('--transparent', action='store_true')
    p.add_argument('--force', action='store_true')
    p.add_argument('--source', type=Path, help='Output file from the native generation tool')
    a = p.parse_args()
    if a.out.exists() and not a.force:
        print(f'SKIP: {a.out}')
        return
    prompt = a.prompt_file.read_text()
    if not prompt.startswith(PREFIX):
        p.error('Prompt must begin with the specification style prefix')
    for ref in a.ref:
        if not ref.is_file() or ref.name == 'ref_composicao.jpg':
            p.error(f'Invalid/forbidden reference: {ref}')
    if not a.source:
        p.error('Native mode: open all --ref images, generate with them attached, then rerun with --source <native PNG>. No generation has been charged by this script.')
    native_archive=ROOT/'assets/_bruto/native'/a.out.name
    native_archive.parent.mkdir(parents=True,exist_ok=True)
    shutil.copyfile(a.source,native_archive)
    img = Image.open(a.source).convert('RGBA' if a.transparent else 'RGB')
    if a.transparent and img.getchannel('A').getextrema()[0] == 255:
        from rembg import remove, new_session
        img = remove(img, session=new_session('isnet-general-use')).convert('RGBA')
        alpha = img.getchannel('A').point(lambda v: 0 if v < 16 else v)
        img.putalpha(alpha.filter(ImageFilter.MinFilter(3)))
    if a.transparent:
        alpha = np.asarray(img.getchannel('A'))
        if not ((alpha == 0).any() and (alpha >= 250).any()):
            p.error('Missing usable true transparency')
    size = tuple(map(int, a.size.split('x')))
    native_size = img.size
    if native_size != size:
        if a.transparent:
            resized=ImageOps.contain(img,size,Image.Resampling.LANCZOS)
            img=Image.new('RGBA',size)
            img.alpha_composite(resized,((size[0]-resized.width)//2,(size[1]-resized.height)//2))
        else:
            img=ImageOps.fit(img,size,Image.Resampling.LANCZOS)
    a.out.parent.mkdir(parents=True, exist_ok=True)
    img.save(a.out)
    Path(str(a.out) + '.prompt.txt').write_text(prompt)
    log = ROOT / 'assets/_log/geracoes.jsonl'
    log.parent.mkdir(parents=True, exist_ok=True)
    entry = dict(timestamp=datetime.now(timezone.utc).isoformat(), out=str(a.out),
                 ferramenta='image_gen', origem='ia', refs=[str(r) for r in a.ref],
                 prompt=prompt, size=list(size), native_size=list(native_size),
                 transparent=a.transparent, source=str(a.source), force=a.force,
                 sha256=hashlib.sha256(a.out.read_bytes()).hexdigest(), status='aguardando_revisao')
    with log.open('a') as f:
        f.write(json.dumps(entry, ensure_ascii=False) + '\n')
    print(f'SAVED: {a.out} ({size[0]}x{size[1]})')


if __name__ == '__main__':
    main()
