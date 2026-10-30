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

### Os 5 mundos

Exploradores em Ação · Desafio dos Construtores · Mestres da Robótica · Gincana das Aventuras · Grandes Conquistas.
Na escolha de fase os mundos aparecem como planetinhas 3D (↑ ↓ trocam de mundo, ← → de fase).
Cada mundo tem **10 fases de plataforma 2D** e, no fim, **1 fase em mapa 3D**; cada vitória libera a próxima.

- **Fases 2D** (`public/jogo/fases.js`): receitas curtas que o gerador (`gerador.js`) monta em andares em zigue-zague
  (poças, curto-circuito, degraus, pedras, portas e pontes de botão, esteiras, alavancas, portões, escada e elevadores).
  Setas no fundo mostram o caminho; setinhas pulando marcam alavancas e botões ainda não usados.
- **Fases 3D** (`public/jogo/fases_3d.js`): mapa aberto com missões em qualquer ordem e uma missão final com todos juntos.
  Cada aparelho desenha a própria câmera; a bússola e uma trilha de setinhas no chão seguem o caminho de verdade até o objetivo.
  No teclado: setas/WASD andam, Espaço pula, E faz a ação.
- Os mundos 2 a 5 usam o fundo pintado dos Exploradores tingido até ganharem o próprio (`CODEX_NOVA_IDENTIDADE.md` §3.2).

Para testar sem vencer as fases, abra a tela com `?tudo` (libera todas).

## Rodar localmente

```bash
npm install
npm start        # http://localhost:8090
npm run testar   # robô vence as 50 fases 2D e as 5 fases 3D com 2, 3 e 4 times + confere os assets
npm run site     # monta o site estático em _site/
```

A cada push na `main`, o GitHub Actions roda os testes e publica `_site/` no GitHub Pages.

## Estrutura

- `public/jogo/` — núcleo do jogo, roda no navegador da tela: simulação (`sim.js`; mapa 3D: `sim_iso.js`), sala/oficina (`sala.js`), fases 2D (`fases.js` + `gerador.js`) e 3D (`fases_3d.js`, `fases_mundo2.js`).
- `server/` — servidor local só de arquivos, para testar sem o Pages.
- `public/` — cenas three.js (`js/cena.js`; mapa 3D: `js/cena_iso.js`; mundos da escolha de fase: `js/planetas.js`), interface (`js/tela.js`), rede P2P (`js/rede.js`) e controle do celular (`controle.html`).
- `assets/` — sprites, fundos, sons e kit da identidade visual.
- `tools/` — pipeline de geração de assets (Codex) e testes: `node tools/testar_fases.mjs` (robô que segue o roteiro de cada fase 2D com 2, 3 e 4 times), `node tools/testar_3d.mjs` (robô das fases 3D) e `node tools/verificar_assets.mjs`.
- `CODEX_NOVA_IDENTIDADE.md` — instruções para gerar os assets da identidade visual; `CODEX_MUNDO2.md` — sprites isométricos, enfeites e sons do Mundo 2.
