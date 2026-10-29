# Missão, Jogos e Aventuras

Jogo cooperativo 2.5D (estilo Fireboy & Watergirl) para a colônia de férias RoboEduc.
De 2 a 4 times jogam na rede local: a TV/PC roda a tela do jogo e cada pessoa joga pelo teclado ou pelo celular (controle virtual via QR code).

## Rodar

```bash
npm install
npm start
```

Abra `http://localhost:8090` no PC da tela. Os celulares entram pelo QR code mostrado no lobby (`/controle.html`).

## Estrutura

- `server/` — servidor Node (`ws`), simulação autoritativa (`sim.js`), salas/oficina (`sala.js`) e fases (`fases.js`).
- `public/` — cliente: cena three.js (`js/cena.js`), interface (`js/tela.js`) e controle do celular (`controle.html`).
- `assets/` — sprites, fundos, sons e kit da identidade visual.
- `tools/` — pipeline de geração de assets (Codex) e testes: `node tools/testar_fases.mjs` (robô que vence todas as fases com 2, 3 e 4 times) e `node tools/verificar_assets.mjs`.
- `CODEX_NOVA_IDENTIDADE.md` — instruções para gerar os assets da identidade visual.
