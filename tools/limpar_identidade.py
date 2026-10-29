"""Archive obsolete campaign assets without touching current sprites, kit art or fonts."""
from pathlib import Path
import json,shutil
ROOT=Path(__file__).resolve().parents[1]
A=ROOT/'assets'
ARCHIVE=A/'_bruto/_arquivo_missao_gamer'
REQUESTS=json.loads((ROOT/'tools/requests.json').read_text())
CHARS=['ruivo','loira','cacheado','sapo']
ACTIVE={key for key in REQUESTS if (A/'_bruto'/f'{key}.png.prompt.txt').exists() and 'Real-world play only' in (A/'_bruto'/f'{key}.png.prompt.txt').read_text()}
moved=[]
def archive(p,rel=None):
    if not p.exists():return
    dest=ARCHIVE/(rel or p.relative_to(A))
    dest.parent.mkdir(parents=True,exist_ok=True)
    if dest.exists():
        # Identical duplicate snapshots can be safely removed; otherwise preserve both.
        if p.is_file() and dest.is_file() and p.read_bytes()==dest.read_bytes():p.unlink();return
        dest=dest.with_name(dest.name+'.anterior')
        if dest.exists():raise FileExistsError(dest)
    shutil.move(str(p),str(dest));moved.append(str(p.relative_to(ROOT)))
for p in (A/'ui').glob('*'):
    if p.is_file() and not (p.name.startswith(('ic_','bandeira_')) and p.suffix=='.png'):archive(p)
allowed={'logo.png','logo_roboeduc.png',*[f'selo_{i}.png' for i in range(1,6)]}
for p in (A/'kit').glob('*'):
    if p.name not in allowed:archive(p)
for name in ['texturas','npcs']:archive(A/name)
for p in (A/'personagens').glob('*/card*.png'):archive(p)
for world in ['menu','block_city','dino_attack','space_mission','mystery_game','final_boss','selecao_fases']:archive(A/'fundos'/world)
for name in ['gema','estrela_xp','portal_abre','clique_ui','trocar_personagem','jogador_entrou','contagem_regressiva','chefao_soco']:archive(A/'sons'/f'{name}.wav')
keep={'personagens.png','fundos.png','sprites_sobre_fundos.png','ruivo_comparacao_kit_novo.png',
      *[f'{p}_{kind}.gif' for p in CHARS for kind in ['idle','corrida']],
      *[f'{p}_poses.png' for p in CHARS],*[f'revisao_{k}.png' for k in ACTIVE]}
for p in (A/'preview').iterdir():
    if p.name not in keep:archive(p)
for p in (A/'_bruto').iterdir():
    if p==ARCHIVE:continue
    if p.name=='native':
        for q in p.iterdir():
            if q.stem not in ACTIVE:archive(q,Path('native')/q.name)
    elif p.name=='reprovados':
        for q in p.iterdir():
            if q.name!='ruivo_corrida_nova_v1.png':archive(q,Path('reprovados')/q.name)
    elif p.is_file():
        key=p.name.removesuffix('.prompt.txt').removesuffix('.png')
        if key not in ACTIVE:archive(p,Path('brutos')/p.name)
    else:archive(p,Path('brutos')/p.name)
for name in ['ui_assets.py','preview_ruivo.py']:
    archive(ROOT/'tools'/name,Path('ferramentas')/name)
for p in (ROOT/'tools/prompts').glob('*.txt'):
    if p.stem not in REQUESTS:archive(p,Path('ferramentas/prompts')/p.name)
# Remove the stale old-style standalone prompt, now superseded by prompts/ruivo_idle.txt.
archive(ROOT/'tools/ruivo_idle.txt',Path('ferramentas/ruivo_idle.txt'))
log=A/'_log/limpeza_nova_identidade.json'
if log.exists():moved=json.loads(log.read_text())['arquivados']+moved
log.write_text(json.dumps({'arquivados':moved,'destino':str(ARCHIVE.relative_to(ROOT))},ensure_ascii=False,indent=2)+'\n')
print(f'{len(moved)} itens obsoletos arquivados em {ARCHIVE.relative_to(ROOT)}')
