"""Mundo 2 pose atlases: native generation requests and deterministic exports."""
from pathlib import Path
import ast,json,argparse
from PIL import Image,ImageDraw,ImageFont
import numpy as np
from post import trim,fit_cell,sheet
ROOT=Path(__file__).resolve().parents[1];A=ROOT/'assets'
CHARS=['ruivo','loira','cacheado','sapo']
ANIMS={'frente_idle':2,'costas_idle':2,'frente_corrida':4,'costas_corrida':4,'frente_pulo':1,'costas_pulo':1,'frente_queda':1,'costas_queda':1,'frente_carregar':4,'costas_carregar':4,'frente_empurrar':2,'costas_empurrar':2,'ajudar':2,'caido':1}
PROTECTED={('ruivo','frente_idle'),('ruivo','costas_corrida')}

def specs(char):
    motion=[('frente_corrida',4),('costas_idle',2)] if char=='ruivo' else [('frente_idle',2),('costas_idle',2),('frente_corrida',4),('costas_corrida',4)]
    return {'movimento':(4,2 if char=='ruivo' else 3,motion),
            'ar':(2,2,[('frente_pulo',1),('frente_queda',1),('costas_pulo',1),('costas_queda',1)]),
            'carregar':(4,2,[('frente_carregar',4),('costas_carregar',4)]),
            'acoes':(4,2,[('frente_empurrar',2),('costas_empurrar',2),('ajudar',2),('caido',1)])}

def prepare():
    tree=ast.parse((ROOT/'tools/make_requests.py').read_text());vals={n.targets[0].id:ast.literal_eval(n.value) for n in tree.body if isinstance(n,ast.Assign) and isinstance(n.targets[0],ast.Name) and n.targets[0].id in ['STYLE','CHAR']}
    jobs=json.loads((ROOT/'tools/requests_mundo2.json').read_text())
    for char in CHARS:
      ref,desc=vals['CHAR'][char]
      refs=[f'assets/personagens/{char}/idle.png','referencias/kit/personagens/'+ref,'assets/personagens/ruivo/iso/frente_idle.png','assets/personagens/ruivo/iso/costas_corrida.png']
      for group,(cols,rows,anims) in specs(char).items():
        key=f'm2_{char}_{group}'
        if key in jobs and (A/'_bruto/native'/f'{key}.png').exists():continue
        instructions=[];cells=[]
        for anim,n in anims:
          for i in range(n):
            cells.append([anim,i]);direction='BACK, facing diagonally UP-RIGHT away from camera; back of head and backpack visible, face hidden' if anim.startswith('costas') else 'FRONT, facing diagonally DOWN-RIGHT toward camera; face and chest visible'
            if 'idle' in anim:action='stand relaxed; '+('subtle breathing/blink' if i else 'eyes open')
            elif 'corrida' in anim:action=['run, near leg forward and far leg back','run passing pose, near leg under hips, far knee raised','run, far leg forward and near leg back','run passing pose, far foot under hips, near knee raised'][i]
            elif 'pulo' in anim:action='ascending jump with bent knees and raised empty arms'
            elif 'queda' in anim:action='descending with arms open for balance and bent knees'
            elif 'carregar' in anim:action=f'walking phase {i+1} of 4, BOTH EMPTY HANDS ABOVE TOP OF HEAD, palms upward supporting an INVISIBLE box, elbows bent, never hold any object'
            elif 'empurrar' in anim:action='lean forward, BOTH empty arms extended pushing an INVISIBLE heavy object; '+('legs braced' if i==0 else 'small advancing step')
            elif anim=='ajudar':action='crouching, extend one empty hand toward viewer to lift an INVISIBLE friend; '+('right knee bent' if i==0 else 'slightly higher crouch')
            else:action='sitting on ground, cute dizzy expression, small simple stars near head, no pain'
            instructions.append(f'Cell {len(cells)} (row {(len(cells)-1)//cols+1}, column {(len(cells)-1)%cols+1}): {direction}. {action}.')
        prompt=vals['STYLE']+f'''\nUse case: identity-preserve. Asset: ONE animation sprite ATLAS, exactly {cols} columns by {rows} rows of equal cells, read row-major. Requested canvas {cols*512}x{rows*512}. Transparent background, NO visible grid, labels, borders, floor, shadows or glow. Each figure fully INSIDE its own cell with 8% margin. No overlapping figures. Empty unused cells remain transparent.
Input 1: this character's current sprite, STRICT face, head/body proportions, clothes, colors and scale. Input 2: official identity reference, ignore handheld props and logos, use only requested character. Inputs 3 and 4: APPROVED isometric camera elevation and front/back directions, NOT the identity of this character unless it is the ruivo.
Character: {desc} No logos or writing. Same compact toy proportions as current sprite. Empty hands in EVERY pose. Objects from reference stay ATTACHED TO BODY, never held. The robot frog must not acquire lion parts, a hat or backpack.
Camera fixed at 35 degrees above horizon, orthographic three-quarter top view like inputs 3/4. Front = down-right on screen; back = up-right. No left versions, no flat side profile. IDENTICAL MODEL SCALE AND HEAD SIZE in all cells, including crouch/sit/jump/carry; bent poses occupy less height. Do not shrink raised-hand poses to fit: leave enough overhead room in all cells. Keep team color visible from back using existing clothes/shoes: blue for ruivo, pink bow/shoes for loira, warm yellow-beige vest/hat for cacheado, green shell for sapo. No invented marks or colored symbols.
'''+ '\n'.join(instructions)+f'\nCells {len(cells)+1} through {cols*rows} stay EMPTY and transparent.'
        path=ROOT/'tools/prompts'/f'{key}.txt';path.write_text(prompt)
        jobs[key]=dict(key=key,out=f'assets/_bruto/{key}.png',size='1536x1024',refs=refs,prompt_file=str(path.relative_to(ROOT)),prompt=prompt,transparent=True,cols=cols,rows=rows,cells=cells,char=char)
    (ROOT/'tools/requests_mundo2.json').write_text(json.dumps(jobs,ensure_ascii=False,indent=2)+'\n')
    p=ROOT/'tools/requests.json';req=json.loads(p.read_text());req.update(jobs);p.write_text(json.dumps(req,ensure_ascii=False,indent=2)+'\n')
    print('16 atlases preparados; nenhuma geração disparada.')

def export(char,scales):
    jobs=json.loads((ROOT/'tools/requests_mundo2.json').read_text());allframes={};cal={}
    for group in specs(char):
      key=f'm2_{char}_{group}';j=jobs[key];im=Image.open(A/'_bruto/native'/f'{key}.png').convert('RGBA');cols=j['cols'];rows=j['rows']
      row_bounds=[0]
      counts=(np.asarray(im.getchannel('A'))>=64).sum(axis=1)
      for r in range(1,rows):
        expected=r*im.height/rows;half=im.height/rows*.24
        lo=max(row_bounds[-1]+1,round(expected-half));hi=min(im.height-1,round(expected+half))
        low=counts[lo:hi]<=max(3,counts.max()*.015)
        edges=np.flatnonzero(np.diff(np.r_[False,low,False]))
        gaps=list(zip(edges[::2],edges[1::2]))
        if gaps:
          left,right=max(gaps,key=lambda z:(z[1]-z[0])-.01*abs(lo+(z[0]+z[1])/2-expected))
          bound=lo+round((left+right)/2)
        else:bound=lo+int(np.argmin(counts[lo:hi]))
        row_bounds.append(bound)
      row_bounds.append(im.height)
      poses=[]
      for k,(anim,i) in enumerate(j['cells']):
        x=k%cols;y=k//cols
        box=(round(x*im.width/cols),row_bounds[y],round((x+1)*im.width/cols),row_bounds[y+1])
        part=im.crop(box)
        if True:
          mask=np.asarray(part.getchannel('A'))>=16
          occupied=mask.any(axis=1)
          edges=np.flatnonzero(np.diff(np.r_[False,occupied,False]))
          runs=list(zip(edges[::2],edges[1::2]))
          if runs:
            lo,hi=max(runs,key=lambda r: int(mask[r[0]:r[1]].sum()))
            if anim=='caido':
              # Keep nearby detached stars, discard distant pieces of an adjacent atlas row.
              kept=[r for r in runs if r[1]>=lo-45 and r[0]<=hi+45]
              lo=min(r[0] for r in kept);hi=max(r[1] for r in kept)
            part=part.crop((0,int(lo),part.width,int(hi)))
        poses.append(trim(part))
      scale=scales[group]
      frames=fit_cell(poses,scale=scale)
      cal[group]=dict(scale=scale,source_size=list(im.size),row_bounds=row_bounds,pose_sizes=[list(f.size) for f in poses])
      for (anim,i),f in zip(j['cells'],frames):allframes.setdefault(anim,{})[i]=f
    out=A/f'personagens/{char}/iso';out.mkdir(parents=True,exist_ok=True)
    for anim,frames in allframes.items():
      assert (char,anim) not in PROTECTED
      frames=[frames[i] for i in range(ANIMS[anim])]
      sheet(frames,len(frames)).save(out/f'{anim}.png')
    (A/f'_log/mundo2/calibracoes_{char}_atlas.json').write_text(json.dumps(cal,indent=2)+'\n')
    preview(char)

def preview(char=None):
    chars=[char] if char else CHARS
    items=[]
    for p in chars:
      items.append((f'{p} · plataforma',Image.open(A/f'personagens/{p}/idle.png').crop((0,0,384,384))))
      for anim,n in ANIMS.items():
        path=A/f'personagens/{p}/iso/{anim}.png'
        if not path.exists():continue
        im=Image.open(path)
        for i in range(n):items.append((f'{p} · {anim} {i+1}',im.crop((i*384,0,(i+1)*384,384))))
    cols=8;w,h=240,270
    c=Image.new('RGB',(cols*w,((len(items)+cols-1)//cols)*h),'#1E2A4A');d=ImageDraw.Draw(c)
    font=ImageFont.truetype(str(A/'fonts/Fredoka[wdth,wght].ttf'),16)
    for k,(label,f) in enumerate(items):
      f=f.convert('RGBA');f.thumbnail((230,230),Image.Resampling.LANCZOS)
      x=(k%cols)*w;y=(k//cols)*h;c.paste(f,(x+(w-f.width)//2,y+5),f);d.text((x+7,y+243),label,font=font,fill='white')
    c.save(A/'preview'/('personagens_iso.png' if char is None else f'{char}_iso.png'))

if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('action',choices=['prepare','export','preview']);p.add_argument('--char');p.add_argument('--scales');a=p.parse_args()
    if a.action=='prepare':prepare()
    elif a.action=='export':export(a.char,json.loads(a.scales))
    else:preview(a.char)
