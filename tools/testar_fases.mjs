// Robô que joga cada fase do início ao fim, com 4 times e com duplas, para garantir que todas têm solução.
// Uso: node tools/testar_fases.mjs [id-da-fase]
import { Jogo, COR_DO_PERSONAGEM } from '../public/jogo/sim.js';
import { FASES } from '../public/jogo/fases.js';

const COMBOS = [
  ['ruivo', 'loira', 'cacheado', 'sapo'],
  ['ruivo', 'loira'],
  ['cacheado', 'sapo'],
  ['ruivo', 'sapo'],
  ['loira', 'cacheado', 'sapo'],
];
const POCA = { b: 'azul', r: 'rosa', y: 'amarelo', g: 'verde', x: null };
const DT = 1 / 60;

class Robo {
  constructor(fase, ativos) {
    this.j = new Jogo(fase, {}, ativos);
    this.ativos = ativos;
    this.log = [];
    this.f = 0;
  }
  P(id) { return this.j.personagens.find(p => p.id === id); }
  tick(id, e = {}) {
    this.j.passo(DT, id ? { [id]: e } : {});
    this.f++;
    for (const ev of this.j.eventos) {
      if (ev.e === 'morte') throw new Error(`${ev.id} morreu (${ev.poca}) em x=${ev.x.toFixed(2)} y=${ev.y.toFixed(2)}`);
      if (!['pouso', 'pulo', 'botao'].includes(ev.e)) this.log.push(`${ev.e}${ev.id ? ':' + ev.id : ''}`);
    }
    if (this.f > 60 * 600) throw new Error('tempo esgotado');
  }
  espera(n, id) { for (let k = 0; k < n; k++) this.tick(id); }
  ate(cond, max = 900) { for (let k = 0; k < max; k++) { if (cond()) return; this.tick(); } throw new Error('condição nunca aconteceu'); }

  anda(id, x, max = 900) {
    const p = this.P(id);
    for (let k = 0; k < max && Math.abs(p.x - x) > 0.1; k++) {
      const d = Math.abs(p.x - x) < 0.5 ? (p.vx === 0 ? 1 : 0) : 1; // freia perto do alvo
      this.tick(id, d ? { dir: p.x < x, esq: p.x > x } : {});
    }
    this.espera(8, id);
  }
  pulaPara(id, x, alturaMax = 60) {
    const p = this.P(id);
    for (let k = 0; k < alturaMax; k++) {
      const dx = x - p.x;
      const e = { pulo: true, puloBorda: k === 0, dir: dx > 0.15, esq: dx < -0.15 };
      if (k > 3 && p.noChao) break;
      this.tick(id, e);
    }
    for (let k = 0; k < 60 && !p.noChao; k++) this.tick(id, { dir: x - p.x > 0.15, esq: x - p.x < -0.15 });
    this.espera(6, id);
  }
  acao(id) { this.tick(id, { acao: true, acaoBorda: true }); this.espera(3, id); }

  // Anda pelo piso atual até x, pulando as poças que não são do time.
  irPorChao(id, x) {
    const p = this.P(id);
    for (let guarda = 0; guarda < 40 && Math.abs(p.x - x) > 0.12; guarda++) {
      const dir = Math.sign(x - p.x);
      const l = Math.round(p.y);
      const linha = this.j.mapa[l] || '';
      // procura a próxima poça perigosa no caminho
      let ini = null, fim = null;
      for (let c = Math.floor(p.x); dir > 0 ? c <= Math.ceil(x) : c >= Math.floor(x); c += dir) {
        const t = linha[c];
        const perigosa = t in POCA && POCA[t] !== COR_DO_PERSONAGEM[id];
        if (perigosa && ini === null) ini = c;
        if (ini !== null && !perigosa) { fim = c - dir; break; }
      }
      if (ini === null) { this.anda(id, x); return; }
      // corre até a borda (sem frear) e pula com embalo
      const borda = dir > 0 ? ini - 0.4 : ini + 1.4;
      for (let k = 0; k < 600 && (dir > 0 ? p.x < borda : p.x > borda); k++) this.tick(id, { dir: dir > 0, esq: dir < 0 });
      const alvo = dir > 0 ? fim + 1 + 0.7 : fim - 0.7;
      if (process.env.DEBUG) console.log(`  ${id} pula de ${p.x.toFixed(2)} (vx ${p.vx.toFixed(1)}) poça ${ini}-${fim} alvo ${alvo}`);
      this.pulaPara(id, Math.abs(alvo - p.x) < Math.abs(x - p.x) ? alvo : x);
    }
  }

  // Do chão (à esquerda) até a parte direita do andar do meio, pela escada da direita.
  subirEscada(id) {
    this.irPorChao(id, 19.6);
    this.pulaPara(id, 20.5); this.pulaPara(id, 21.5); this.pulaPara(id, 22.4);
    this.pulaPara(id, 19.2);
    const p = this.P(id);
    if (Math.abs(p.y - 8) > 0.05) throw new Error(`${id} não chegou ao andar do meio (y=${p.y.toFixed(2)})`);
  }
  // Andar do meio → degrau flutuante (colunas 10-11) → andar de cima.
  subirDegrau(id) {
    this.anda(id, 12.45);
    this.pulaPara(id, 10.95);
    this.pulaPara(id, 13.6);
    if (Math.abs(this.P(id).y - 4) > 0.05) throw new Error(`${id} não chegou ao topo`);
  }
  // Do degrau / topo para a parte esquerda do andar do meio e volta.
  irMeioEsquerda(id, x) {
    if (this.P(id).y < 5) { this.anda(id, 12.4); this.pulaPara(id, 10.95); } // do topo desce primeiro ao degrau
    this.pulaPara(id, 8.6);
    this.irPorChao(id, x);
  }
  voltarDoMeioEsquerda(id) { this.irPorChao(id, 9.3); this.pulaPara(id, 10.95); }

  balsa(id, plat, xDepois) {
    const pl = this.j.plataformas.find(p => p.id === plat);
    this.anda(id, pl.x - 0.45);
    this.ate(() => Math.abs(pl.px - pl.x) < 0.02 && pl.espera > 0.3);
    this.anda(id, pl.x + pl.w / 2);
    this.ate(() => Math.abs(pl.px - pl.x2) < 0.02 && pl.espera > 0.2);
    this.anda(id, xDepois);
  }
  elevadorAuto(id, plat) {
    const pl = this.j.plataformas.find(p => p.id === plat);
    this.anda(id, 12.45);
    this.ate(() => Math.abs(pl.py - pl.y) < 0.02 && pl.espera > 0.4);
    this.anda(id, 10.95);
    this.ate(() => Math.abs(pl.py - pl.y2) < 0.02);
    this.anda(id, 13.6);
  }
  puxar(cor, x, y, quem) {
    const id = this.ativos.find(i => COR_DO_PERSONAGEM[i] === cor) || quem;
    return { id, x, y };
  }
  aoPortal(id) {
    const portal = this.j.fase.portais.find(o => o.cor === COR_DO_PERSONAGEM[id]);
    this.anda(id, portal.x);
  }
  fim() { this.espera(90); return this.j.resultado; }
}

// ---------- roteiros ----------
// Elevador XOR (botão no meio + alavanca no topo): a sobe, b segura o botão, o resto sobe, e a traz o elevador para b.
function danca(r, a, b, resto, elev, xAlavanca, subir) {
  if (subir) for (const c of [a, b, ...resto]) r.subirEscada(c);
  const cima = () => r.ate(() => elev() <= 4.01), baixo = () => r.ate(() => elev() >= 7.99);
  r.anda(a, 10.9);                 // a no elevador (embaixo)
  r.anda(b, 16); cima();           // b no botão: sobe
  r.anda(a, xAlavanca); r.acao(a); // alavanca + botão: desce
  baixo();
  for (const c of resto) r.anda(c, 10.9);
  r.anda(b, 12.7);                 // b sai do botão: só alavanca = sobe com o resto
  cima();
  for (const c of resto) r.anda(c, 13.4);
  r.acao(a); baixo();              // a desliga: desce para b
  r.anda(b, 10.9);
  r.acao(a); cima();               // liga de novo: sobe com b
  r.anda(b, 13.6);
}
const ROTEIROS = {
  '1-1'(r, ids) {
    const [a, b, ...resto] = ids;
    danca(r, a, b, resto, () => r.j.plataformas[0].py, 13.3, true);
    for (const c of ids) r.aoPortal(c);
  },
  '1-2'(r, ids) {
    const [a] = ids;
    const quem = cor => ids.find(i => COR_DO_PERSONAGEM[i] === cor) || a;
    // alavancas do chão
    const az = quem('azul'); r.irPorChao(az, 11); r.acao(az);
    const am = quem('amarelo'); r.irPorChao(am, 19); r.acao(am);
    for (const c of ids) r.subirEscada(c);
    for (const c of ids) r.subirDegrau(c);
    const ro = quem('rosa');
    r.irMeioEsquerda(ro, 3.5); r.acao(ro); r.voltarDoMeioEsquerda(ro); r.pulaPara(ro, 13.6);
    const ve = quem('verde'); r.anda(ve, 13.4); r.acao(ve);
    r.ate(() => r.j.plataformas[0].py < -2.1);
    for (const c of ids) r.aoPortal(c);
  },
  '1-3'(r, ids) {
    for (const c of ids) { r.balsa(c, 'balsa', 12.5); r.irPorChao(c, 19.6); r.subirEscada(c); }
    for (const c of ids) r.elevadorAuto(c, 'elev');
    for (const c of ids) r.aoPortal(c);
  },
  '1-4'(r, ids) {
    const [a, b, ...resto] = ids;
    const quem = cor => ids.find(i => COR_DO_PERSONAGEM[i] === cor) || a;
    r.irPorChao(a, 9.5);                       // a segura o botão da esquerda
    for (const c of [b, ...resto]) r.irPorChao(c, 15.5);
    r.anda(b, 14.5);                           // b segura o da direita
    r.irPorChao(a, 15.8);                      // a passa
    const ro = quem('rosa'); r.irPorChao(ro, 19); r.acao(ro);
    for (const c of ids) r.subirEscada(c);
    for (const c of ids) r.subirDegrau(c);
    const az = quem('azul'); r.irMeioEsquerda(az, 3.5); r.acao(az); r.voltarDoMeioEsquerda(az); r.pulaPara(az, 13.6);
    r.ate(() => r.j.plataformas[1].py < -2.1);
    for (const c of ids) r.aoPortal(c);
  },
  '1-5'(r, ids) {
    const [a, b, ...resto] = ids;
    const quem = cor => ids.find(i => COR_DO_PERSONAGEM[i] === cor);
    for (const c of ids) r.balsa(c, 'balsa', 9.6);
    r.anda(a, 10.5);                                   // a segura a porta
    for (const c of [b, ...resto]) r.irPorChao(c, 15);
    r.anda(b, 14);                                     // b segura do outro lado
    r.irPorChao(a, 15.2);
    for (const c of ids) r.subirEscada(c);
    // alavanca amarela na parte esquerda do meio (atravessa pelo elevador, que está embaixo)
    const am = quem('amarelo') || b;
    r.anda(am, 10.9); r.anda(am, 9.3); r.irPorChao(am, 3.5); r.acao(am); r.irPorChao(am, 9.3); r.anda(am, 12.6);
    danca(r, a, b, resto, () => r.j.plataformas[2].py, 13, false);
    const ro = quem('rosa') || a; r.anda(ro, 14.3); r.acao(ro);
    r.ate(() => r.j.plataformas[3].py < -2.1);
    for (const c of ids) r.aoPortal(c);
  },
};

const so = process.argv[2];
let falhas = 0;
for (const fase of FASES) {
  if (so && fase.id !== so) continue;
  for (const combo of COMBOS) {
    const ids = combo;
    const r = new Robo(fase, ids);
    let res;
    try { ROTEIROS[fase.id](r, ids); res = r.fim(); } catch (e) { res = 'ERRO: ' + e.message; }
    const ok = res === 'vitoria';
    if (!ok) falhas++;
    const pl = r.j.placar();
    console.log(`${ok ? '✓' : '✗'} ${fase.id} [${ids.join(',')}] ${res}  t=${r.j.tempo.toFixed(0)}s pecas=${pl.pecas}`);
  }
}
process.exit(falhas ? 1 : 0);
