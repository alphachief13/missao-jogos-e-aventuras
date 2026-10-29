"""Completeness and format checks against the requested production asset list."""
import json
from pathlib import Path
from PIL import Image

ROOT=Path(__file__).resolve().parents[1]
A=ROOT/'assets'
COLORS=['azul','rosa','amarelo','verde']
CHARS=['ruivo','loira','cacheado','sapo']


def expected():
    paths=set()
    def add(folder,names):
        paths.update(folder+'/'+name+'.png' for name in names)
    add('kit',['logo_missao_gamer','logo_missao_gamer_w800','logo_missao_gamer_roboeduc','logo_roboeduc','logo_roboeduc_etiqueta','chefao_referencia'])
    for i in range(1,6):add('kit',[f'selo_fase_{i}',f'selo_fase_{i}_w240',f'selo_fase_bloqueada_{i}'])
    add('ui',['estrela_xp','moeda','coracao','trofeu','raio','mapa','alvo','portal','bloco','barra_xp','mais_10_xp','fase_desbloqueada','missao_cumprida','conquista','descoberta','trabalho_em_equipe','botao_start','coracoes_vida'])
    for color in COLORS:add('ui',[f'gema_{color}',f'gema_{color}_48'])
    singles=['pulo','queda','empurrar','derrota','vitoria','aceno']
    for p in CHARS:
        add('personagens/'+p,['idle','corrida',*singles,'retrato','card','card_cinza'])
        add(f'personagens/{p}/frames',['idle_0','idle_1',*[f'corrida_{i}' for i in range(4)],*singles])
    add('npcs',['leao','astronauta','robo_campeao','mascotes_xp','abelha_voo','pinguim_festa','leao_aceno'])
    for name in ['abelha_voo','pinguim_festa','leao_aceno']:add('npcs/frames',[name+'_0',name+'_1'])
    for world in ['menu','block_city','dino_attack','space_mission','mystery_game','final_boss','lobby','selecao_fases']:
        add('fundos/'+world,['longe'] if world in ['lobby','selecao_fases'] else ['longe','meio'])
    add('texturas',['pedra_dino','fosseis_decal','painel_espacial','lombadas_livros','madeira_clara','energia_azul','energia_rosa','energia_amarelo','gosma_verde','curto_circuito'])
    for color in COLORS:
        add('ui',[f'_base_botao_{color}',f'_base_botao_redondo_{color}',f'etiqueta_nome_{color}',f'hud_time_{color}'])
        for control in ['esquerda','direita','pular','trocar','acao']:add('ui',[f'ctrl_{control}_{color}',f'ctrl_{control}_{color}_pressionado'])
    add('ui',['_base_painel','_base_tecla','hud_cronometro'])
    for row in range(3):add('ui/painel_9slice',[f'{row}_{col}' for col in range(3)])
    for name in ['jogar','entrar','criar_sala','fases','como_jogar','pronto','reiniciar','proxima','menu','continuar']:add('ui',[f'botao_{name}',f'botao_{name}_hover'])
    add('ui',[f'ctrl_{name}' for name in ['esquerda','direita','pular','trocar','acao']])
    add('ui',[f'icone_{name}' for name in ['pausa','som_ligado','som_desligado','reiniciar','casa','wifi','coroa']])
    add('ui',[f'tecla_{name}' for name in ['w','a','d','s','cima','baixo','esquerda','direita','tab','espaco']])
    add('ui',[f'marcador_jogador_{i}' for i in range(1,5)])
    add('ui',[f'tela_{name}' for name in ['titulo','lobby','vitoria','derrota','como_jogar','controle_celular','controle_celular_paisagem']])
    add('particulas',[f'brilho_{color}' for color in COLORS+['branco']]+['estrelinha','faisca','poeira']+[f'gota_{color}' for color in COLORS]+[f'bloquinho_{color}' for color in COLORS])
    paths.update('sons/'+name+'.wav' for name in ['pulo','pouso','gema','estrela_xp','alavanca','botao','portal_abre','derrota','vitoria','clique_ui','trocar_personagem','jogador_entrou','contagem_regressiva','chefao_soco'])
    paths.update('fonts/'+name for name in ['Fredoka[wdth,wght].ttf','Nunito[wght].ttf','Nunito-Italic[wght].ttf'])
    return paths


def verify():
    manifest=json.loads((A/'manifest.json').read_text())
    entries=manifest['assets'];by_path={e['caminho']:e for e in entries}
    assert len(by_path)==len(entries),'Duplicate manifest paths'
    missing=expected()-set(by_path)
    if missing:raise AssertionError('Missing required assets: '+', '.join(sorted(missing)))
    for path in expected():
        assert (A/path).is_file(),path
        entry=by_path[path]
        assert all(k in entry for k in ['caminho','tipo','largura','altura','origem','refs']),path
        assert entry['origem'] in ['kit','ia','script'],path
        if path.endswith('.png'):
            im=Image.open(A/path);assert im.size==(entry['largura'],entry['altura']),path
        if path.startswith('personagens/'):
            assert 'time' in entry and 'cor_hex' in entry,path
            if path.endswith(('/idle.png','/corrida.png')):
                count=2 if path.endswith('/idle.png') else 4
                assert entry['quadros']==count and im.size==(384*count,384),path
                assert entry['ancora']==[192,376] and entry['hitbox']==dict(x=132,y=60,w=120,h=316),path
                assert entry['fps']==(3 if count==2 else 10),path
            if '/frames/' in path or Path(path).stem in ['idle','corrida','pulo','queda','empurrar','derrota','vitoria','aceno']:
                assert im.mode=='RGBA' and im.getchannel('A').getextrema()[0]==0,path
    for p in CHARS:
        for anim,count in [('idle',2),('corrida',4)]:
            im=Image.open(A/f'preview/{p}_{anim}.gif');assert im.n_frames==count
    for name in ['personagens','fundos','texturas','ui','sprites_sobre_fundos']:
        assert (A/f'preview/{name}.png').exists(),name
    (A/'_log/validacao.json').write_text(json.dumps(dict(status='passou',assets_obrigatorios=len(expected()),assets_manifesto=len(entries),faltantes=[]),ensure_ascii=False,indent=2))
    print(f'Completeness: {len(expected())} required assets present; {len(entries)} catalogued.')


if __name__=='__main__':verify()
