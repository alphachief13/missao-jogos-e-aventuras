"""Record one native image result using the common gen_image adapter."""
import json
import subprocess
import sys
from pathlib import Path
from PIL import Image, ImageDraw

ROOT=Path(__file__).resolve().parents[1]
key,source=sys.argv[1:3]
req=json.loads((ROOT/'tools/requests.json').read_text())[key]
args=[sys.executable,str(ROOT/'tools/gen_image.py'),'--out',req['out'],'--size',req['size'],'--prompt-file',req['prompt_file'],'--source',source]
for ref in req['refs']:args+=['--ref',ref]
if req['transparent']:args+=['--transparent']
if '--force' in sys.argv: args+=['--force']
subprocess.run(args,cwd=ROOT,check=True)
im=Image.open(ROOT/req['out']).convert('RGBA')
im.thumbnail((1000,660),Image.Resampling.LANCZOS)
c=Image.new('RGB',(1000,im.height*2+50),'#1E2A4A')
d=ImageDraw.Draw(c);d.rectangle((0,im.height+25,1000,c.height),fill='#E3205D')
for y in (25,im.height+50):c.paste(im,((1000-im.width)//2,y),im)
c.save(ROOT/f'assets/preview/revisao_{key}.png')
print(f'Preview: assets/preview/revisao_{key}.png')
