"""Prepare Mundo 2 jobs and build the first review checkpoint offline."""
from pathlib import Path
import ast,json,argparse
ROOT=Path(__file__).resolve().parents[1]
A=ROOT/'assets'


def prepare():
    tree=ast.parse((ROOT/'tools/make_requests.py').read_text())
    style=next(ast.literal_eval(n.value) for n in tree.body if isinstance(n,ast.Assign) and any(isinstance(t,ast.Name) and t.id=='STYLE' for t in n.targets))
    refs=['assets/personagens/ruivo/idle.png','referencias/kit/personagens/01_heroi-explorador.png']
    common='''
Use case: identity-preserve. Asset: isometric full-body animation sprite strip.
Input 1 is the APPROVED current platform sprite: strict identity, proportions, clothes, palette and physical scale reference. Input 2 is the official campaign character design reference only; REMOVE the handheld map and omit the logo, as in input 1.
Character: same small red-haired boy with huge head, spiky orange hair, brown eyes, open white lab coat, blue T-shirt, beige cargo shorts, olive green backpack with rolled green bedroll, binoculars hanging at chest, white socks and BLUE-and-white sneakers. Hands EMPTY in every frame. No map, headset, controller, box, tool, logo or text. Do not add accessories or change the backpack color.
Camera: orthographic isometric game camera elevated 35 degrees above horizon, looking down. Show top surfaces of hair, shoulders and shoes. Preserve the approved character proportions, not an older or taller child. Same scale for every pose; never make running frames smaller. Fully transparent background, no ground, no cast shadow, no rim glow or ambient haze. Alpha 255 inside character and 0 outside silhouette.
Layout: one horizontal row, full body in every cell, large transparent gaps between poses and margins on ALL sides, no overlap or cropping. No cell borders, captions or arrows. Keep head size and model scale identical across the strip.
'''
    poses={
      'frente_idle':(2,'''FRONT three-quarter view from ABOVE. Boy faces diagonally DOWN-RIGHT on the screen: toward viewer and a little to the right. We see face, chest, and the right side of body, PLUS top of hair and shoulders. Not a level camera and not a side profile. Both feet point diagonally down-right. Frame 1 relaxed happy standing, arms relaxed, EMPTY hands. Frame 2 exactly same stance and proportions, subtle breathing and blink. Blue shirt clearly visible, binoculars hanging at neck.'''),
      'costas_corrida':(4,'''REAR three-quarter view from ABOVE. Boy runs diagonally UP-RIGHT on the screen, AWAY from viewer, showing back of head, BACKPACK, coat back and right side of body. The face and chest must NOT turn toward camera. Four successive run phases: right leg forward/left back; passing; left leg forward/right back; opposite passing. Arms swing opposite legs, both hands empty. Show blue-and-white sneaker uppers and blue shirt at side/coat opening so BLUE team remains readable from behind, without adding symbols or changing clothing. Use the same compact child scale as front view. No front-facing or sideways poses.''')}
    jobs=json.loads((ROOT/'tools/requests_mundo2.json').read_text()) if (ROOT/'tools/requests_mundo2.json').exists() else {}
    for name,(n,pose) in poses.items():
        key='iso_ruivo_'+name
        prompt=style+common+f'Exactly {n} separate full-body poses, evenly spaced from left to right.\n'+pose
        path=ROOT/'tools/prompts'/f'{key}.txt';path.write_text(prompt)
        jobs[key]=dict(key=key,out=f'assets/_bruto/{key}.png',size='1536x1024',refs=refs,prompt_file=str(path.relative_to(ROOT)),prompt=prompt,transparent=True,quadros=n,destino=f'assets/personagens/ruivo/iso/{name}.png')
    (ROOT/'tools/requests_mundo2.json').write_text(json.dumps(jobs,ensure_ascii=False,indent=2)+'\n')
    existing=ROOT/'tools/requests.json';req=json.loads(existing.read_text());req.update(jobs);existing.write_text(json.dumps(req,ensure_ascii=False,indent=2)+'\n')
    print('2 pedidos preparados; nenhuma imagem gerada por este script.')

def build_review():
    from PIL import Image,ImageDraw,ImageFont
    import numpy as np
    from post import split_poses,fit_cell,sheet,trim
    existing=Image.open(A/'personagens/ruivo/idle.png').convert('RGBA')
    current=[existing.crop((i*384,0,(i+1)*384,384)) for i in range(2)]
    def hair_width(im):
        im=trim(im);a=np.array(im)
        mask=(a[:,:,0]>200)&(a[:,:,1]>45)&(a[:,:,1]<145)&(a[:,:,2]<70)&(a[:,:,3]>200)
        mask[round(im.height*.5):]=False
        yy,xx=np.nonzero(mask)
        if not len(xx):raise ValueError('Hair calibration requires visible orange hair')
        return int(xx.max()-xx.min()+1)
    target=float(np.median([hair_width(f) for f in current]))
    derived={};calibration={}
    out=A/'personagens/ruivo/iso';out.mkdir(parents=True,exist_ok=True)
    for name,n in [('frente_idle',2),('costas_corrida',4)]:
        path=A/'_bruto/native'/f'iso_ruivo_{name}.png'
        poses=split_poses(Image.open(path),n)
        source_hair=float(np.median([hair_width(f) for f in poses]))
        scale=target/source_hair
        frames=fit_cell(poses,scale=scale)
        sheet(frames,n).save(out/f'{name}.png')
        for f in frames:
            assert f.size==(384,384) and f.getbbox()[3]==376
            assert f.getchannel('A').getextrema()[0]==0
        derived[name]=frames
        calibration[name]=dict(target_hair_width=target,native_hair_width=source_hair,scale=scale,heights=[f.getbbox()[3]-f.getbbox()[1] for f in frames],method='one uniform factor for entire strip; head width matched to current platform sprite; projected body height changes with elevated camera')
    log=A/'_log/mundo2';log.mkdir(parents=True,exist_ok=True)
    (log/'calibracoes_ruivo.json').write_text(json.dumps(calibration,ensure_ascii=False,indent=2)+'\n')
    c=Image.new('RGB',(1920,960),'#1E2A4A');d=ImageDraw.Draw(c)
    font=ImageFont.truetype(str(A/'fonts/Fredoka[wdth,wght].ttf'),23)
    titlefont=ImageFont.truetype(str(A/'fonts/Fredoka[wdth,wght].ttf'),32)
    rows=[('FRENTE · câmera alta · comparação em pixels reais',[(current[0],'idle atual · 1'),(current[1],'idle atual · 2'),*[(f,f'frente_idle · {i+1}') for i,f in enumerate(derived['frente_idle'])]]),
          ('COSTAS · câmera alta · comparação em pixels reais',[(current[0],'idle atual'),*[(f,f'costas_corrida · {i+1}') for i,f in enumerate(derived['costas_corrida'])]])]
    for row,(title,items) in enumerate(rows):
        y=row*480;d.text((22,y+12),title,font=titlefont,fill='white')
        for i,(f,label) in enumerate(items):
            x=i*384
            d.line((x+10,y+62+376,x+374,y+62+376),fill='#3E93D0',width=1)
            c.paste(f,(x,y+62),f)
            d.text((x+18,y+444),label,font=font,fill='white')
    c.save(A/'preview/ruivo_iso_comparacao.png')
    print(json.dumps(calibration,ensure_ascii=False))
    print('Prévia: assets/preview/ruivo_iso_comparacao.png')

if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('action',choices=['prepare','build-review']);args=parser.parse_args()
    if args.action=='prepare':prepare()
    else:build_review()
