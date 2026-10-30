# Missão, Jogos e Aventuras

Jogo cooperativo 2.5D (estilo Fireboy & Watergirl) para a colônia de férias RoboEduc.
De 2 a 4 times jogam na rede local: a TV/PC roda a tela do jogo e cada pessoa joga pelo teclado ou pelo celular (controle virtual via QR code).

## Jogar

**Online:** https://alphachief13.github.io/missao-jogos-e-aventuras/

1. Abra o link no PC ligado à TV: essa tela é a anfitriã e roda a partida.
2. Os celulares leem o QR code da tela (ou abrem `controle.html` e digitam o código de 4 letras).
3. Quem joga no PC aperta ENTER. Outro PC pode entrar abrindo o link com `?sala=CÓDIGO`.

Os celulares se ligam direto na tela por WebRTC (PeerJS). A internet só é usada para a "apresentação"
inicial; por isso a tela e os celulares precisam estar online, de preferência no mesmo Wi-Fi.

### Mundo 2 · Desafio dos Construtores (mapa 3D)

Um mapa isométrico aberto com 5 missões espalhadas (as 4 primeiras em qualquer ordem; a grande torre abre no fim).
Cada aparelho desenha a própria câmera: o celular mostra o jogo com joystick (arraste no lado esquerdo) e botões por cima;
cada PC segue o seu personagem (sozinho com 2 personagens, a tela se divide); a tela anfitriã sem jogador mostra o mapa inteiro.
No teclado: setas/WASD andam, Espaço pula, E faz a ação (pegar/jogar bloco, alavanca, ajudar colega, segurar na obra).
Para testar sem vencer o Mundo 1, abra a tela com `?tudo` (libera todas as fases).

## Rodar localmente

```bash
npm install
npm start        # http://localhost:8090
npm run testar   # robô vence as 5 fases com 2, 3 e 4 times + confere os assets
npm run site     # monta o site estático em _site/
```

A cada push na `main`, o GitHub Actions roda os testes e publica `_site/` no GitHub Pages.

## Estrutura

- `public/jogo/` — núcleo do jogo, roda no navegador da tela: simulação (`sim.js`; Mundo 2: `sim_iso.js`), sala/oficina (`sala.js`) e fases (`fases.js`, `fases_mundo2.js`).
- `server/` — servidor local só de arquivos, para testar sem o Pages.
- `public/` — cenas three.js (`js/cena.js`; Mundo 2: `js/cena_iso.js`), interface (`js/tela.js`), rede P2P (`js/rede.js`) e controle do celular (`controle.html`).
- `assets/` — sprites, fundos, sons e kit da identidade visual.
- `tools/` — pipeline de geração de assets (Codex) e testes: `node tools/testar_fases.mjs` (robô que vence todas as fases com 2, 3 e 4 times), `node tools/testar_mundo2.mjs` (robô do mapa 3D) e `node tools/verificar_assets.mjs`.
- `CODEX_NOVA_IDENTIDADE.md` — instruções para gerar os assets da identidade visual; `CODEX_MUNDO2.md` — sprites isométricos, enfeites e sons do Mundo 2.
