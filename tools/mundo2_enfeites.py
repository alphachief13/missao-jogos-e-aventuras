"""Referenced native prop atlases and ground-anchored exports for Mundo 2."""
from pathlib import Path
import json,argparse,ast
from PIL import Image,ImageDraw,ImageFont,ImageOps,ImageEnhance
from post import trim,split_poses
ROOT=Path(__file__).resolve().parents[1];A=ROOT/'assets'
SIZES={'arvore_1':(512,768),'arvore_2':(512,768),'arbusto':(384,256),'flores':(256,192),'pedra':(256,192),'cerca':(512,256),'placa':(256,320),'pilha_blocos':(384,384),'guindaste':(768,1024),'cone':(192,256),'carrinho':(384,320)}
GROUPS={'arvores':(2,1,['arvore_1','arvore_2']), 'pequenos':(4,2,['arbusto','flores','pedra','cerca','placa','pilha_blocos','cone','carrinho']), 'guindaste':(1,1,['guindaste'])}
DESCS={'arvore_1':'one friendly toy tree with a full ROUND canopy of simple rounded leaf clusters, short thick trunk, muted sage/forest leaf green and warm natural wood; only tree, no ground disc or grass',
'arvore_2':'second distinct toy tree, oval full rounded canopy, short gently curved trunk, muted olive/forest foliage and natural wood, no ground disc or grass',
'arbusto':'one low rounded bush, calm desaturated sage and forest green leaves, no flowers or base disc',
'flores':'one small tuft of WHITE and PALE CREAM-YELLOW flowers on muted stems; no pink, blue or neon green',
'pedra':'one simple smooth rounded SAND-GREY stone with soft bevel, no crystals',
'cerca':'one short section of LIGHT NATURAL WOOD fence, two sturdy vertical posts and two horizontal rails, no plants or ground disc',
'placa':'one completely BLANK rectangular LIGHT WOOD board on a single short post. Smooth wood face with absolutely NO markings, no arrows, no numbers, no scratches resembling letters. Board is rectangular, NOT arrow-shaped',
'pilha_blocos':'one compact pile of four toy building bricks in the campaign pink #E3205D, blue #3E93D0, yellow #F6BB33 and green #A0C630, each color present, simple rounded studs',
'guindaste':'one toy construction CRANE made of rounded studded building blocks, tall sturdy tower, wide horizontal boom, a hanging hook, stable four-foot base. Calm warm beige/cream/pale ochre blocks, natural wood-brown joints, no saturated pink/blue/team green. No lettering, no characters, no cargo or box',
'cone':'one construction cone with ORANGE and WHITE stripes, rounded square base, no writing',
'carrinho':'one small WOODEN wheelbarrow with one wheel and two handles, containing a few subdued cream and pale ochre building bricks; calm wood/earth colors, no team pink/blue/green'}

def prepare():
 t=ast.parse((ROOT/'tools/make_requests.py').read_text());style=next(ast.literal_eval(n.value) for n in t.body if isinstance(n,ast.Assign) and any(isinstance(v,ast.Name) and v.id=='STYLE' for v in n.targets))
 p=ROOT/'tools/requests_mundo2.json';jobs=json.loads(p.read_text())
 for group,(cols,rows,names) in GROUPS.items():
  key='m2_enfeites_'+group
  refs=['referencias/kit/04_fases/fase_2_desafio-dos-construtores.png','assets/personagens/ruivo/iso/frente_idle.png']
  prompt=style+f'''\nUse case: stylized-concept. Asset: decorative upright map props, ONE atlas, EXACTLY {cols} columns by {rows} rows, one object per equal cell, row-major. Desired canvas {cols*768}x{rows*768}. Genuine alpha transparency, NO backdrop, NO floor, NO cast shadow, NO ground discs, NO glow. Entire objects fully inside their cells with transparent gaps; do NOT crop tree canopy or crane. No people or animals, no text, no labels or numbers, NO visible grid or cell borders.
Reference 1 only polished toy construction rendering and rounded building-block geometry; do NOT reproduce its badge, text, blue/pink saturated background or composition. Reference 2 only 3D render quality and elevated camera, do NOT reproduce the boy or his clothes.
Fixed orthographic camera elevated 35 degrees, three-quarter top view, all props facing viewer. Strong simple child-readable silhouettes, few details. ENVIRONMENT COLOR OVERRIDE: calm desaturated leaf green, sand, wood, cream and earth; strong team colors ONLY on the explicitly requested pile of bricks. The orange-white cone is also allowed. Avoid bright lime #A0C630 on plants. Soft daylight, no rim or colored halo. Base of each object clearly visible for ground anchoring during export.
'''
  for i,name in enumerate(names):prompt+=f'\nCell {i+1}, row {i//cols+1}, column {i%cols+1}: '+DESCS[name]+'.'
  promptfile=ROOT/'tools/prompts'/f'{key}.txt';promptfile.write_text(prompt)
  jobs[key]=dict(key=key,out=f'assets/_bruto/{key}.png',size='1536x1024',refs=refs,prompt_file=str(promptfile.relative_to(ROOT)),prompt=prompt,transparent=True,cols=cols,rows=rows,names=names)
 p.write_text(json.dumps(jobs,ensure_ascii=False,indent=2)+'\n');p=ROOT/'tools/requests.json';j=json.loads(p.read_text());j.update(jobs);p.write_text(json.dumps(j,ensure_ascii=False,indent=2)+'\n')
 print('3 atlas requests declared for 11 props; no IA invoked.')

def build():
 jobs=json.loads((ROOT/'tools/requests_mundo2.json').read_text());out=A/'mundo2/enfeites';out.mkdir(parents=True,exist_ok=True)
 for group,(cols,rows,names) in GROUPS.items():
  im=Image.open(A/'_bruto/native'/f'm2_enfeites_{group}.png').convert('RGBA')
  for k,name in enumerate(names):
   x,y=k%cols,k//cols;part=im.crop((round(x*im.width/cols),round(y*im.height/rows),round((x+1)*im.width/cols),round((y+1)*im.height/rows)))
   part=split_poses(part,1,merge_minor=False)[0]
   if name=='guindaste':
    alpha=part.getchannel('A');part=ImageEnhance.Color(part).enhance(.48);part.putalpha(alpha)
   w,h=SIZES[name];part=ImageOps.contain(part,(w-16,h-12),Image.Resampling.LANCZOS)
   part=trim(part);c=Image.new('RGBA',(w,h));c.alpha_composite(part,((w-part.width)//2,h-part.height));c.save(out/f'{name}.png')
   assert c.getbbox()[3]==h
 preview()

def preview():
 w,h=380,420;cols=4;c=Image.new('RGB',(cols*w,3*h),'#F0EEE5');d=ImageDraw.Draw(c)
 font=ImageFont.truetype(str(A/'fonts/Fredoka[wdth,wght].ttf'),22)
 for k,(name,size) in enumerate(SIZES.items()):
  f=Image.open(A/f'mundo2/enfeites/{name}.png').convert('RGBA');f.thumbnail((w-30,h-60),Image.Resampling.LANCZOS)
  x,y=(k%cols)*w,(k//cols)*h;d.line((x+10,y+h-45,x+w-10,y+h-45),fill='#8A7860',width=1)
  c.paste(f,(x+(w-f.width)//2,y+h-45-f.height),f);d.text((x+12,y+h-35),name+f' · {size[0]}×{size[1]}',font=font,fill='#1E2A4A')
 c.save(A/'preview/enfeites_mundo2.png')

if __name__=='__main__':
 p=argparse.ArgumentParser();p.add_argument('action',choices=['prepare','build','preview']);a=p.parse_args();globals()[a.action]()
