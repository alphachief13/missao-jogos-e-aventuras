# Codex · Assets do Mundo 2 "Desafio dos Construtores" (visão isométrica)

> **Leia tudo antes de começar.** O Mundo 2 deixa de ser plataforma de lado e vira um **mapa 3D isométrico**
> (câmera alta, olhando na diagonal, como Don't Starve / Paper Mario). O chão, os blocos, as pontes e as
> caixas são feitos em código (three.js). Você gera **só** os sprites dos personagens nas novas direções,
> alguns enfeites do cenário e os sons novos. (Não precisa de fundo pintado: a câmera olha para baixo e o céu não aparece.)
> Não mexa em `public/` nem em `server/`: os caminhos e formatos abaixo são exatamente os que o jogo vai ler.
> Valem todas as regras de identidade de `CODEX_NOVA_IDENTIDADE.md` (seção 1 e o prefixo de estilo).

## 1. Público e clareza (vale para tudo)

Quem joga são **crianças**. Cada imagem precisa ser entendida num relance, numa tela de celular:
- Silhueta forte, contorno limpo, cores do kit bem saturadas. Nada de detalhe miúdo.
- Personagem sempre reconhecível pela cor do time (azul, rosa, amarelo, verde), também de costas.
- Enfeites do cenário em tons calmos (terra, madeira, verde-folha, creme); **cor forte é só dos times**.
  Exceção: os blocos de montar decorativos podem usar as 4 cores do kit.
- Sem texto, sem números, sem setas desenhadas. Placas são de madeira lisa.

## 2. Personagens nas direções isométricas

Os 4 personagens (`ruivo`, `loira`, `cacheado`, `sapo`), com as mesmas descrições fixas de
`CODEX_NOVA_IDENTIDADE.md` §3.1 e a **mesma escala** dos sprites de plataforma que já existem.

Duas vistas novas, ambas em **3/4 vista de cima (câmera ~35° acima do horizonte)**:
- `frente`: personagem virado para **baixo-direita** (vemos o rosto e o lado direito do corpo).
- `costas`: personagem virado para **cima-direita** (vemos as costas, a mochila e o lado direito).

O jogo espelha na horizontal para baixo-esquerda e cima-esquerda; **não gere as versões para a esquerda**.

Formato igual ao atual: tiras horizontais, células **384×384**, fundo transparente, pés em **y=376**,
centro do corpo em x=192, escala única por personagem (a mesma dos sprites de plataforma).
Saída em `assets/personagens/<id>/iso/`:

| Arquivo | Quadros | Pose |
|---|---|---|
| `frente_idle.png` / `costas_idle.png` | 2 | parado, respirando (o 2º quadro só pisca/mexe de leve) |
| `frente_corrida.png` / `costas_corrida.png` | 4 | ciclo de corrida, braços balançando |
| `frente_pulo.png` / `costas_pulo.png` | 1 | subindo, joelhos dobrados |
| `frente_queda.png` / `costas_queda.png` | 1 | descendo, braços abertos para equilibrar |
| `frente_carregar.png` / `costas_carregar.png` | 4 | andando com as **duas mãos levantadas acima da cabeça**, como quem segura uma caixa (a caixa **não** aparece: o jogo desenha o objeto por cima) |
| `frente_empurrar.png` / `costas_empurrar.png` | 2 | inclinado para a frente, braços esticados empurrando algo pesado |
| `ajudar.png` | 2 | (só `frente`) agachado estendendo a mão para levantar um colega |
| `caido.png` | 1 | (só `frente`) sentado no chão meio tonto, com estrelinhas em volta da cabeça. Fofo, nada de dor |

Folha de conferência: `assets/preview/personagens_iso.png` (os 4 personagens, todas as poses, lado a lado
com o `idle.png` de plataforma para comparar escala e cores).

## 3. Enfeites do cenário (sprites em pé no mapa)

Objetos que ficam em pé no mapa 3D, sempre virados para a câmera. Mesma vista 3/4 de cima, fundo
transparente, base do objeto encostada na **borda de baixo** da imagem (o jogo apoia ali no chão), centrado
na horizontal. Salve em `assets/mundo2/enfeites/`:

| Arquivo | Tamanho | Ideia |
|---|---|---|
| `arvore_1.png`, `arvore_2.png` | 512×768 | árvore de copa redonda e cheia, tronco curto (estilo brinquedo) |
| `arbusto.png` | 384×256 | moita arredondada |
| `flores.png` | 256×192 | tufo de flores brancas e amarelas claras |
| `pedra.png` | 256×192 | pedra lisa arredondada, cinza-areia |
| `cerca.png` | 512×256 | trecho de cerca de madeira clara |
| `placa.png` | 256×320 | placa de madeira lisa num poste, **sem nada escrito** |
| `pilha_blocos.png` | 384×384 | pilha de blocos de montar nas 4 cores do kit |
| `guindaste.png` | 768×1024 | guindaste de brinquedo feito de blocos de montar (marco do canteiro de obras) |
| `cone.png` | 192×256 | cone de obra laranja e branco |
| `carrinho.png` | 384×320 | carrinho de mão de madeira com blocos dentro |

Folha de conferência: `assets/preview/enfeites_mundo2.png`.

## 4. Sons novos

Mesmo estilo de `CODEX_NOVA_IDENTIDADE.md` §3.3 (marimba, apito, palmas, encaixe de blocos; nada de chiptune).
WAV 44,1 kHz mono, pico −3 dBFS. Em `assets/sons/`:

| Arquivo | Quando toca | Ideia |
|---|---|---|
| `pegar` | pegar um bloco/objeto | "pop" curto subindo |
| `soltar` | soltar ou entregar o objeto | "toc" de madeira |
| `empurrar` | caixa pesada deslizando (pode tocar em loop curto) | raspado macio de madeira, ~0,4 s |
| `construir` | ponte/rampa se montando | 3 encaixes de bloco em sequência + nota alegre |
| `ajudar` | um time levanta um colega caído | duas notas de marimba subindo + palminha |
| `caiu` | personagem fica caído | "boing" macio descendo, sem drama |
| `missao` | missão do mapa concluída | fanfarra curta de marimba (~1,2 s) |
| `placa` | pisar numa placa de pressão | "clunk" de madeira grave |

## 5. Conferência (obrigatória antes de dizer que terminou)

1. Abra as folhas de `assets/preview/` e **olhe**. Regerar se: personagem diferente do kit, cor do time
   ilegível de costas, objeto na mão, texto inventado, halo no recorte, enfeite com cor forte de time,
   base do enfeite flutuando (não encostada na borda de baixo).
2. Confira tamanhos e transparência com um script (todas as células 384×384, pés em y=376).
3. Rode `node tools/verificar_assets.mjs`; ele deve terminar com **"nada faltando"**.
4. Atualize `assets/manifest.json` e `assets/RELATORIO.md`.

**Ordem:** §2 (comece pelo `ruivo` e me mostre `frente_idle` e `costas_corrida` antes de seguir) → §3 → §4 → §5.
