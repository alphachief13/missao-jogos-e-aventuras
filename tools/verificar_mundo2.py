"""Check every Mundo 2 deliverable, including cells, alpha, grounding and audio."""
from pathlib import Path
import wave,hashlib,json
import numpy as np
from PIL import Image
from mundo2_restante import ANIMS,CHARS
from mundo2_enfeites import SIZES
from sfx_mundo2 import DURATIONS
A=Path(__file__).resolve().parents[1]/'assets'
frames=0
for char in CHARS:
    for anim,n in ANIMS.items():
        p=A/f'personagens/{char}/iso/{anim}.png';im=Image.open(p)
        assert im.mode=='RGBA' and im.size==(384*n,384),(p,im.mode,im.size)
        for i in range(n):
            cell=im.crop((384*i,0,384*(i+1),384));bbox=cell.getbbox()
            assert bbox and bbox[3]==376,(p,i,bbox)
            alpha=np.asarray(cell.getchannel('A'),dtype=float)
            assert alpha.min()==0 and alpha.max()>=250,(p,i,'alpha')
            cx=float((alpha.sum(axis=0)*np.arange(384)).sum()/alpha.sum())
            assert abs(cx-192)<=1.1,(p,i,cx)
            assert bbox[0]>0 and bbox[2]<384 and bbox[1]>0,(p,i,'clipped edge',bbox)
            frames+=1
for name,size in SIZES.items():
    p=A/f'mundo2/enfeites/{name}.png';im=Image.open(p)
    assert im.mode=='RGBA' and im.size==size,(p,im.mode,im.size)
    bbox=im.getbbox();assert bbox[3]==im.height,(p,'floating base')
    assert abs((bbox[0]+bbox[2])/2-im.width/2)<=1,(p,'not centered')
    alpha=np.asarray(im.getchannel('A'));assert alpha.min()==0 and alpha.max()>=250
for name,duration in DURATIONS.items():
    with wave.open(str(A/f'sons/{name}.wav')) as f:
        assert (f.getframerate(),f.getnchannels(),f.getsampwidth())==(44100,1,2)
        assert abs(f.getnframes()/f.getframerate()-duration)<1/44100
        samples=np.frombuffer(f.readframes(f.getnframes()),dtype='<i2').astype(float)
        peak=20*np.log10(np.max(np.abs(samples))/32767)
        assert abs(peak+3)<.01,(name,peak)
# User-approved checkpoint outputs remain byte-identical.
protected=json.loads((A/'_log/mundo2/protegidos.json').read_text())
for rel,sha in protected.items():assert hashlib.sha256((A/rel).read_bytes()).hexdigest()==sha,rel
for name in ['personagens_iso.png','enfeites_mundo2.png']:assert (A/'preview'/name).is_file()
print(f'Mundo 2: 56 tiras, {frames} células, 11 enfeites ancorados, 8 WAVs e arquivos aprovados conferidos.')
