"""Offline new-identity asset build; uses persisted native image inputs, never calls IA.

Deferred worlds are explicitly skipped until their native generations exist.
"""
import argparse, json, sys
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageOps
import numpy as np
from post import trim, split_poses, fit_cell, sheet
ROOT=Path(__file__).resolve().parents[1]
A=ROOT/'assets'
COLORS={'azul':'#3E93D0','rosa':'#E3205D','amarelo':'#F6BB33','verde':'#A0C630'}
NAVY='#1E2A4A'
CAT=A/'_log/catalogo.json'
catalog=json.loads(CAT.read_text()) if CAT.exists() else {}
FORCE=None


def font(size, bold=True):
    f = ImageFont.truetype(str(A/'fonts/Fredoka[wdth,wght].ttf'),size)
    if bold:
        f.set_variation_by_axes([700,100])
    return f


def save(im, path, origin='script', refs=(), **meta):
    path = str(path)
    out = A/path
    out.parent.mkdir(parents=True,exist_ok=True)
    if not out.exists() or FORCE and (FORCE in path or FORCE=='all'):
        im.save(out)
    catalog[path] = dict(caminho=path,tipo='imagem',largura=im.width,altura=im.height,
                         origem=origin,refs=list(map(str,refs)),**meta)
    CAT.write_text(json.dumps(catalog,ensure_ascii=False,indent=2))


def contain(im,size):
    im=im.copy().convert('RGBA'); im.thumbnail(size,Image.Resampling.LANCZOS)
    c=Image.new('RGBA',size); c.alpha_composite(im,((size[0]-im.width)//2,(size[1]-im.height)//2)); return c


def contact(paths,out,cols=5,cell=(240,240)):
    w,h=cell
    c=Image.new('RGB',(cols*w,((len(paths)+cols-1)//cols)*h),NAVY)
    d=ImageDraw.Draw(c)
    for i,path in enumerate(paths):
        im=Image.open(A/path).convert('RGBA'); im.thumbnail((w-20,h-46))
        x,y=(i%cols)*w,(i//cols)*h
        c.paste(im,(x+(w-im.width)//2,y+10),im)
        label=str(Path(path).with_suffix(''))
        if len(label)>31:label=Path(path).stem
        label=label[:48];label_size=15
        while font(label_size).getlength(label)>w-16 and label_size>9:label_size-=1
        d.text((x+8,y+h-31),label,font=font(label_size),fill='white')
    c.save(A/'preview'/out)


def requests():
    return json.loads((ROOT/'tools/requests.json').read_text())


def sprite_meta(p,color,n=1,fps=0):
    return dict(time=color,cor_hex=COLORS[color],quadros=n,largura_quadro=384,altura_quadro=384,
                fps=fps,ancora=[192,376],hitbox=dict(x=132,y=60,w=120,h=316))


def gif_preview(frames,path,fps):
    bg=[]
    for f in frames:
        c=Image.new('RGBA',f.size,NAVY);c.alpha_composite(f);bg.append(c.convert('RGB'))
    ticks=np.rint(np.arange(len(frames)+1)*100/fps).astype(int)*10
    durations=np.diff(ticks).tolist()
    bg[0].save(A/'preview'/path,save_all=True,append_images=bg[1:],duration=durations,loop=0,disposal=2)


def personagens():
    calibration=json.loads((ROOT/'tools/calibracoes.json').read_text())
    chars=['ruivo','loira','cacheado','sapo']
    selected=[FORCE] if FORCE in chars else chars
    for p in selected:
        color=dict(ruivo='azul',loira='rosa',cacheado='amarelo',sapo='verde')[p]
        native=lambda kind: Image.open(A/'_bruto/native'/f'{p}_{kind}.png').convert('RGBA')
        idle_frames=split_poses(native('idle'),2)
        target=324 if p=='sapo' else 352
        base_scale=target/idle_frames[0].height
        allframes={}
        for kind,n in [('idle',2),('corrida',4),('ar',2),('extras',4)]:
            poses=idle_frames if kind=='idle' else split_poses(native(kind),n)
            factor=calibration[p]['idle']/calibration[p][kind]
            cells=fit_cell(poses,scale=base_scale*factor)
            names={'idle':['idle_0','idle_1'],'corrida':[f'corrida_{i}' for i in range(4)],'ar':['pulo','queda'],'extras':['empurrar','derrota','vitoria','aceno']}[kind]
            refs=requests()[p+'_'+kind]['refs']
            for name,f in zip(names,cells):
                allframes[name]=f
                save(f,f'personagens/{p}/frames/{name}.png','ia',refs,**sprite_meta(p,color))
            if kind in ('idle','corrida'):
                fps=3 if kind=='idle' else 10
                save(sheet(cells,n),f'personagens/{p}/{kind}.png','ia',refs,**sprite_meta(p,color,n,fps))
                gif_preview(cells,f'{p}_{kind}.gif',fps)
            else:
                for name,f in zip(names,cells):
                    save(f,f'personagens/{p}/{name}.png','ia',refs,**sprite_meta(p,color))
        wave=trim(allframes['aceno'])
        bust=wave.crop((0,0,wave.width,round(wave.height*.62)))
        portrait=contain(bust,(256,256))
        save(portrait,f'personagens/{p}/retrato.png',refs=[f'personagens/{p}/aceno.png'],time=color,cor_hex=COLORS[color])
        contact([f'personagens/{p}/frames/{name}.png' for name in allframes],f'{p}_poses.png',6,(256,280))
    # Only include completed new-identity characters in this review sheet.
    paths=[f'personagens/{p}/frames/{name}.png' for p in selected for name in
           ['idle_0','idle_1',*[f'corrida_{i}' for i in range(4)],'pulo','queda','empurrar','derrota','vitoria','aceno']]
    contact(paths,'personagens.png',6,(256,280))


def source_ready(key):
    prompt=A/'_bruto'/f'{key}.png.prompt.txt'
    return (A/'_bruto/native'/f'{key}.png').exists() and prompt.exists() and 'Real-world play only' in prompt.read_text()


def fundos():
    for key,req in requests().items():
        if not key.endswith(('_longe','_meio')):continue
        world,layer=key.rsplit('_',1)
        if FORCE and FORCE not in ('all',world):continue
        if not source_ready(key):
            print('ADIADO: '+key);continue
        im=Image.open(A/'_bruto/native'/f'{key}.png').convert('RGBA')
        im=ImageOps.fit(im,(2400,1080),Image.Resampling.LANCZOS)
        if layer=='longe':im=im.convert('RGB')
        else:im.putalpha(im.getchannel('A').point(lambda v: 0 if v<16 else v))
        save(im,f'fundos/{world}/{layer}.png','ia',req['refs'])


def sons():
    import sfx
    for name,meta in sfx.build(A/'sons').items():
        path=f'sons/{name}.wav'
        catalog[path]=dict(caminho=path,tipo='audio',origem='script',refs=[],**meta)
    CAT.write_text(json.dumps(catalog,ensure_ascii=False,indent=2))


def revisao():
    worlds=['exploradores','construtores','robotica','gincana','conquistas','lobby']
    chars=['ruivo','loira','cacheado','sapo']
    c=Image.new('RGB',(1600,960),NAVY);d=ImageDraw.Draw(c)
    for i,world in enumerate(worlds):
        x,y=(i%2)*800,(i//2)*320
        path=A/f'fundos/{world}/longe.png'
        if path.exists():
            bg=Image.open(path).convert('RGBA')
            mid=A/f'fundos/{world}/meio.png'
            if mid.exists():bg.alpha_composite(Image.open(mid).convert('RGBA'))
            tile=ImageOps.fit(bg,(800,280),Image.Resampling.LANCZOS)
            c.paste(tile.convert('RGB'),(x,y))
        else:
            d.rectangle((x+5,y+5,x+794,y+275),outline='#3E93D0',width=2)
            d.text((x+250,y+120),'GERAÇÃO ADIADA',font=font(28),fill='white')
        label=world+(' · NOVO' if source_ready(world+'_longe') else ' · ADIADO / PROVISÓRIO')
        d.text((x+15,y+287),label,font=font(20),fill='white')
    c.save(A/'preview/fundos.png')
    bg=Image.open(A/'fundos/exploradores/longe.png').convert('RGBA')
    bg.alpha_composite(Image.open(A/'fundos/exploradores/meio.png').convert('RGBA'))
    c=Image.new('RGB',(1600,900),NAVY);d=ImageDraw.Draw(c)
    for i,p in enumerate(chars):
        x,y=(i%2)*800,(i//2)*450
        tile=ImageOps.fit(bg,(800,410),Image.Resampling.LANCZOS)
        for j,name in enumerate(['idle_0','corrida_0']):
            f=Image.open(A/f'personagens/{p}/frames/{name}.png').convert('RGBA')
            f.thumbnail((280,280),Image.Resampling.LANCZOS)
            tile.alpha_composite(f,(120+j*300,110))
        c.paste(tile.convert('RGB'),(x,y))
        d.text((x+15,y+420),p+' · exploradores · idle / corrida',font=font(20),fill='white')
    c.save(A/'preview/sprites_sobre_fundos.png')
    manifest()


def manifest():
    import hashlib,wave
    entries=[]
    for p in sorted(A.rglob('*')):
        rel=p.relative_to(A)
        if not p.is_file() or rel.parts[0].startswith('_') or rel.parts[0]=='preview':continue
        if p.suffix.lower() not in ('.png','.wav','.ttf','.txt'):continue
        path=rel.as_posix();meta=dict(catalog.get(path,{}))
        meta.update(caminho=path,sha256=hashlib.sha256(p.read_bytes()).hexdigest())
        meta['refs']=[r for r in meta.get('refs',[]) if (ROOT/r).exists() and r.startswith('referencias/kit/') or (A/r).exists()]
        if p.suffix=='.png':
            im=Image.open(p);meta.update(tipo='imagem',largura=im.width,altura=im.height)
            if path.startswith(('kit/','ui/')) or path.endswith('/arte.png'):meta['origem']='kit'
            elif path.startswith('particulas/'):meta['origem']='script'
        elif p.suffix=='.wav':
            with wave.open(str(p),'rb') as f:
                a=np.frombuffer(f.readframes(f.getnframes()),dtype='<i2').astype(float)/32767
                meta.update(tipo='audio',sample_rate=f.getframerate(),canais=f.getnchannels(),duracao=f.getnframes()/f.getframerate(),pico_dbfs=round(float(20*np.log10(np.max(np.abs(a)))),4))
                assert f.getframerate()==44100 and f.getnchannels()==1 and f.getsampwidth()==2
                assert abs(meta['pico_dbfs']+3)<.01
        else:meta['tipo']='fonte' if p.suffix=='.ttf' else 'licenca'
        meta.setdefault('origem','script');meta.setdefault('refs',[])
        entries.append(meta)
    data=dict(versao=2,nome='MISSÃO, JOGOS E AVENTURAS · Colônia de Férias RoboEduc',
              fundos_adiados=['construtores','robotica','gincana','conquistas','lobby'],assets=entries)
    (A/'manifest.json').write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n')
    CAT.write_text(json.dumps({e['caminho']:e for e in entries},ensure_ascii=False,indent=2)+'\n')
    print(f'Manifesto: {len(entries)} assets existentes; fundos adiados registrados.')


def main():
    global FORCE
    stages={'personagens':personagens,'fundos':fundos,'sons':sons,'revisao':revisao}
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--only',choices=stages);parser.add_argument('--force')
    args=parser.parse_args();FORCE=args.force
    (A/'preview').mkdir(parents=True,exist_ok=True)
    for name,fn in stages.items():
        if args.only is None or args.only==name:fn()

if __name__=='__main__':main()
