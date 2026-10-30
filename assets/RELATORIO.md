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


# Mundo 2 — Desafio dos Construtores: primeiro checkpoint

Lidos integralmente `CODEX_MUNDO2.md` e as regras de identidade aplicáveis. Esta etapa está **aguardando revisão do usuário**, antes de gerar o restante.

- **2 imagens de IA nativa, 0 regerações** nesta etapa. Referências anexadas em ambas: `assets/personagens/ruivo/idle.png` atual e `referencias/kit/personagens/01_heroi-explorador.png`. Prompts completos em `tools/prompts/iso_ruivo_*.txt`; pedidos em `tools/requests_mundo2.json` e no catálogo comum `tools/requests.json`.
- Criados `assets/personagens/ruivo/iso/frente_idle.png` (768×384, 2 quadros) e `costas_corrida.png` (1536×384, 4 quadros), RGBA com transparência real, células 384×384 e baseline y=376. Centro por massa do alfa em x=192, seguindo o pipeline atual.
- Câmera elevada, frente para baixo-direita e costas para cima-direita. Identidade, roupas e cores preservadas; mãos livres; mochila verde-oliva, tênis azuis e branco. Sem selo nos sprites, conforme decisão anterior do usuário.
- Escala calibrada pela largura do cabelo/cabeça do idle atual, com um fator para a tira inteira; nenhum quadro escalado individualmente. A altura projetada de frente diminui com a vista de cima. Medidas registradas em `assets/_log/mundo2/calibracoes_ruivo.json`.
- Comparação `assets/preview/ruivo_iso_comparacao.png` aberta e inspecionada: idle de plataforma e os seis quadros novos, sem ampliar/diminuir os arquivos finais na montagem. Originais em `assets/_bruto/native/iso_ruivo_*.png`.
- Manifest atualizado com as duas novas tiras. Os sprites de plataforma não foram sobrescritos. Só houve gravações em `assets/` e `tools/`.

Falta: revisão destas vistas; outras 12 tiras do ruivo; 14 tiras de cada um dos outros três personagens; 11 enfeites; céu de Construtores; oito sons; folhas completas de Mundo 2 e conferência final. Os demais itens não foram gerados antes deste ponto de revisão.

Para recompor esta prévia sem novas gerações: `.venv/bin/python tools/mundo2.py build-review`.
