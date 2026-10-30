"""Eight new real-world toy effects for Mundo 2; existing audio is preserved."""
from pathlib import Path
import json,wave
import numpy as np
from sfx import RATE,PEAK,clock,fade,marimba,wood,pop,clap
DURATIONS={'pegar':.19,'soltar':.15,'empurrar':.4,'construir':.57,'ajudar':.49,'caiu':.36,'missao':1.2,'placa':.18}

def make(name):
    data=np.zeros(round(DURATIONS[name]*RATE))
    def put(start,sound,gain=1):
        i=round(start*RATE);n=min(len(sound),len(data)-i)
        if n>0:data[i:i+n]+=gain*sound[:n]
    if name=='pegar':
        t=clock(.18);put(0,fade(np.sin(2*np.pi*(410*t+1800*t*t))*np.exp(-t*28)))
    elif name=='soltar':put(0,wood(.12,17));put(.015,pop(.09),.25)
    elif name=='empurrar':
        t=clock(.4);noise=np.random.default_rng(203).normal(0,1,len(t))
        soft=np.convolve(noise,np.ones(14)/14,mode='same')
        pulse=.65+.2*np.sin(2*np.pi*10*t)+.1*np.sin(2*np.pi*22.5*t)
        put(0,fade(soft*pulse,.004,.004))
    elif name=='construir':
        for start in [0,.11,.22]:put(start,pop(.10));put(start,wood(.06,23),.20)
        put(.30,marimba(1046.5,.26),.7)
    elif name=='ajudar':
        put(0,marimba(659.25,.21));put(.12,marimba(987.77,.24));put(.30,clap(.13,28),.18)
    elif name=='caiu':
        t=clock(.35);phase=2*np.pi*(410*t-310*t*t)
        put(0,fade((np.sin(phase)+.14*np.sin(2*phase))*np.exp(-t*13),.004,.025))
    elif name=='missao':
        for start,freq in [(0,523.25),(.14,659.25),(.28,783.99),(.47,1046.5),(.80,1318.51)]:put(start,marimba(freq,.32))
        put(.73,clap(.13,31),.10);put(1.01,clap(.13,32),.10)
    elif name=='placa':
        t=clock(.17);put(0,fade(np.sin(2*np.pi*135*t)*np.exp(-t*28)));put(0,wood(.09,39),.5)
    else:raise ValueError(name)
    return data

def build():
    A=Path(__file__).resolve().parents[1]/'assets';out=A/'sons';out.mkdir(exist_ok=True)
    info={}
    for name,duration in DURATIONS.items():
        data=make(name);data*=PEAK/max(float(np.max(np.abs(data))),1e-9)
        pcm=np.int16(np.round(data*32767))
        with wave.open(str(out/f'{name}.wav'),'wb') as f:
            f.setnchannels(1);f.setsampwidth(2);f.setframerate(RATE);f.writeframes(pcm.tobytes())
        info[name]=dict(duracao=duration,sample_rate=RATE,canais=1,pico_dbfs=round(float(20*np.log10(np.max(np.abs(pcm.astype(float)))/32767)),4),loop=name=='empurrar')
    (A/'_log/mundo2/sons.json').write_text(json.dumps(info,ensure_ascii=False,indent=2)+'\n')
    print('8 novos WAVs PCM16 mono, 44100 Hz, pico −3 dBFS; sem IA.')
    return info

if __name__=='__main__':build()
