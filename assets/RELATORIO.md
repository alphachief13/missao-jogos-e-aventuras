# MISSÃO, JOGOS E AVENTURAS — entrega parcial conforme prioridade

Atualizado em 29/10/2026. As quatro prioridades desta rodada estão concluídas.
A migração inteira permanece parcial: cinco fundos foram adiados expressamente e o teste no navegador ficou impedido pelo ambiente.

## Gerações de IA

**14 imagens nesta rodada; 19 imagens no total da nova identidade.** As gerações da campanha antiga não entram nessa conta.

| Etapa | Imagens de IA | Resultado |
|---|---:|---|
| Ruivo, rodada anterior | 5 | 4 tiras finais e 1 primeira corrida rejeitada; versão final aprovada pelo usuário |
| Loira | 4 | idle (2), corrida (4), ar (2), extras (4), sem regerações |
| Cacheado | 4 | mesmas tiras, mãos vazias, lupa e bússola no cinto, sem regerações |
| Sapo | 4 | mesmas tiras, sem bola ou leão, faixa e apito, sem regerações |
| Exploradores | 2 | longe opaco e meio transparente, sem regerações |
| Sons | 0 | 15 efeitos procedurais |
| Limpeza, folhas e manifest | 0 | processamento local |

Ferramenta: `image_gen` nativa; cada chamada anexou a referência do personagem ou as três referências de Exploradores, exclusivamente do kit novo.
Pedidos e prompts-base: `tools/requests.json`, `tools/prompts/`. Originais nativos: `assets/_bruto/native/`; registros: `assets/_log/geracoes.jsonl`.
Nas chamadas também foram reforçados mãos vazias, acessórios presos, ausência de brilho e uso apenas do sapo à direita da referência, conforme o item.

## Personagens prontos

- Ruivo preservado conforme aprovação: **sem selo nos sprites e sem refinar passadas**. Isso deixou de ser pendência.
- Loira, cacheado e sapo exportados em `assets/personagens/<id>/` com idle, corrida, pulo, queda, empurrar, derrota, vitória e aceno; 12 quadros por personagem.
- Células 384×384, baseline dos pés em y=376. Normalização das tiras por medidas de cabeça em `tools/calibracoes.json`; cada tira usa um fator único, sem redimensionar quadros isoladamente.
- Retratos 256×256 derivados do aceno, com transparência e sem círculo/moldura. O jogo aplica a borda.
- `arte.png` dos quatro personagens permaneceu intacta. Logos, selos, bandeiras e ícones prontos do kit não foram refeitos. Partículas e fontes preservadas.
- Folha `assets/preview/personagens.png`: quatro personagens, todas as 48 poses. **Aberta e inspecionada.** Folhas individuais e oito GIFs também disponíveis.

## Exploradores pronto

- `assets/fundos/exploradores/longe.png`: 2400×1080, RGB opaco, céu ensolarado, colinas, rio, cachoeira e elementos de exploração nas bordas; sem personagens ou texto.
- `assets/fundos/exploradores/meio.png`: 2400×1080, RGBA, vegetação e objetos nas laterais, centro aberto; substituiu o transparente vazio. Alfa residual inferior a 16 removido no processamento, sem IA adicional.
- `assets/preview/fundos.png`: composição nova de Exploradores e indicação explícita dos mundos adiados; lobby mostrado como provisório.
- `assets/preview/sprites_sobre_fundos.png`: cada personagem em idle e corrida sobre Exploradores.
- **As duas folhas foram abertas e inspecionadas.** Não houve nova geração para detalhes cosméticos.

## Sons prontos

`tools/sfx.py` reescrito: seno com decaimento e harmônico 4× para marimba/xilofone, apitos de gincana, palmas, clacks de madeira e pops de encaixe; sem ondas quadradas ou chiptune.

Os 15 WAVs em `assets/sons/`: `pulo`, `pouso`, `bandeira`, `peca`, `alavanca`, `botao`, `chegada`, `perdeu_coracao`, `derrota`, `vitoria`, `clique`, `trocar`, `entrou`, `contagem`, `compra`.
Todos PCM16 mono, 44.100 Hz e pico −3 dBFS. Efeitos comuns <0,6 s; vitória 2,25 s; contagem 3 s com três apitos e final longo, exceção prevista na especificação.

## Limpeza concluída

396 itens obsoletos arquivados em `assets/_bruto/_arquivo_missao_gamer/` (inclui pastas). Lista em `assets/_log/limpeza_nova_identidade.json`.
Removidos das pastas ativas: UI antiga, logos/kit obsoletos, texturas, NPCs, cards antigos, sete diretórios de fundos antigos, oito sons de nomes antigos, prévias e brutos antigos, prompts antigos e `tools/ui_assets.py` / `tools/preview_ruivo.py`.

`tools/build_assets.py` agora só recompõe personagens, fundos já gerados, sons e revisão/manifest; não recria UI, cards, NPCs ou texturas antigas. Fundos sem insumo da nova identidade são pulados com indicação de adiamento. `tools/limpar_identidade.py` reproduz a limpeza sem apagar arte nova.

Manifest atualizado: **159 arquivos ativos**, nome oficial e cinco fundos adiados registrados; caminhos, dimensões, hashes e áudio conferidos. Histórico da campanha antiga fica apenas no arquivo e nos logs históricos.

## Validação

- `node tools/verificar_assets.mjs`: **✓ 86 arquivos conferidos, nada faltando.**
- `.venv/bin/python tools/verificar_identidade.py`: passou; 48 poses com baseline 376, quatro retratos transparentes, oito GIFs com contagem correta, dimensões/alfa de Exploradores, 15 WAVs com formato/duração/pico corretos.
- Folhas `personagens.png`, `fundos.png`, `sprites_sobre_fundos.png`: abertas e inspecionadas.
- `npm start`: tentado; falhou antes de abrir a porta em `os.networkInterfaces()` com `uv_interface_addresses returned Unknown system error 1`. O ambiente bloqueou a consulta das interfaces de rede. **Fluxo ENTER → Jogar → Começar fase no navegador ainda não conferido.** Nenhum servidor ficou rodando; `server/` e `public/` não foram alterados.

O verificador cobre os arquivos usados hoje (Exploradores e lobby provisório). Seu sucesso **não significa que os fundos adiados tenham sido gerados**.

## O que falta, por decisão do usuário

1. Gerar `construtores`, `robotica`, `gincana` e `conquistas`: longe e meio (8 imagens).
2. Gerar o novo `lobby/longe.png` (1 imagem); o provisório atual foi preservado.
3. Atualizar e abrir a folha de fundos quando esses mundos forem produzidos.
4. Executar a conferência visual no jogo em ambiente que permita iniciar o servidor.

Nenhuma pendência de selo ou refinamento de passadas do ruivo. Não houve esgotamento sinalizado pela ferramenta nesta rodada; as gerações pararam ao concluir a prioridade autorizada.

## Reproduzir sem novas chamadas de IA

```bash
.venv/bin/python tools/build_assets.py --only personagens
.venv/bin/python tools/build_assets.py --only fundos
.venv/bin/python tools/build_assets.py --only sons
.venv/bin/python tools/build_assets.py --only revisao
.venv/bin/python tools/verificar_identidade.py
node tools/verificar_assets.mjs
```

O build usa os brutos persistidos e não chama IA. `--force <personagem|mundo|all>` sobrescreve apenas os derivados selecionados.


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
