# Codex · Atualizar os assets para a nova identidade "Missão, Jogos e Aventuras"

> **Leia tudo antes de começar.** A campanha mudou de "Missão Gamer" para **MISSÃO, JOGOS E AVENTURAS**
> (com vírgula). O código do jogo já foi atualizado. Seu trabalho é **refazer as imagens e os sons que
> ainda são da identidade antiga** e **limpar o que ficou obsoleto**.
> Não mexa em `server/` nem em `public/`: os caminhos e formatos abaixo são exatamente os que o jogo lê.

## 1. O que mudou na identidade (vale para tudo que você gerar)

- Kit novo, já copiado em **`referencias/kit/`** (o antigo está em `referencias/_arquivo/`, **não use**).
  Leia `referencias/kit/LEIA-ME.md` e veja `referencias/kit/00_guia-visual_missao-jogos-e-aventuras.png`.
- **Mundo real, não tela:** nada de controle de videogame, headset, telas, moedas de game, pixels ou espaço
  sideral. Símbolos da campanha: mapas, bússola, lupa, blocos de montar, robôs educacionais, cones de
  gincana, bandeirinhas, troféus e medalhas.
- Paleta igual: rosa `#E3205D`, azul `#3E93D0`, amarelo `#F6BB33`, verde `#A0C630`, marinho `#1E2A4A`.
- Ambiente: dia ensolarado, céu azul, colinas, trilhas, rios, árvores, cidade de blocos ao fundo.
- **Menos é mais:** composições limpas, centro calmo, sem poluição visual.

### Times do jogo (não mudar)
| Time | Personagem | Referência principal |
|---|---|---|
| Azul | menino ruivo explorador (herói) | `referencias/kit/personagens/01_heroi-explorador.png` |
| Rosa | menina loira construtora | `referencias/kit/personagens/03_fase2-construtora-loira.png` |
| Amarelo | menino cacheado explorador | `referencias/kit/personagens/02_fase1-explorador-cacheado.png` |
| Verde | sapo-robô da gincana | `referencias/kit/personagens/05_fase4-gincana-leao-e-sapo.png` (**só o sapo**, à direita; ignore o leão) |

## 2. O que já está pronto (não refaça)

Feito por `tools/kit_novo.py` (pode rodar de novo; é idempotente):
`assets/kit/logo.png`, `assets/kit/logo_roboeduc.png`, `assets/kit/selo_1..5.png`, `assets/ui/ic_*.png`
(ícones do kit), `assets/ui/bandeira_{azul,rosa,amarelo,verde}.png` e `assets/personagens/<id>/arte.png`
(arte dos cards, recortada do kit). Botões, painéis, corações e ícones de item agora são HTML/CSS/SVG:
**não gere botões, painéis nem textos em imagem.**

## 3. Tarefas

Use o pipeline que você já montou (`tools/gen_image.py`, `tools/post.py`, `tools/build_assets.py`,
`tools/requests.json`). **Primeiro atualize `tools/requests.json` e os prompts** para apontar só para
arquivos de `referencias/kit/` e para as descrições abaixo. Cada geração continua anexando as referências
como imagens de entrada.

Prefixo de estilo novo (substitui o antigo em todos os prompts):
```
Use the attached reference images as the strict visual base: same art style, same character design,
same colors and same rendering quality. Style: polished stylized 3D children's animation (Pixar-like),
sunny outdoor adventure mood, rounded shapes, soft daylight, vivid saturated colors. Brand palette:
pink #E3205D, blue #3E93D0, yellow #F6BB33, green #A0C630, navy #1E2A4A, white. Real-world play only:
no video game controller, no headset, no screens, no game coins, no pixels, no outer space. No text,
no letters, no logos, no watermark. Clean edges, fully inside the frame with margin.
```

### 3.1 Personagens jogáveis — refazer os 4 (o desenho mudou)
Mesmo processo e **mesmos arquivos de saída** de antes: tiras `idle` (2), `corrida` (4), `ar` (pulo + queda),
`extras` (empurrar, derrota, vitória, aceno) → `assets/personagens/<id>/{idle,corrida,pulo,queda,empurrar,derrota,vitoria,aceno}.png`,
células **384×384**, pés em **y=376**, escala única por personagem, voltados para a direita, corrida/pulo em perfil.
Depois gere `assets/personagens/<id>/retrato.png` (256×256, busto do quadro de aceno, **sem** moldura nem
círculo: o jogo aplica a borda) e a folha `assets/preview/personagens.png`. **Não sobrescreva `arte.png`.**

Descrições fixas (mãos livres em todas as poses de movimento; os objetos ficam presos ao corpo):
- `ruivo`: menino ruivo de cabelo laranja espetado, jaleco branco com o selo ROBOEDUC no peito, camiseta azul,
  bermuda bege, binóculo pendurado no pescoço, mochila verde-oliva, tênis azul e branco. **Sem headset, sem controle, sem mapa na mão.**
- `loira`: menina loira de cabelo ondulado, capacete de obra amarelo com óculos de proteção na aba e laço rosa,
  jaleco branco, blusa rosa, cinto de ferramentas, saia jeans, tênis rosa. **Sem a torre de blocos na mão.**
- `cacheado`: menino negro de cabelo cacheado, chapéu de safári bege, colete de explorador com bolsos, camiseta
  branca, bermuda bege, mochila marrom, tênis azul. **Lupa e bússola presas no cinto**, mãos livres.
- `sapo`: sapo-robô verde `#A0C630` e branco, visor preto com olhos de LED azuis sorrindo, faixa verde e branca
  na cabeça, apito pendurado. **Sem a bola na mão.** Não incluir o leão.

### 3.2 Fundos — 5 mundos + lobby (substituir os provisórios)
Cada mundo: `assets/fundos/<mundo>/longe.png` (2400×1080, opaco) e `assets/fundos/<mundo>/meio.png`
(2400×1080, transparente, só silhuetas no terço de baixo e nas laterais). Sem personagens, sem texto,
**centro calmo e um pouco desfocado** (as plataformas do jogo ficam por cima), detalhe nas bordas.

| `<mundo>` | Referências | Ambiente |
|---|---|---|
| `exploradores` | `06_fundos/fundo_aventura_9x16.png`, `04_fases/fase_1_exploradores-em-acao.png`, `02_key-visual/keyvisual_principal_9x16.png` | trilha ensolarada entre colinas, rio e cachoeira, placas de madeira e mapas, bússola gigante discreta (**é o único usado hoje; prioridade máxima**) |
| `construtores` | `04_fases/fase_2_desafio-dos-construtores.png`, `06_fundos/fundo_aventura_9x16.png` | cidade de blocos de montar coloridos ao longe, guindaste de blocos, bandeirinhas |
| `robotica` | `04_fases/fase_3_mestres-da-robotica.png`, `05_elementos/icones/icone_05_engrenagem.png` | oficina de robótica clara e arejada, engrenagens, robozinhos educacionais nas prateleiras (nada de telas) |
| `gincana` | `04_fases/fase_4_gincana-das-aventuras.png`, `05_elementos/icones/icone_08_cone-gincana.png` | campo de gincana gramado, cones, bambolês, bandeirinhas, bolas |
| `conquistas` | `04_fases/fase_5_grandes-conquistas.png`, `05_elementos/icones/icone_10_trofeu.png` | palco de celebração ao ar livre, confete, troféus e medalhas, o robô gigante de blocos **amigo** bem desfocado ao fundo |
| `lobby` (só `longe.png`) | `06_fundos/fundo_claro_4x5.png` | versão 16:9 do fundo claro de mapa: centro creme e limpo, trilha pontilhada, blocos e folhas só nos cantos |

O `meio.png` provisório de `exploradores` é transparente vazio: gere o de verdade.

### 3.3 Sons — refazer no estilo novo (sem chiptune)
Reescreva `tools/sfx.py` com timbres "de brinquedo do mundo real": marimba/xilofone (seno com decaimento rápido
e harmônico 4×), apito de gincana, palmas curtas, "pop" de encaixe de bloco. Nada de onda quadrada de videogame.
WAV 44,1 kHz mono, pico −3 dBFS, curtos (< 0,6 s; vitória até 2,5 s). Nomes exatos em `assets/sons/`:

| Arquivo | Quando toca | Ideia |
|---|---|---|
| `pulo` | pular | marimba subindo rápido (2 notas) |
| `pouso` | aterrissar | baque macio, grave e curto |
| `bandeira` | pegar a bandeirinha do time | arpejo de marimba alegre (3 notas) |
| `peca` | pegar peça de montar | "clique/pop" de encaixe + nota aguda |
| `alavanca` | puxar alavanca | clack de madeira |
| `botao` | pisar no botão | "plim" curto |
| `chegada` | entrar no arco de chegada / renascer | sininho suave |
| `perdeu_coracao` | cair na poça errada | "uh-oh" de marimba descendo (2 notas), sem drama |
| `derrota` | fase perdida | 3 notas descendo, leve |
| `vitoria` | fase vencida | fanfarra de marimba + palmas, até 2,5 s |
| `clique` | botões da interface | tique leve |
| `trocar` | trocar de personagem | "swish" curto |
| `entrou` | jogador entrou na sala | apito de gincana curto e alegre |
| `contagem` | 3-2-1 | três bipes de apito + um final mais longo (total ~3 s) |
| `compra` | montar item na oficina | encaixe de blocos + nota |

### 3.4 Limpeza (o jogo não usa mais; apague)
- `assets/ui/*` **exceto** `ic_*.png` e `bandeira_*.png`.
- `assets/kit/*` **exceto** `logo.png`, `logo_roboeduc.png` e `selo_1..5.png`.
- `assets/texturas/`, `assets/npcs/`, `assets/personagens/*/card*.png`.
- `assets/fundos/{menu,block_city,dino_attack,space_mission,mystery_game,final_boss,selecao_fases}/`.
- `assets/sons/` com os nomes antigos (`gema`, `estrela_xp`, `portal_abre`, `clique_ui`, `trocar_personagem`,
  `jogador_entrou`, `contagem_regressiva`, `chefao_soco`) **depois** de gerar os novos.
- `assets/preview/` e `assets/_bruto/` antigos (mova para `assets/_bruto/_arquivo_missao_gamer/` se quiser guardar).
- Ferramentas que só serviam à UI antiga (`tools/ui_assets.py`, `tools/preview_ruivo.py`) e entradas
  correspondentes em `tools/requests.json` e `tools/build_assets.py`.
Partículas (`assets/particulas/`) e fontes ficam.

## 4. Conferência (obrigatória antes de dizer que terminou)
1. `node tools/verificar_assets.mjs` precisa terminar com **"nada faltando"**.
2. Folhas de contato em `assets/preview/`: `personagens.png` (os 4 com todas as poses), `fundos.png`
   (os 6 fundos) e `sprites_sobre_fundos.png` (cada personagem sobre o fundo `exploradores`). **Abra e olhe.**
   Regerar se: personagem diferente do kit novo, headset/controle/tela aparecendo, objeto na mão nas poses de
   movimento, texto inventado, espaço sideral, halo no recorte, fundo com personagem ou centro poluído.
3. `npm start`, abra `http://localhost:8090`, aperte ENTER, JOGAR e começar fase: confira se aparecem os
   personagens novos sobre o fundo novo. Feche o servidor.
4. Atualize `assets/manifest.json` e `assets/RELATORIO.md` (quantas gerações de IA, o que foi regerado, pendências).

**Ordem:** 3.1 (comece pelo `ruivo` e me mostre ao lado da referência antes de seguir) → 3.2 (`exploradores` primeiro)
→ 3.3 → 3.4 → 4.
