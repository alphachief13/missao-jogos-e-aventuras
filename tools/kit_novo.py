"""Copia e recorta os itens prontos do kit "Missão, Jogos e Aventuras" para assets/ (sem IA).

Uso: .venv/bin/python tools/kit_novo.py
Gera: logos, selos das fases, ícones, bandeirinhas nas cores dos times, arte e retrato provisório
dos personagens e fundos provisórios (o Codex substitui os fundos e os retratos depois).
"""
import colorsys
from pathlib import Path

import numpy as np
from PIL import Image

RAIZ = Path(__file__).resolve().parent.parent
KIT = RAIZ / 'referencias/kit'
A = RAIZ / 'assets'


def trim(im):
    return im.crop(im.getchannel('A').getbbox())


def caber(im, lado):
    im = im.copy()
    im.thumbnail((lado, lado), Image.LANCZOS)
    return im


def salvar(im, caminho):
    caminho.parent.mkdir(parents=True, exist_ok=True)
    im.save(caminho, optimize=True)


def abrir(rel):
    return Image.open(KIT / rel).convert('RGBA')


def so_o_maior_da_direita(im):
    """Mantém só a maior mancha (componente conexo do alfa) cujo centro está na metade direita."""
    a = np.asarray(im.getchannel('A')) > 30
    pequeno = Image.fromarray(a.astype(np.uint8) * 255).resize((im.width // 4, im.height // 4), Image.NEAREST)
    m = np.asarray(pequeno) > 0
    rot = np.zeros(m.shape, np.int32)
    n = 0
    melhor, melhor_area = 0, 0
    for y0, x0 in zip(*np.nonzero(m)):
        if rot[y0, x0]:
            continue
        n += 1
        pilha, pts = [(y0, x0)], []
        rot[y0, x0] = n
        while pilha:
            y, x = pilha.pop()
            pts.append((y, x))
            for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                yy, xx = y + dy, x + dx
                if 0 <= yy < m.shape[0] and 0 <= xx < m.shape[1] and m[yy, xx] and not rot[yy, xx]:
                    rot[yy, xx] = n
                    pilha.append((yy, xx))
        cx = sum(p[1] for p in pts) / len(pts)
        if cx > m.shape[1] * 0.25 and len(pts) > melhor_area:
            melhor, melhor_area = n, len(pts)
    mascara = Image.fromarray(((rot == melhor) * 255).astype(np.uint8)).resize(im.size, Image.NEAREST)
    out = im.copy()
    out.putalpha(Image.fromarray(np.minimum(np.asarray(im.getchannel('A')), np.asarray(mascara))))
    return out


# ---------- logos e selos ----------
logo = trim(abrir('01_logo/logo_missao-jogos-e-aventuras_colonia-de-ferias.png'))
salvar(caber(logo, 800), A / 'kit/logo.png')
salvar(trim(abrir('01_logo/logo_roboeduc_transparente.png')), A / 'kit/logo_roboeduc.png')
SELOS = ['fase_1_exploradores-em-acao', 'fase_2_desafio-dos-construtores', 'fase_3_mestres-da-robotica',
         'fase_4_gincana-das-aventuras', 'fase_5_grandes-conquistas']
for i, nome in enumerate(SELOS, 1):
    salvar(caber(trim(abrir(f'04_fases/{nome}.png')), 240), A / f'kit/selo_{i}.png')

# ---------- ícones ----------
ICONES = {'mapa': '01_mapa-do-tesouro', 'bussola': '02_bussola', 'lupa': '03_lupa', 'bloco': '04_bloco-de-montar',
          'engrenagem': '05_engrenagem', 'robozinho': '06_robozinho', 'lampada': '07_lampada-ideia', 'cone': '08_cone-gincana',
          'bandeirinha': '09_bandeirinha', 'trofeu': '10_trofeu', 'medalha': '11_medalha', 'passaporte': '12_passaporte'}
for nome, arq in ICONES.items():
    salvar(caber(trim(abrir(f'05_elementos/icones/icone_{arq}.png')), 128), A / f'ui/ic_{nome}.png')

# Bandeirinha de cada time: troca só os tons amarelos do tecido (o mastro marrom fica igual).
CORES = {'azul': '#3E93D0', 'rosa': '#E3205D', 'amarelo': '#F6BB33', 'verde': '#A0C630'}
band = caber(trim(abrir('05_elementos/icones/icone_09_bandeirinha.png')), 128)
arr = np.asarray(band).astype(np.float32) / 255
for cor, hexa in CORES.items():
    alvo_h, alvo_l, alvo_s = colorsys.rgb_to_hls(*(int(hexa[i:i + 2], 16) / 255 for i in (1, 3, 5)))
    out = arr.copy()
    for y in range(arr.shape[0]):
        for x in range(arr.shape[1]):
            r, g, b, a = arr[y, x]
            if a < 0.05:
                continue
            h, l, s = colorsys.rgb_to_hls(r, g, b)
            if 0.09 < h < 0.19 and s > 0.45:  # amarelo do tecido
                nl = min(1, max(0, l + (alvo_l - 0.55)))
                out[y, x, :3] = colorsys.hls_to_rgb(alvo_h, nl, max(s * 0.9, alvo_s * 0.9))
    salvar(Image.fromarray((out * 255).astype(np.uint8)), A / f'ui/bandeira_{cor}.png')

# ---------- personagens jogáveis: arte do kit (cards do lobby) + retrato provisório ----------
ARTE = {'ruivo': '01_heroi-explorador', 'cacheado': '02_fase1-explorador-cacheado', 'loira': '03_fase2-construtora-loira',
        'sapo': '05_fase4-gincana-leao-e-sapo'}
for pid, arq in ARTE.items():
    im = abrir(f'personagens/{arq}.png')
    if pid == 'sapo':  # a folha tem leão (esquerda) e sapo (direita): fica só com o sapo
        im = so_o_maior_da_direita(im.crop((int(im.width * 0.58), int(im.height * 0.31), im.width, im.height)))
    im = trim(im)
    salvar(caber(im, 520), A / f'personagens/{pid}/arte.png')
    # retrato: quadrado no alto da figura, centrado na cabeça
    alfa = np.asarray(im.getchannel('A')) > 40
    lado = int(min(im.width, im.height) * (0.62 if pid != 'sapo' else 0.7))
    faixa = alfa[: lado // 2]
    xs = np.where(faixa.any(axis=0))[0]
    cx = int(xs.mean()) if len(xs) else im.width // 2
    x0 = max(0, min(im.width - lado, cx - lado // 2))
    ret = im.crop((x0, 0, x0 + lado, lado)).resize((256, 256), Image.LANCZOS)
    salvar(ret, A / f'personagens/{pid}/retrato.png')

# ---------- fundos provisórios (o Codex gera os definitivos em 2400x1080) ----------
def faixa_16x9(rel, destino, foco=0.55):
    im = Image.open(KIT / rel).convert('RGB')
    h = int(im.width * 9 / 16)
    y0 = int((im.height - h) * foco)
    salvar(im.crop((0, y0, im.width, y0 + h)).resize((2400, 1350), Image.LANCZOS).crop((0, 135, 2400, 1215)), destino)

faixa_16x9('06_fundos/fundo_aventura_9x16.png', A / 'fundos/exploradores/longe.png', 0.62)
faixa_16x9('06_fundos/fundo_claro_4x5.png', A / 'fundos/lobby/longe.png', 0.5)
transparente = Image.new('RGBA', (2400, 1080), (0, 0, 0, 0))
if not (A / 'fundos/exploradores/meio.png').exists():
    salvar(transparente, A / 'fundos/exploradores/meio.png')
print('ok')
