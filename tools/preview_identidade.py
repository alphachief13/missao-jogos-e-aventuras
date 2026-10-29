"""Compose an inspection sheet from real kit references and exported sprites (no IA)."""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageOps
from post import trim
ROOT=Path(__file__).resolve().parents[1]
A=ROOT/'assets'

def ruivo():
    canvas=Image.new('RGB',(1536,1180),'#F7F4ED')
    draw=ImageDraw.Draw(canvas)
    font=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',26)
    for x,label in [(45,'REFERÊNCIA · KIT NOVO'),(800,'RUIVO · SPRITE NOVO')]:
        draw.text((x,24),label,font=font,fill='#1E2A4A')
    for path,box in [(ROOT/'referencias/kit/personagens/01_heroi-explorador.png',(40,80,710,535)),(A/'personagens/ruivo/frames/idle_0.png',(800,80,710,535))]:
        im=trim(Image.open(path))
        im=ImageOps.contain(im,(box[2],box[3]),Image.Resampling.LANCZOS)
        canvas.paste(im,(box[0]+(box[2]-im.width)//2,box[1]+(box[3]-im.height)//2),im)
    poses=Image.open(A/'preview/ruivo_poses.png').convert('RGB')
    canvas.paste(poses,(0,620))
    out=A/'preview/ruivo_comparacao_kit_novo.png'
    canvas.save(out)
    print(out)
if __name__=='__main__':ruivo()
