// Robô que joga cada fase de plataforma do início ao fim, com 4 times, trios e duplas, para garantir que todas têm solução.
// As fases vêm do gerador com um roteiro (passos na ordem); o robô só segue os passos.
// Uso: node tools/testar_fases.mjs [id-da-fase]
import { Jogo, COR_DO_PERSONAGEM } from '../public/jogo/sim.js';
import { FASES } from '../public/jogo/fases.js';
import { FASE_TREINO, PASSOS_TREINO } from '../public/jogo/treino.js';

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
    this.passoTreino = fase.treino ? 0 : null; // no treino, confere que os objetivos avançam em ordem
  }
  P(id) { return this.j.personagens.find(p => p.id === id); }
  tick(id, e = {}) {
    this.j.passo(DT, id ? { [id]: e } : {});
    this.f++;
    for (const ev of this.j.eventos) {
      if (ev.e === 'morte') throw new Error(`${ev.id} morreu (${ev.poca}) em x=${ev.x.toFixed(2)} y=${ev.y.toFixed(2)}`);
      if (!['pouso', 'pulo', 'botao'].includes(ev.e)) this.log.push(`${ev.e}${ev.id ? ':' + ev.id : ''}`);
    }
    if (this.passoTreino !== null && this.passoTreino < PASSOS_TREINO.length &&
        PASSOS_TREINO[this.passoTreino].feito(this.j, this.j.eventos)) this.passoTreino++;
    if (this.f > 60 * 600) throw new Error('tempo esgotado');
  }
  espera(n, id) { for (let k = 0; k < n; k++) this.tick(id); }
  ate(cond, max = 900) {
    for (let k = 0; k < max; k++) { if (cond()) return; this.tick(); }
    throw new Error('condição nunca aconteceu (' + this.j.personagens.map(p => `${p.id} ${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ') + ')');
  }

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

  // Anda no andar de laje R até x: pula poças que não são do time e sobe/desce degraus de 1 bloco.
  cruzar(id, x, R) {
    const p = this.P(id), cor = COR_DO_PERSONAGEM[id];
    const chao = this.j.mapa[R], corredor = this.j.mapa[R - 1];
    const tipo = c => (corredor[c] === '#' ? 'bloco' : chao[c] in POCA && POCA[chao[c]] !== cor ? 'perigo' : null);
    for (let guarda = 0; guarda < 40; guarda++) {
      if (Math.abs(p.x - x) <= 0.12) return;
      const dir = Math.sign(x - p.x);
      const cx = Math.floor(x);
      if (p.y < R - 0.5) {      // em cima de um degrau: anda até a ponta (ou até x, se for nele) e desce
        let e = Math.floor(p.x);
        while (tipo(e + dir) === 'bloco') e += dir;
        if ((cx - e) * dir <= 0) { this.anda(id, x); return; }
        this.anda(id, dir > 0 ? e + 1.6 : e - 0.6);
        continue;
      }
      let ini = null, fim = null, t0 = null;
      for (let c = Math.floor(p.x + dir * 0.3); dir > 0 ? c <= cx : c >= cx; c += dir) {
        const t = tipo(c);
        if (t && ini === null) { ini = c; t0 = t; }
        if (ini !== null && t !== t0) { fim = c - dir; break; }
      }
      if (ini === null) { this.anda(id, x); return; }
      fim ??= cx;
      const borda = dir > 0 ? ini - 0.4 : ini + 1.4;
      for (let k = 0; k < 600 && (dir > 0 ? p.x < borda : p.x > borda); k++) this.tick(id, { dir: dir > 0, esq: dir < 0 });
      if (t0 === 'bloco') this.pulaPara(id, (cx - ini) * dir >= 0 && (cx - fim) * dir <= 0 ? x : ini + 0.5 + dir * 0.1);
      else { const alvo = dir > 0 ? fim + 1.7 : fim - 0.7; this.pulaPara(id, Math.abs(alvo - p.x) < Math.abs(x - p.x) ? alvo : x); }
    }
    throw new Error(`${id} não conseguiu chegar em x=${x} (está em ${p.x.toFixed(2)},${p.y.toFixed(2)})`);
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

// ---------- roteiro das fases geradas ----------
function seguirRoteiro(r, ids) {
  const [a, b] = ids;
  const quem = cor => ids.find(i => COR_DO_PERSONAGEM[i] === cor) || a;
  const plat = id => r.j.plataformas.find(p => p.id === id);
  for (const s of r.j.fase.roteiro) {
    if (process.env.DEBUG) console.log('  passo', JSON.stringify(s));
    switch (s.t) {
      case 'ir': for (const c of ids) r.cruzar(c, s.x, s.R); break;
      case 'porta': {   // a segura o primeiro botão, os outros passam, b segura o segundo e a passa
        const pl = plat(s.pl), aberta = () => Math.abs(pl.py - s.aberto) < 0.02;
        r.cruzar(a, s.b1, s.R); r.ate(aberta);
        for (const c of ids.slice(1)) r.cruzar(c, s.alem, s.R);
        r.anda(b, s.b2); r.ate(aberta);
        r.cruzar(a, s.alem, s.R);
        r.cruzar(b, s.alem, s.R);
        break;
      }
      case 'balsa': {
        const pl = plat(s.pl);
        for (const c of ids) {
          r.cruzar(c, s.antes, s.R);
          r.ate(() => Math.abs(pl.px - pl.x) < 0.02 && pl.espera > 0.3);
          r.anda(c, pl.x + pl.w / 2);
          r.ate(() => Math.abs(pl.px - pl.x2) < 0.02 && pl.espera > 0.2);
          r.anda(c, s.depois);
        }
        break;
      }
      case 'alavanca': { const c = quem(s.cor); r.cruzar(c, s.x, s.R); r.acao(c); break; }
      case 'portao': { const pl = plat(s.pl); r.ate(() => Math.abs(pl.py - s.aberto) < 0.02); break; }
      case 'escada':
        for (const c of ids) {
          r.cruzar(c, s.antes, s.R);
          for (const x of s.degraus) r.pulaPara(c, x);
          r.anda(c, s.borda);
          r.pulaPara(c, s.chegada);
          if (Math.abs(r.P(c).y - (s.R - 5)) > 0.05) throw new Error(`${c} não subiu a escada (y=${r.P(c).y.toFixed(2)})`);
        }
        break;
      case 'elevador': {
        const pl = plat(s.pl), embaixo = () => Math.abs(pl.py - s.baixo) < 0.02, emcima = () => Math.abs(pl.py - s.cima) < 0.02;
        r.cruzar(a, s.bBaixo, s.R); r.ate(embaixo);
        for (const c of ids.slice(1)) r.anda(c, s.embarque);
        r.anda(a, s.fora); r.ate(emcima);
        for (const c of ids.slice(1)) r.anda(c, s.chegada);
        r.anda(b, s.bCima); r.ate(embaixo);
        r.anda(a, s.embarque);
        r.anda(b, s.chegada); r.ate(emcima);
        r.anda(a, s.chegada);
        for (const c of ids) if (Math.abs(r.P(c).y - s.cima) > 0.05) throw new Error(`${c} não subiu no elevador (y=${r.P(c).y.toFixed(2)})`);
        break;
      }
      case 'auto': {
        const pl = plat(s.pl);
        for (const c of ids) {
          r.cruzar(c, s.antes, s.R);
          r.ate(() => Math.abs(pl.py - pl.y) < 0.02 && pl.espera > 0.5);
          r.anda(c, s.embarque);
          r.ate(() => Math.abs(pl.py - pl.y2) < 0.02);
          r.anda(c, s.chegada);
        }
        break;
      }
      case 'chegada': for (const c of ids) r.aoPortal(c); break;
    }
  }
}

// Treino: degrau com bandeirinhas, poças, elevador automático, curto-circuito, alavanca do portão e arcos.
const ROTEIROS = {};
ROTEIROS.Treino = (r, ids) => {
  const elev = r.j.plataformas.find(p => p.id === 'elev');
  ids.forEach((c, k) => {
    r.anda(c, 3.1);
    r.pulaPara(c, 4.5);                  // degrau (pega a bandeirinha)
    r.anda(c, 4.75);
    r.pulaPara(c, 8.6);                  // do degrau, por cima da poça azul
    r.irPorChao(c, 20.5);                // poças
    r.ate(() => Math.abs(elev.py - elev.y) < 0.02 && elev.espera > 0.3);
    r.anda(c, 22);
    r.ate(() => Math.abs(elev.py - elev.y2) < 0.02);
    r.anda(c, 20.3);
    r.irPorChao(c, 15.2);                // curto-circuito
    if (k === 0) { r.anda(c, 14.5); r.acao(c); r.ate(() => r.j.plataformas.find(p => p.id === 'portao').py < -1.1); }
    r.aoPortal(c);
  });
};

const so = process.argv[2];
let falhas = 0;
for (const fase of [FASE_TREINO, ...FASES]) {
  if (so && fase.id !== so) continue;
  for (const combo of COMBOS) {
    const ids = combo;
    const r = new Robo(fase, ids);
    let res;
    try { (ROTEIROS[fase.id] || seguirRoteiro)(r, ids); res = r.fim(); } catch (e) { res = 'ERRO: ' + e.message; }
    if (res === 'vitoria' && r.passoTreino !== null && r.passoTreino < PASSOS_TREINO.length)
      res = `objetivos parados no passo ${r.passoTreino + 1}: ${PASSOS_TREINO[r.passoTreino].texto}`;
    const ok = res === 'vitoria';
    if (!ok) falhas++;
    const pl = r.j.placar();
    console.log(`${ok ? '✓' : '✗'} ${fase.id} [${ids.join(',')}] ${res}  t=${r.j.tempo.toFixed(0)}s pecas=${pl.pecas}`);
  }
}
process.exit(falhas ? 1 : 0);
