// Simulação do modo isométrico (Mundo 2): mapa aberto visto de cima, com missões espalhadas.
// Unidades em tiles e segundos. x = leste, z = sul (linha do mapa), y = altura (para cima).
// O tile (c, l) ocupa x ∈ [c, c+1] e z ∈ [l, l+1]; objetos ficam no centro (c + 0.5, l + 0.5).
//
// Mapa: '0'-'3' chão naquela altura, '#' cerca, 'T' árvore (as duas bloqueiam), '~' água,
// 'b' 'r' 'y' 'g' chão colorido: só o time da cor passa (para os outros é parede).
//
// Ajuda entre times: quem cai na água fica sentado na margem ("caído") até um colega chegar e apertar AÇÃO.
// Sem ajuda, levanta sozinho depois de um tempo e perde um coração; sem corações, só levanta com ajuda.
// Não existe derrota: o mundo termina quando a missão final é concluída.

import { COR_DO_PERSONAGEM, FX as FX_BASE } from './sim.js';

const COR_DO_CHAO = { b: 'azul', r: 'rosa', y: 'amarelo', g: 'verde' };
const PAREDE = 99, AGUA = -0.6;
const GRAV = 32, PULO = 9.6, CORRIDA = 5.2, ACEL_CHAO = 40, ACEL_AR = 22, QUEDA_MAX = 20;
const RAIO = 0.28, DEGRAU = 0.3;
const COYOTE = 0.1, BUFFER_PULO = 0.12;
const MOLA = 1.25, PLANADOR_QUEDA = 2.0;
const CARREGANDO_VEL = 0.85;
const ESPERA_AJUDA = 7, INVULNERAVEL = 1.2;
const EMPURRAO = 0.25, CAIXA_ANDA = 0.3;
const ARREMESSO = 0.5;

export const FX = { ...FX_BASE, CAIDO_SEM_CORACAO: 32 };

const tileDe = v => Math.floor(v);
const dist2 = (ax, az, bx, bz) => Math.hypot(ax - bx, az - bz);

export class JogoIso {
  // ativos: ids dos personagens em jogo. pessoas: quantas pessoas de verdade jogam (sozinho = 1);
  // caixas pesadas e obras pedem no máximo esse número de ajudantes.
  constructor(faseBase, compras = {}, ativos = null, pessoas = null) {
    const fase = filtrarFaseIso(faseBase, ativos);
    this.fase = fase;
    this.mapa = fase.mapa;
    this.L = fase.mapa.length;
    this.C = fase.mapa[0].length;
    this.tempo = 0;
    this.eventos = [];
    this.resultado = null;
    this.fimEm = null;
    this.pecas = 0;
    this.pessoas = Math.max(1, pessoas ?? fase.personagens.length);
    this.coracoes = {};
    this.botoes = Object.fromEntries((fase.botoes || []).map(b => [b.id, { ...b, pressionado: false }]));
    this.alavancas = Object.fromEntries((fase.alavancas || []).map(a => [a.id, { ...a, ligada: false }]));
    this.obras = Object.fromEntries((fase.obras || []).map(o => [o.id, { ...o, progresso: 0, pronta: false, trabalhando: 0 }]));
    this.encaixes = Object.fromEntries((fase.encaixes || []).map(e => [e.id, { ...e, cheio: null }]));
    this.plataformas = (fase.plataformas || []).map(p => ({ ...p, h: p.y0 }));
    this.caixas = (fase.caixas || []).map(c => ({ ...c, c: tileDe(c.x), l: tileDe(c.z), base: 0, afundada: false,
                                                 px: c.x, pz: c.z, de: null, t: 0, forca: 0, dirForca: null }));
    for (const cx of this.caixas) cx.base = this.topoTerreno(cx.c, cx.l);
    this.missoes = (fase.missoes || []).map(m => ({ ...m, feita: false }));
    this.personagens = fase.personagens.map(p => {
      const cor = COR_DO_PERSONAGEM[p.id];
      const c = compras[cor] || {};
      const max = (fase.coracoes ?? 3) + (c.coracao || 0);
      this.coracoes[cor] = { n: max, max };
      const y = this.topo(tileDe(p.x), tileDe(p.z), null);
      return {
        id: p.id, cor, x: p.x, z: p.z, y, vx: 0, vz: 0, vy: 0, ang: 90,
        noChao: true, coyote: 0, buffer: 0, empurrando: null, sobre: null,
        caido: false, caidoDesde: 0, invulAte: 0, ajudouAte: 0, seguro: { x: p.x, z: p.z, y },
        carregando: null, mola: !!c.mola, planador: !!c.planador, planando: false,
      };
    });
    this.blocos = (fase.blocos || []).map(b => {
      const y = this.topo(tileDe(b.x), tileDe(b.z), 'bloco');
      return { ...b, origem: { x: b.x, z: b.z, y }, y, por: null, voo: null, preso: false };
    });
    this.gemas = fase.gemas.map((g, i) => ({ ...g, i, pega: false,
                                             y: g.y ?? this.topoTerreno(tileDe(g.x), tileDe(g.z)) + 0.7 }));
  }

  // ---------- terreno ----------
  char(c, l) { return this.mapa[l]?.[c]; }
  topoTerreno(c, l) {
    const t = this.char(c, l);
    if (t === undefined || t === '#' || t === 'T') return PAREDE;
    if (t === '~') return AGUA;
    if (t in COR_DO_CHAO) return 0;
    return Number(t) || 0;
  }
  // Altura da superfície do tile para quem anda nele. quem: personagem, 'caixa', 'bloco' ou null.
  topo(c, l, quem, ignorarCaixa = null) {
    if (c < 0 || l < 0 || c >= this.C || l >= this.L) return PAREDE;
    let h = null;
    for (const p of this.plataformas) {
      if (p.h === null || p.h === undefined) continue;
      if (c >= p.x && c < p.x + p.w && l >= p.z && l < p.z + p.d) h = Math.max(h ?? -Infinity, p.h);
    }
    for (const cx of this.caixas) {
      if (cx === ignorarCaixa || cx.c !== c || cx.l !== l) continue;
      return cx.afundada ? 0 : cx.base + 1;
    }
    if (h !== null) return h;
    const t = this.char(c, l);
    if (t in COR_DO_CHAO) {
      if (quem === 'caixa') return PAREDE;
      if (quem && typeof quem === 'object' && quem.cor !== COR_DO_CHAO[t]) return PAREDE;
      return 0;
    }
    return this.topoTerreno(c, l);
  }
  tilesSob(x, z, r = RAIO) {
    const out = [];
    for (let l = tileDe(z - r); l <= tileDe(z + r - 1e-6); l++)
      for (let c = tileDe(x - r); c <= tileDe(x + r - 1e-6); c++) out.push([c, l]);
    return out;
  }
  chao(p) {
    let h = -Infinity;
    for (const [c, l] of this.tilesSob(p.x, p.z)) {
      const t = this.topo(c, l, p);
      if (t <= p.y + DEGRAU) h = Math.max(h, t);
    }
    return h;
  }

  // ---------- passo ----------
  passo(dt, entradas) {
    this.tempo += dt;
    this.eventos = [];
    if (this.resultado) return;
    this.atualizaMecanismos(dt);
    for (const p of this.personagens) {
      const ent = entradas[p.id] || {};
      if (p.caido) { this.talvezLevantar(p); continue; }
      this.movePersonagem(p, ent, dt);
      if (ent.acaoBorda) this.acao(p);
    }
    this.atualizaObras(dt, entradas);
    this.atualizaCaixas(dt);
    this.atualizaBlocos(dt);
    this.verificaContatos();
  }

  ativo(id) {
    if (this.botoes[id]) return this.botoes[id].pressionado;
    if (this.alavancas[id]) return this.alavancas[id].ligada;
    if (this.obras[id]) return this.obras[id].pronta;
    if (this.encaixes[id]) return this.encaixes[id].cheio !== null;
    const m = this.missoes.find(o => o.id === id);
    return !!m?.feita;
  }

  atualizaMecanismos(dt) {
    for (const b of Object.values(this.botoes)) {
      const antes = b.pressionado;
      const c = tileDe(b.x), l = tileDe(b.z), base = this.topoTerreno(c, l);
      b.pressionado =
        this.personagens.some(p => !p.caido && p.noChao && (!b.cor || b.cor === p.cor) &&
                                   dist2(p.x, p.z, b.x, b.z) < 0.55 && Math.abs(p.y - base) < 0.1) ||
        (!b.cor && this.caixas.some(cx => !cx.afundada && !cx.de && cx.c === c && cx.l === l)) ||
        (!b.cor && this.blocos.some(o => !o.por && !o.voo && tileDe(o.x) === c && tileDe(o.z) === l));
      if (b.pressionado !== antes) this.eventos.push({ e: 'placa', id: b.id, on: b.pressionado });
    }
    for (const pl of this.plataformas) {
      const ativos = (pl.gatilhos || []).map(id => this.ativo(id));
      const on = pl.modo === 'e' ? ativos.every(Boolean) : ativos.some(Boolean);
      const alvo = on ? pl.y1 : pl.y0;
      const antes = pl.h;
      if (alvo === null || alvo === undefined) pl.h = null;
      else if (pl.h === null || pl.h === undefined) pl.h = alvo;
      else pl.h += Math.sign(alvo - pl.h) * Math.min(Math.abs(alvo - pl.h), (pl.vel ?? 2.5) * dt);
      const dh = (pl.h ?? 0) - (antes ?? 0);
      if (dh) for (const p of this.personagens) if (p.sobre === pl.id && !p.caido) p.y += dh;
    }
  }

  movePersonagem(p, ent, dt) {
    // Entrada em coordenadas de tela (jx para a direita, jy para baixo); a câmera olha do sudeste,
    // então "direita na tela" é +x −z e "baixo na tela" é +x +z.
    let jx = Number(ent.jx) || ((ent.dir ? 1 : 0) - (ent.esq ? 1 : 0));
    let jy = Number(ent.jy) || ((ent.baixo ? 1 : 0) - (ent.cima ? 1 : 0));
    const m = Math.hypot(jx, jy);
    if (m > 1) { jx /= m; jy /= m; }
    const ix = (jx + jy) / Math.SQRT2, iz = (jy - jx) / Math.SQRT2;
    const vmax = CORRIDA * (p.carregando ? CARREGANDO_VEL : 1);
    const acel = (p.noChao ? ACEL_CHAO : ACEL_AR) * dt;
    const aproxima = (v, alvo) => (v < alvo ? Math.min(alvo, v + acel) : Math.max(alvo, v - acel));
    p.vx = aproxima(p.vx, ix * vmax);
    p.vz = aproxima(p.vz, iz * vmax);
    if (Math.hypot(ix, iz) > 0.2) p.ang = Math.round(Math.atan2(iz, ix) * 180 / Math.PI);

    // Pulo (carregando bloco não dá para pular: é pesado)
    p.coyote = p.noChao ? COYOTE : Math.max(0, p.coyote - dt);
    p.buffer = ent.puloBorda ? BUFFER_PULO : Math.max(0, p.buffer - dt);
    if (p.buffer > 0 && p.coyote > 0 && !p.carregando) {
      p.vy = PULO * (p.mola ? MOLA : 1); p.buffer = 0; p.coyote = 0; p.noChao = false; p.sobre = null;
      this.eventos.push({ e: 'pulo', id: p.id });
    }
    if (!ent.pulo && p.vy > PULO * 0.45) p.vy = PULO * 0.45;
    p.vy = Math.max(-QUEDA_MAX, p.vy - GRAV * dt);
    p.planando = !!(p.planador && !p.noChao && ent.pulo && p.vy < 0);
    if (p.planando) p.vy = Math.max(p.vy, -PLANADOR_QUEDA);

    // Horizontal, um eixo por vez
    p.empurrando = null;
    this.moveEixo(p, 'x', p.vx * dt, Math.abs(ix) > 0.5 && Math.abs(ix) >= Math.abs(iz) * 0.8 ? Math.sign(ix) : 0);
    this.moveEixo(p, 'z', p.vz * dt, Math.abs(iz) > 0.5 && Math.abs(iz) >= Math.abs(ix) * 0.8 ? Math.sign(iz) : 0);

    // Vertical
    const estavaNoChao = p.noChao;
    const g = this.chao(p);
    p.y += p.vy * dt;
    p.noChao = false;
    if (p.y <= g) {
      p.y = g; p.vy = 0; p.noChao = true;
    }
    p.sobre = null;
    if (p.noChao) {
      for (const pl of this.plataformas) {
        if (pl.h === null || pl.h === undefined || Math.abs(pl.h - p.y) > 0.02) continue;
        if (this.tilesSob(p.x, p.z).some(([c, l]) => c >= pl.x && c < pl.x + pl.w && l >= pl.z && l < pl.z + pl.d)) p.sobre = pl.id;
      }
    }
    if (p.noChao && !estavaNoChao) this.eventos.push({ e: 'pouso', id: p.id });

    if (p.y < AGUA + 0.35) { this.cair(p); return; }

    // Último lugar seguro: chão firme (sem água, sem plataforma) sob todo o corpo.
    if (p.noChao && !p.sobre) {
      const tiles = this.tilesSob(p.x, p.z, RAIO + 0.15);
      if (tiles.every(([c, l]) => { const t = this.char(c, l); return /[0-3]/.test(t) && this.topoTerreno(c, l) === p.y; }))
        p.seguro = { x: p.x, z: p.z, y: p.y };
    }
  }

  moveEixo(p, eixo, delta, intencao) {
    if (!delta) return;
    const antes = p[eixo];
    p[eixo] += delta;
    for (const [c, l] of this.tilesSob(p.x, p.z)) {
      const t = this.topo(c, l, p);
      if (t <= p.y + DEGRAU) continue;
      // bateu: encosta na borda do tile
      if (eixo === 'x') p.x = delta > 0 ? c - RAIO - 1e-4 : c + 1 + RAIO + 1e-4;
      else p.z = delta > 0 ? l - RAIO - 1e-4 : l + 1 + RAIO + 1e-4;
      if (Math.sign(p[eixo] - antes) !== Math.sign(delta) && Math.abs(p[eixo] - antes) > Math.abs(delta)) p[eixo] = antes;
      if (eixo === 'x') p.vx = 0; else p.vz = 0;
      const cx = this.caixas.find(o => !o.afundada && o.c === c && o.l === l);
      if (cx && intencao && p.noChao && Math.abs(p.y - cx.base) < 0.1 && !p.carregando)
        p.empurrando = { caixa: cx, dc: eixo === 'x' ? intencao : 0, dl: eixo === 'z' ? intencao : 0 };
    }
  }

  // ---------- ação ----------
  acao(p) {
    // 1) levantar um colega caído
    const amigo = this.personagens.find(o => o !== p && o.caido && dist2(o.x, o.z, p.x, p.z) < 1.6);
    if (amigo) { this.levantar(amigo, p); return; }
    // 2) arremessar o bloco que está carregando
    if (p.carregando) { this.arremessar(p); return; }
    // 3) pegar bloco
    const bloco = this.blocos.find(b => !b.por && !b.voo && !b.preso && dist2(b.x, b.z, p.x, p.z) < 0.9 && Math.abs(b.y - p.y) < 0.6);
    if (bloco) {
      bloco.por = p.id; p.carregando = bloco.id;
      this.eventos.push({ e: 'pegar', id: p.id });
      return;
    }
    // 4) alavanca
    for (const a of Object.values(this.alavancas)) {
      if (dist2(a.x, a.z, p.x, p.z) < 1.1 && Math.abs(this.topoTerreno(tileDe(a.x), tileDe(a.z)) - p.y) < 0.8) {
        if (a.cor && a.cor !== p.cor) { this.eventos.push({ e: 'negado', id: p.id, cor: a.cor, x: a.x, z: a.z }); return; }
        a.ligada = !a.ligada;
        this.eventos.push({ e: 'alavanca', id: a.id, on: a.ligada });
        return;
      }
    }
  }

  // Joga o bloco para a frente: cai 2 tiles adiante (passa por cima de muro e de rio estreito),
  // ou 1 tile, ou no próprio lugar, conforme couber. Se cair na água, volta para o lugar de origem.
  arremessar(p) {
    const b = this.blocos.find(o => o.id === p.carregando);
    p.carregando = null;
    b.por = null;
    const a = p.ang * Math.PI / 180;
    // direção arredondada para uma das 8 direções
    const dc = Math.round(Math.cos(a)), dl = Math.round(Math.sin(a));
    const c0 = tileDe(p.x), l0 = tileDe(p.z);
    let alvo = null;
    // mira automática: encaixe vazio à frente, a até 2,6 tiles
    const enc = Object.values(this.encaixes).find(e => {
      if (e.cheio || (e.cor && b.cor && e.cor !== b.cor)) return false;
      const d = dist2(e.x, e.z, p.x, p.z);
      const ang = Math.atan2(e.z - p.z, e.x - p.x);
      const dif = Math.abs(((ang - a) + 3 * Math.PI) % (2 * Math.PI) - Math.PI);
      return d < 2.6 && (d < 0.8 || dif < 1.0) && this.topo(tileDe(e.x), tileDe(e.z), 'bloco') <= p.y + 2.2;
    });
    if (enc) alvo = { x: enc.x, z: enc.z, y: this.topo(tileDe(enc.x), tileDe(enc.z), 'bloco') };
    for (const n of alvo ? [] : [2, 1, 0]) {
      const c = c0 + dc * n, l = l0 + dl * n;
      const t = this.topo(c, l, 'bloco');
      if (t >= PAREDE || t > p.y + 2.2) continue;
      if (n > 0 && this.blocos.some(o => o !== b && !o.por && tileDe(o.x) === c && tileDe(o.z) === l)) continue;
      alvo = { x: c + 0.5, z: l + 0.5, y: t };
      break;
    }
    alvo ??= { x: p.x, z: p.z, y: p.y };
    b.voo = { de: { x: b.x, z: b.z, y: b.y }, para: alvo, t: 0 };
    this.eventos.push({ e: 'soltar', id: p.id });
  }

  // ---------- caídos ----------
  cair(p) {
    if (p.carregando) {
      const b = this.blocos.find(o => o.id === p.carregando);
      b.por = null; Object.assign(b, b.origem);
      p.carregando = null;
    }
    p.caido = true; p.caidoDesde = this.tempo;
    p.x = p.seguro.x; p.z = p.seguro.z; p.y = p.seguro.y;
    p.vx = p.vz = p.vy = 0; p.noChao = true; p.sobre = null;
    this.eventos.push({ e: 'caiu', id: p.id, x: p.x, z: p.z, y: p.y });
  }
  levantar(p, ajudante = null) {
    p.caido = false; p.invulAte = this.tempo + INVULNERAVEL;
    if (ajudante) ajudante.ajudouAte = this.tempo + 0.7;
    this.eventos.push({ e: ajudante ? 'ajudou' : 'levantou', id: p.id, por: ajudante?.id, x: p.x, z: p.z, y: p.y });
  }
  talvezLevantar(p) {
    if (this.tempo - p.caidoDesde < ESPERA_AJUDA) return;
    const c = this.coracoes[p.cor];
    // Todos caídos ao mesmo tempo: ninguém poderia ajudar, então levanta mesmo sem coração.
    const todosCaidos = this.personagens.every(o => o.caido);
    if (c.n <= 0 && !todosCaidos) return;
    if (c.n > 0) { c.n--; this.eventos.push({ e: 'morte', id: p.id, x: p.x, z: p.z, y: p.y, coracoes: c.n }); }
    this.levantar(p);
  }

  // ---------- obras, caixas e blocos ----------
  atualizaObras(dt, entradas) {
    const nTimes = this.personagens.length;
    for (const o of Object.values(this.obras)) {
      if (o.pronta) continue;
      const perto = this.personagens.filter(p => !p.caido && (entradas[p.id] || {}).acao && !p.carregando &&
        p.x > o.x - 1.3 && p.x < o.x + o.w + 1.3 && p.z > o.z - 1.3 && p.z < o.z + o.d + 1.3);
      const precisa = Math.min(o.times === 'todos' ? nTimes : (o.times ?? 2), this.pessoas, nTimes);
      o.trabalhando = perto.length;
      o.precisa = precisa;
      if (perto.length >= precisa) o.progresso = Math.min(o.tempo, o.progresso + dt);
      else o.progresso = Math.max(0, o.progresso - dt * 0.4);
      if (o.progresso >= o.tempo) { o.pronta = true; this.eventos.push({ e: 'construir', id: o.id }); }
    }
  }

  atualizaCaixas(dt) {
    for (const cx of this.caixas) {
      if (cx.de) {
        cx.t += dt;
        const k = Math.min(1, cx.t / CAIXA_ANDA);
        cx.px = cx.de.x + (cx.c + 0.5 - cx.de.x) * k;
        cx.pz = cx.de.z + (cx.l + 0.5 - cx.de.z) * k;
        if (k >= 1) {
          cx.de = null;
          if (this.char(cx.c, cx.l) === '~') { cx.afundada = true; this.eventos.push({ e: 'afundou', x: cx.px, z: cx.pz }); }
        }
        continue;
      }
      if (cx.afundada) continue;
      const grupos = {};
      for (const p of this.personagens) {
        if (p.empurrando?.caixa !== cx) continue;
        const k = `${p.empurrando.dc},${p.empurrando.dl}`;
        (grupos[k] ??= []).push(p);
      }
      const precisa = Math.min(cx.peso ?? 1, this.pessoas, this.personagens.length);
      const melhor = Object.entries(grupos).find(([, ps]) => ps.length >= precisa);
      if (!melhor) { cx.forca = 0; cx.dirForca = null; cx.empurradores = Math.max(0, ...Object.values(grupos).map(g => g.length)); continue; }
      cx.empurradores = melhor[1].length;
      if (cx.dirForca !== melhor[0]) { cx.dirForca = melhor[0]; cx.forca = 0; }
      cx.forca += dt;
      if (cx.forca < EMPURRAO) continue;
      cx.forca = 0;
      const [dc, dl] = melhor[0].split(',').map(Number);
      const c = cx.c + dc, l = cx.l + dl;
      if (!this.caixaPodeIr(cx, c, l)) { this.eventos.push({ e: 'travou', x: cx.px, z: cx.pz }); continue; }
      cx.de = { x: cx.px, z: cx.pz }; cx.t = 0; cx.c = c; cx.l = l;
      this.eventos.push({ e: 'empurrou', x: cx.px, z: cx.pz });
    }
  }
  caixaPodeIr(cx, c, l) {
    const t = this.topo(c, l, 'caixa', cx);
    const agua = this.char(c, l) === '~' && t === AGUA && cx.base === 0;
    if (t !== cx.base && !agua) return false;
    if (this.caixas.some(o => o !== cx && o.c === c && o.l === l)) return false;
    if (this.blocos.some(b => !b.por && tileDe(b.x) === c && tileDe(b.z) === l)) return false;
    // não esmaga ninguém
    if (this.personagens.some(p => !p.caido && this.tilesSob(p.x, p.z).some(([a, b]) => a === c && b === l))) return false;
    return true;
  }

  atualizaBlocos(dt) {
    for (const b of this.blocos) {
      if (b.por) {
        const p = this.personagens.find(o => o.id === b.por);
        b.x = p.x; b.z = p.z; b.y = p.y + 2.3;
        continue;
      }
      if (b.voo) {
        b.voo.t += dt;
        const k = Math.min(1, b.voo.t / ARREMESSO);
        const { de, para } = b.voo;
        b.x = de.x + (para.x - de.x) * k;
        b.z = de.z + (para.z - de.z) * k;
        b.y = de.y + (para.y - de.y) * k + Math.sin(k * Math.PI) * 1.4;
        if (k >= 1) { b.voo = null; b.y = para.y; this.eventos.push({ e: 'pousou', x: b.x, z: b.z, y: b.y }); }
        continue;
      }
      // em repouso: acompanha a altura do chão (elevador, caixa)
      b.y = this.topo(tileDe(b.x), tileDe(b.z), 'bloco');
      if (b.y <= AGUA) { Object.assign(b, b.origem); this.eventos.push({ e: 'voltou', x: b.x, z: b.z, y: b.y }); }
      if (!b.preso) {
        const e = Object.values(this.encaixes).find(o => !o.cheio && tileDe(o.x) === tileDe(b.x) && tileDe(o.z) === tileDe(b.z) &&
                                                         (!o.cor || !b.cor || o.cor === b.cor));
        if (e) {
          e.cheio = b.id; b.preso = true; b.x = e.x; b.z = e.z;
          this.eventos.push({ e: 'encaixe', id: e.id, x: b.x, z: b.z, y: b.y });
        }
      }
    }
  }

  // ---------- coletas e missões ----------
  verificaContatos() {
    for (const p of this.personagens) {
      if (p.caido) continue;
      for (const g of this.gemas) {
        if (g.pega || (g.cor !== 'peca' && g.cor !== p.cor)) continue;
        if (dist2(p.x, p.z, g.x, g.z) < 0.6 && g.y > p.y - 0.3 && g.y < p.y + 1.9) {
          g.pega = true;
          if (g.cor === 'peca') this.pecas++;
          this.eventos.push({ e: g.cor === 'peca' ? 'peca' : 'bandeira', cor: g.cor, x: g.x, z: g.z, y: g.y, i: g.i });
        }
      }
    }
    for (const m of this.missoes) {
      if (m.feita) continue;
      if (m.depois && !m.depois.every(id => this.ativo(id))) continue;
      const altura = this.topo(tileDe(m.x), tileDe(m.z), null);
      const chegou = p => !p.caido && p.noChao && Math.abs(p.y - altura) < 0.3;
      const ok = m.todos
        ? this.personagens.every(p => chegou(p) && dist2(p.x, p.z, m.x, m.z) < 2.6)
        : this.personagens.some(p => chegou(p) && dist2(p.x, p.z, m.x, m.z) < 0.9);
      if (ok) {
        m.feita = true;
        this.eventos.push({ e: 'missao', id: m.id, x: m.x, z: m.z, y: altura, final: !!m.final });
      }
    }
    if (this.missoes.some(m => m.final && m.feita)) {
      this.fimEm ??= this.tempo + 2.0;
      if (this.tempo >= this.fimEm) { this.resultado = 'vitoria'; this.eventos.push({ e: 'vitoria' }); }
    }
  }

  // ---------- estado para os clientes ----------
  animacao(p) {
    if (p.caido) return 'caido';
    if (this.resultado === 'vitoria' || this.fimEm) return 'vitoria';
    if (this.tempo < p.ajudouAte) return 'ajudar';
    if (!p.noChao) return p.vy > 0 ? 'pulo' : 'queda';
    if (p.empurrando) return 'empurrar';
    const andando = Math.hypot(p.vx, p.vz) > 0.4;
    if (p.carregando) return andando ? 'carregar' : 'carregar_parado';
    return andando ? 'corrida' : 'idle';
  }
  efeitos(p) {
    return (this.tempo < p.invulAte ? FX.INVUL : 0) | (p.planando ? FX.PLANANDO : 0) |
           (p.mola ? FX.TEM_MOLA : 0) | (p.planador ? FX.TEM_PLANADOR : 0) |
           (p.caido && this.coracoes[p.cor].n <= 0 ? FX.CAIDO_SEM_CORACAO : 0);
  }
  estado() {
    const r2 = n => Math.round(n * 1000) / 1000;
    return {
      iso: 1,
      tempo: r2(this.tempo),
      ch: this.personagens.map(p => [r2(p.x), r2(p.z), r2(p.y), p.ang, this.animacao(p), this.efeitos(p),
                                     p.caido ? r2(Math.max(0, ESPERA_AJUDA - (this.tempo - p.caidoDesde))) : 0]),
      cor: this.personagens.map(p => [this.coracoes[p.cor].n, this.coracoes[p.cor].max]),
      gemas: this.gemas.map(g => (g.pega ? 1 : 0)),
      alav: Object.values(this.alavancas).map(a => (a.ligada ? 1 : 0)),
      bot: Object.values(this.botoes).map(b => (b.pressionado ? 1 : 0)),
      plat: this.plataformas.map(p => (p.h === null || p.h === undefined ? null : r2(p.h))),
      obras: Object.values(this.obras).map(o => [r2(o.progresso / o.tempo), o.trabalhando, o.precisa ?? 0, o.pronta ? 1 : 0]),
      caixas: this.caixas.map(c => [r2(c.px), r2(c.pz), c.afundada ? -1 : c.base, c.empurradores || 0, Math.min(c.peso ?? 1, this.pessoas, this.personagens.length)]),
      blocos: this.blocos.map(b => [r2(b.x), r2(b.z), r2(b.y), b.preso ? 1 : 0]),
      enc: Object.values(this.encaixes).map(e => (e.cheio ? 1 : 0)),
      missoes: this.missoes.map(m => (m.feita ? 1 : 0)),
      pecas: this.pecas,
    };
  }

  placar() {
    const por = {};
    for (const g of this.gemas) {
      por[g.cor] ??= { pegas: 0, total: 0 };
      por[g.cor].total++;
      if (g.pega) por[g.cor].pegas++;
    }
    return { tempo: this.tempo, gemas: por, pecas: this.pecas };
  }
}

// Recorta a fase para os times presentes: chão, alavancas, placas e blocos de times ausentes ficam livres.
export function filtrarFaseIso(f, ativos) {
  const ids = ativos?.length ? ativos : f.personagens.map(p => p.id);
  const cores = new Set(ids.map(id => COR_DO_PERSONAGEM[id]));
  const livre = o => (o.cor && !cores.has(o.cor) ? { ...o, cor: null } : o);
  const ausentes = Object.entries(COR_DO_CHAO).filter(([, cor]) => !cores.has(cor)).map(([ch]) => ch);
  return {
    ...f,
    mapa: f.mapa.map(linha => [...linha].map(ch => (ausentes.includes(ch) ? '0' : ch)).join('')),
    personagens: f.personagens.filter(p => ids.includes(p.id)),
    gemas: f.gemas.filter(g => g.cor === 'peca' || cores.has(g.cor)),
    alavancas: (f.alavancas || []).map(livre),
    botoes: (f.botoes || []).map(livre),
    blocos: (f.blocos || []).map(livre),
    encaixes: (f.encaixes || []).map(livre),
  };
}
