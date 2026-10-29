"""Additional deterministic checks for the delivered identity assets."""
import wave
from pathlib import Path
from PIL import Image
import numpy as np
A=Path(__file__).resolve().parents[1]/'assets'
for p in ['ruivo','loira','cacheado','sapo']:
    for name,n in [('idle',2),('corrida',4),('pulo',1),('queda',1),('empurrar',1),('derrota',1),('vitoria',1),('aceno',1)]:
        im=Image.open(A/f'personagens/{p}/{name}.png')
        assert im.size==(384*n,384) and im.mode=='RGBA',(p,name)
        for i in range(n):
            cell=im.crop((384*i,0,384*(i+1),384))
            assert cell.getbbox()[3]==376,(p,name,i,cell.getbbox())
    for kind,n in [('idle',2),('corrida',4)]:
        assert Image.open(A/f'preview/{p}_{kind}.gif').n_frames==n
    portrait=Image.open(A/f'personagens/{p}/retrato.png')
    assert portrait.size==(256,256) and portrait.getpixel((0,0))[3]==0
mid=Image.open(A/'fundos/exploradores/meio.png');a=np.array(mid.getchannel('A'))
assert mid.size==(2400,1080) and np.count_nonzero(a)>0
assert a[:650,700:1700].max()==0
far=Image.open(A/'fundos/exploradores/longe.png')
assert far.mode=='RGB' and far.size==(2400,1080)
expected={'pulo','pouso','bandeira','peca','alavanca','botao','chegada','perdeu_coracao','derrota','vitoria','clique','trocar','entrou','contagem','compra'}
assert {p.stem for p in (A/'sons').glob('*.wav')}==expected
for p in (A/'sons').glob('*.wav'):
    with wave.open(str(p)) as f:
        assert f.getnchannels()==1 and f.getframerate()==44100 and f.getsampwidth()==2
        duration=f.getnframes()/f.getframerate()
        a=np.frombuffer(f.readframes(f.getnframes()),dtype='<i2').astype(float)/32767
        assert abs(20*np.log10(np.max(np.abs(a)))+3)<.01
        assert duration<.6 or p.stem in ['vitoria','contagem']
print('Conferidos: 48 poses, baseline 376, 4 retratos sem moldura, 8 GIFs, alfa do meio e 15 WAVs.')
