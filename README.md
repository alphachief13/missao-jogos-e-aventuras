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

## Rodar localmente

```bash
npm install
npm start        # http://localhost:8090
npm run testar   # robô vence as 5 fases com 2, 3 e 4 times + confere os assets
npm run site     # monta o site estático em _site/
```

A cada push na `main`, o GitHub Actions roda os testes e publica `_site/` no GitHub Pages.

## Estrutura

- `public/jogo/` — núcleo do jogo, roda no navegador da tela: simulação (`sim.js`), sala/oficina (`sala.js`) e fases (`fases.js`).
- `server/` — servidor local só de arquivos, para testar sem o Pages.
- `public/` — cena three.js (`js/cena.js`), interface (`js/tela.js`), rede P2P (`js/rede.js`) e controle do celular (`controle.html`).
- `assets/` — sprites, fundos, sons e kit da identidade visual.
- `tools/` — pipeline de geração de assets (Codex) e testes: `node tools/testar_fases.mjs` (robô que vence todas as fases com 2, 3 e 4 times) e `node tools/verificar_assets.mjs`.
- `CODEX_NOVA_IDENTIDADE.md` — instruções para gerar os assets da identidade visual.
