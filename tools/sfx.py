"""Real-world toy effects: marimba, whistle, wooden clacks, block pops and claps.

Deterministic PCM16 WAV, 44.1 kHz mono, peak -3 dBFS. No square waves.
"""
from pathlib import Path
import wave
import numpy as np

RATE=44100
PEAK=10**(-3/20)
DURATIONS={'pulo':.28,'pouso':.16,'bandeira':.48,'peca':.22,'alavanca':.18,
           'botao':.19,'chegada':.48,'perdeu_coracao':.42,'derrota':.56,
           'vitoria':2.25,'clique':.065,'trocar':.25,'entrou':.36,'contagem':3.,'compra':.32}


def clock(duration):
    return np.arange(round(duration*RATE))/RATE


def fade(data,attack=.002,release=.015):
    t=np.arange(len(data))/RATE
    return data*np.minimum(1,t/attack)*np.minimum(1,(len(data)/RATE-t)/release)


def marimba(freq,duration=.18):
    t=clock(duration)
    # Short fundamental plus the characteristic rapidly decaying fourth partial.
    data=np.sin(2*np.pi*freq*t)*np.exp(-t*19)
    data+=.30*np.sin(2*np.pi*4*freq*t)*np.exp(-t*49)
    return fade(data)


def whistle(freq=1800,duration=.15):
    t=clock(duration)
    phase=2*np.pi*freq*t+.11*np.sin(2*np.pi*29*t)
    return fade(np.sin(phase)*(1+.07*np.sin(2*np.pi*17*t)),.014,.035)


def wood(duration=.09,seed=3):
    t=clock(duration);rng=np.random.default_rng(seed)
    noise=rng.normal(0,1,len(t))
    noise=np.convolve(noise,[.2,.6,.2],mode='same')
    data=(.5*noise+.7*np.sin(2*np.pi*780*t)+.4*np.sin(2*np.pi*1240*t))*np.exp(-t*80)
    return fade(data,.0008,.012)


def pop(duration=.10):
    t=clock(duration)
    phase=2*np.pi*(570*t-1700*t*t)
    return fade(np.sin(phase)*np.exp(-t*55),.001,.015)


def clap(duration=.13,seed=11):
    t=clock(duration);noise=np.random.default_rng(seed).normal(0,1,len(t))
    noise=np.r_[0,np.diff(noise)]
    env=np.exp(-t*55)
    for onset in [.009,.019]:env+=np.where(t>=onset,np.exp(-np.maximum(t-onset,0)*85)*.5,0)
    return fade(noise*env,.001,.02)


def make(name):
    data=np.zeros(round(DURATIONS[name]*RATE))
    def put(start,sound,gain=1):
        i=round(start*RATE);n=min(len(sound),len(data)-i)
        if n>0:data[i:i+n]+=sound[:n]*gain
    def notes(items,length=.18):
        for start,freq in items:put(start,marimba(freq,length))
    if name=='pulo':notes([(0,523.25),(.085,783.99)])
    elif name=='pouso':
        t=clock(.15);put(0,fade(np.sin(2*np.pi*105*t)*np.exp(-t*38)));put(0,wood(.06),.12)
    elif name=='bandeira':notes([(0,523.25),(.12,659.25),(.24,783.99)],.22)
    elif name=='peca':put(0,pop());put(.035,marimba(1318.51),.65)
    elif name=='alavanca':put(0,wood());put(.065,wood(.08,5),.55)
    elif name=='botao':put(0,marimba(1046.5,.18))
    elif name=='chegada':
        t=clock(.46);put(0,fade((np.sin(2*np.pi*1046.5*t)+.3*np.sin(2*np.pi*2.76*1046.5*t))*np.exp(-t*10)))
    elif name=='perdeu_coracao':notes([(0,523.25),(.16,392)],.24)
    elif name=='derrota':notes([(0,523.25),(.16,440),(.32,349.23)],.23)
    elif name=='vitoria':
        notes([(0,523.25),(.16,659.25),(.32,783.99),(.54,1046.5),(.94,783.99),(1.13,1046.5),(1.45,1318.51)],.35)
        for i,start in enumerate([.72,1.02,1.32,1.62,1.92]):put(start,clap(seed=21+i),.22)
    elif name=='clique':put(0,wood(.06),.3)
    elif name=='trocar':
        t=clock(.24);noise=np.random.default_rng(42).normal(0,1,len(t))
        filtered=np.convolve(noise,np.ones(12)/12,mode='same')
        put(0,fade(filtered*np.sin(np.pi*t/.24)**2,.015,.025))
    elif name=='entrou':put(0,whistle(1568,.13));put(.16,whistle(2093,.18))
    elif name=='contagem':
        for start in [0,.8,1.6]:put(start,whistle(1568,.12))
        put(2.4,whistle(2093,.50))
    elif name=='compra':put(0,pop());put(.07,wood(.07),.3);put(.09,marimba(987.77,.22))
    else:raise ValueError(name)
    return data


def build(out):
    out=Path(out);out.mkdir(parents=True,exist_ok=True);info={}
    for name,duration in DURATIONS.items():
        data=make(name);data*=PEAK/max(np.max(np.abs(data)),1e-9)
        pcm=np.int16(np.round(data*32767))
        with wave.open(str(out/f'{name}.wav'),'wb') as f:
            f.setnchannels(1);f.setsampwidth(2);f.setframerate(RATE);f.writeframes(pcm.tobytes())
        peak=20*np.log10(np.max(np.abs(pcm.astype(float)))/32767)
        assert abs(peak+3)<.01
        assert duration<.6 or name in ('vitoria','contagem')
        info[name]=dict(duracao=duration,sample_rate=RATE,canais=1,pico_dbfs=round(float(peak),4))
    return info

if __name__=='__main__':
    import json
    print(json.dumps(build(Path(__file__).resolve().parents[1]/'assets/sons'),indent=2))
