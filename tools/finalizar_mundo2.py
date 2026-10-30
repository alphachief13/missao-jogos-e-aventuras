"""Update metadata/report for the completed Mundo 2 assets without generating images."""
from pathlib import Path
from datetime import datetime,timezone
import json,sys
from PIL import Image
import build_assets
from mundo2_restante import CHARS,ANIMS,specs
from mundo2_enfeites import SIZES,GROUPS
ROOT=Path(__file__).resolve().parents[1];A=ROOT/'assets'
jobs=json.loads((ROOT/'tools/requests_mundo2.json').read_text())
colors={'ruivo':('azul','#3E93D0'),'loira':('rosa','#E3205D'),'cacheado':('amarelo','#F6BB33'),'sapo':('verde','#A0C630')}
for char in CHARS:
 for anim,n in ANIMS.items():
  source=f'iso_ruivo_{anim}' if char=='ruivo' and anim in ('frente_idle','costas_corrida') else next(f'm2_{char}_{group}' for group,(_,_,anims) in specs(char).items() if anim in dict(anims))
  path=f'personagens/{char}/iso/{anim}.png'
  build_assets.catalog[path]=dict(caminho=path,tipo='imagem',origem='ia',refs=jobs[source]['refs'],quadros=n,largura_quadro=384,altura_quadro=384,ancora=[192,376],time=colors[char][0],cor_hex=colors[char][1],camera_elevacao_graus=35,vista=anim.split('_')[0] if '_' in anim else 'frente',fonte_nativa=f'assets/_bruto/native/{source}.png')
for name,size in SIZES.items():
 source=next('m2_enfeites_'+group for group,(_,_,names) in GROUPS.items() if name in names)
 path=f'mundo2/enfeites/{name}.png'
 build_assets.catalog[path]=dict(caminho=path,tipo='imagem',origem='ia',refs=jobs[source]['refs'],ancora=[size[0]/2,size[1]],camera_elevacao_graus=35,fonte_nativa=f'assets/_bruto/native/{source}.png',**({'ajuste_cor':'saturação 48% para tons calmos'} if name=='guindaste' else {}))
for name,meta in json.loads((A/'_log/mundo2/sons.json').read_text()).items():
 path=f'sons/{name}.wav';build_assets.catalog[path]=dict(caminho=path,tipo='audio',origem='script',refs=[],**meta)
build_assets.manifest()
logs=A/'_log/geracoes.jsonl';entries=[json.loads(s) for s in logs.read_text().splitlines() if s.strip()]
m2=[]
for e in entries:
 key=Path(e['out']).stem
 if not key.startswith(('m2_','iso_ruivo_')):continue
 if key=='m2_ruivo_carregar' and 'CRITICAL POSE REQUIREMENT' not in e.get('prompt',''):
  e.update(status='reprovado_maos_ao_lado_da_cabeca',preservado_em='assets/_bruto/reprovados/m2_ruivo_carregar_v1_native.png')
 else:e['status']='aprovado_usuario' if key.startswith('iso_ruivo_') else 'revisado_visualmente'
 m2.append(e)
logs.write_text(''.join(json.dumps(e,ensure_ascii=False)+'\n' for e in entries))
assert len(m2)==22,len(m2)
state={'status':'concluído conforme CODEX_MUNDO2.md atualizado (sem céu pintado)','atualizado_em':datetime.now(timezone.utc).isoformat(),'geracoes_ia':22,'imagens_novas_apos_aprovacao':20,'por_etapa':{'ruivo':7,'loira':4,'cacheado':4,'sapo':4,'enfeites':3,'sons':0},'regeracoes':1,'interrupcoes':[{'pedido':'m2_ruivo_ar','resultado':'chamada interrompida sem imagem salva; cobrança não verificável'}],'arquivos':{'tiras':56,'quadros':124,'enfeites':11,'sons':8,'total':75},'folhas_inspecionadas':['personagens_iso.png','enfeites_mundo2.png','ruivo_iso.png','loira_iso.png','cacheado_iso.png','sapo_iso.png'],'pendencias':[],'ceu':'removido do escopo no documento atualizado','validacao':{'verificar_mundo2':'passou','verificar_assets':'75/75 assets novos prontos; 86 arquivos conferidos, nada faltando'}}
(A/'_log/mundo2/estado.json').write_text(json.dumps(state,ensure_ascii=False,indent=2)+'\n')
(A/'_log/mundo2/revisao_final.json').write_text(json.dumps({'folhas_abertas':state['folhas_inspecionadas'],'personagens':'identidade do kit, direções frente/costas, mãos vazias; time legível de costas; sem logos/headsets','enfeites':'tons calmos; placa sem texto/seta; bases ancoradas na última linha; sem fragmentos vizinhos','correcoes_sem_ia':['recorte por separações reais das linhas de atlas','remoção de fragmentos desconectados dos enfeites','guindaste dessaturado para tons calmos'],'regeracao':'ruivo carregar: mãos acima da cabeça'},ensure_ascii=False,indent=2)+'\n')
report=A/'RELATORIO.md';previous=report.read_text().split('\n\n# Mundo 2 —')[0]
report.write_text(previous+'''

# Mundo 2 — Desafio dos Construtores: concluído

A versão atual de `CODEX_MUNDO2.md` foi relida e seguida: personagens → enfeites → sons → conferência. **O céu pintado foi retirado do documento e não foi gerado.** As pendências da identidade anterior listadas acima continuam separadas desta entrega; **não há pendências de assets do Mundo 2**.

## Entregáveis

- **56 tiras isométricas / 124 quadros** em `assets/personagens/<id>/iso/`: 14 arquivos por personagem. Frente e costas de idle (2), corrida (4), pulo (1), queda (1), carregar (4), empurrar (2); ajudar (2) e caído (1), ambos de frente.
- **11 enfeites** em `assets/mundo2/enfeites/`: duas árvores, arbusto, flores, pedra, cerca, placa, pilha de blocos, guindaste, cone e carrinho. Dimensões exatas da especificação, RGBA, centro horizontal e base na borda inferior.
- **8 sons** em `assets/sons/`: pegar, soltar, empurrar, construir, ajudar, caiu, missao, placa. WAV PCM16 mono a 44.100 Hz, pico −3 dBFS. Marimba, madeira, pops, raspado e palmas; sem chiptune. Raspado de empurrar: 0,4 s, com transição curta nas extremidades; missão: 1,2 s.
- `assets/preview/personagens_iso.png` com os quatro personagens, todos os quadros e seus sprites de plataforma para comparação. `assets/preview/enfeites_mundo2.png` com todos os objetos. As folhas completas e as quatro folhas individuais **foram abertas e inspecionadas**.

## Uso de IA

**22 imagens concluídas no Mundo 2: 2 no checkpoint aprovado e 20 nesta continuação.**

| Etapa | Imagens de IA | Observação |
|---|---:|---|
| Ruivo | 7 | Duas tiras aprovadas + quatro atlas; uma correção adicional de carregar |
| Loira | 4 | Quatro atlas, sem regerações |
| Cacheado | 4 | Quatro atlas, sem regerações |
| Sapo | 4 | Quatro atlas, sem regerações |
| Enfeites | 3 | Árvores, oito objetos pequenos e guindaste |
| Sons, recorte, folhas e conferência | 0 | Scripts locais |

Também houve **uma chamada interrompida** de `m2_ruivo_ar`, sem PNG salvo encontrado. Ela não entra na contagem de imagens concluídas; não é possível confirmar eventual cobrança dessa tentativa.

Ferramenta `image_gen` nativa. Cada geração anexou as referências registradas em `tools/requests_mundo2.json`: sprite atual e personagem do kit; as vistas isométricas aprovadas do ruivo serviram de referência de câmera. Enfeites usaram a fase dos construtores e a qualidade de render do sprite aprovado. Prompts exatos em `tools/prompts/m2_*.txt` e `iso_ruivo_*.txt`; logs em `assets/_log/geracoes.jsonl`; originais em `assets/_bruto/native/`.

A primeira folha de carregar do ruivo deixou as mãos ao lado da cabeça; foi rejeitada e preservada em `assets/_bruto/reprovados/m2_ruivo_carregar_v1_native.png`. A nova folha colocou as mãos acima da cabeça. Não houve outras regerações.

## Processamento e preservação

- Células 384×384, fundo transparente, pés/base em y=376 e centro do alfa em x=192. Direções frente para baixo-direita e costas para cima-direita; sem versões à esquerda.
- Os atlas economizam chamadas e mantêm o mesmo modelo. Cada atlas usa um fator de normalização uniforme, registrado em `assets/_log/mundo2/calibracoes_<id>_atlas.json`; nenhum quadro foi escalado isoladamente. A câmera alta altera a altura projetada de poses dobradas e vistas diferentes. Os sprites atuais foram a referência de proporções e tamanho.
- Recorte pelas separações reais das linhas dos atlas, evitando cortar os pés ou incluir pedaços da linha vizinha. Componentes menores desconectados removidos dos enfeites; estrelinhas do estado caído preservadas. Sem desenhar caixas ou objetos nas mãos.
- Guindaste recebeu ajuste local de saturação para ficar em tons calmos de creme/terra. Cores fortes ficaram na pilha de blocos e no cone laranja/branco conforme a especificação.
- As duas tiras aprovadas do ruivo permaneceram **idênticas por SHA-256**. Sprite de plataforma e `arte.png` não foram substituídos. Nenhuma gravação em `public/` ou `server/`.
- `assets/manifest.json` e o catálogo foram atualizados com os 75 novos assets, quadros, âncoras, referências, fontes nativas e hashes. Fonte/estado da entrega: `assets/_log/mundo2/estado.json`.

## Conferência final

- `.venv/bin/python tools/verificar_mundo2.py`: **passou** — 56 tiras, 124 células, tamanhos, RGBA, transparência real, baseline 376, centro x=192, margens sem corte, 11 enfeites com base ancorada, oito WAVs com duração/formato/pico corretos e preservação dos arquivos aprovados.
- `.venv/bin/python tools/verificar_identidade.py`: **passou** — assets de plataforma e áudio anterior continuam válidos.
- `node tools/verificar_assets.mjs`: **Mundo 2: 75/75 assets novos prontos; ✓ 86 arquivos conferidos, nada faltando.**
- Folhas completas e individuais abertas e inspecionadas, sem objetos nas mãos, texto inventado, headset ou personagem alheio ao kit; cores dos times visíveis de costas; recortes conferidos após as correções.

## Recompor sem IA

```bash
.venv/bin/python tools/mundo2_restante.py export --char ruivo --scales '{"movimento":0.72,"ar":0.52,"carregar":0.80,"acoes":0.68}'
.venv/bin/python tools/mundo2_restante.py export --char loira --scales '{"movimento":0.98,"ar":0.52,"carregar":0.83,"acoes":0.68}'
.venv/bin/python tools/mundo2_restante.py export --char cacheado --scales '{"movimento":0.98,"ar":0.54,"carregar":0.80,"acoes":0.67}'
.venv/bin/python tools/mundo2_restante.py export --char sapo --scales '{"movimento":0.98,"ar":0.56,"carregar":0.83,"acoes":0.72}'
.venv/bin/python tools/mundo2_restante.py preview
.venv/bin/python tools/mundo2_enfeites.py build
.venv/bin/python tools/sfx_mundo2.py
.venv/bin/python tools/verificar_mundo2.py
.venv/bin/python tools/finalizar_mundo2.py
node tools/verificar_assets.mjs
```

A exportação restante preserva explicitamente as duas tiras aprovadas do ruivo. Os scripts de recomposição não fazem chamadas de IA.
''')
print('Mundo 2: manifest, catálogo, estado, revisão e relatório atualizados. 22 imagens concluídas + 1 chamada interrompida sem resultado.')
