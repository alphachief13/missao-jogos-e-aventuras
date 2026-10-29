// Simulação autoritativa de uma fase. Unidades em tiles e segundos; y cresce para baixo.
// x do personagem é o centro; y é a sola dos pés.

export const COR_DO_PERSONAGEM = { ruivo: 'azul', loira: 'rosa', cacheado: 'amarelo', sapo: 'verde' };
const COR_DA_POCA = { b: 'azul', r: 'rosa', y: 'amarelo', g: 'verde', x: null };

const GRAV = 45, PULO = 15.3, CORRIDA = 6, ACEL_CHAO = 70, ACEL_AR = 40, QUEDA_MAX = 22;
const LARG = 0.7, ALT = 1.75;
const COYOTE = 0.1, BUFFER_PULO = 0.12;
const RENASCER = 1.1, INVULNERAVEL = 1.6;
const MOLA = 1.25;          // tênis de mola: pulo 25% mais forte (~56% mais alto)
const PLANADOR_QUEDA = 2.2;

// Bits de efeitos enviados ao cliente
export const FX = { INVUL: 1, PLANANDO: 4, TEM_MOLA: 8, TEM_PLANADOR: 16 };

const sobrepoe = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

export class Jogo {
  // compras: { azul: { coracao: 1, mola: 1, planador: 0 }, ... } (opcional)
  // ativos: ids dos personagens em jogo (2 a 4). Mecanismos coloridos de times ausentes ficam livres para todos.
  constructor(faseBase, compras = {}, ativos = null) {
    const fase = filtrarFase(faseBase, ativos);
    this.fase = fase;
    this.mapa = fase.mapa;
    this.tempo = 0;
    this.eventos = [];
    this.resultado = null; // 'vitoria' | 'derrota'
    this.fimEm = null;
    this.pecas = 0;
    this.coracoes = {};
    this.personagens = fase.personagens.map(p => {
      const cor = COR_DO_PERSONAGEM[p.id];
      const c = compras[cor] || {};
      const max = (fase.coracoes ?? 3) + (c.coracao || 0);
      this.coracoes[cor] = { n: max, max };
      return {
        id: p.id, cor, x: p.x, y: p.y, vx: 0, vy: 0, dir: 1,
        noChao: true, coyote: 0, buffer: 0, empurrando: false, morto: false, noPortal: false, sobre: null,
        seguro: { x: p.x, y: p.y }, renascerEm: null, invulAte: 0,
        mola: !!c.mola, planador: !!c.planador, planando: false,
      };
    });
    this.gemas = fase.gemas.map((g, i) => ({ ...g, i, pega: false }));
    this.alavancas = Object.fromEntries((fase.alavancas || []).map(a => [a.id, { ...a, ligada: false }]));
    this.botoes = Object.fromEntries((fase.botoes || []).map(b => [b.id, { ...b, pressionado: false }]));
    this.plataformas = (fase.plataformas || []).map(p => ({
      ...p, x2: p.x2 ?? p.x, y2: p.y2 ?? p.y, px: p.x, py: p.y, dx: 0, dy: 0, indo: true, espera: 0,
    }));
  }

  // ---------- geometria ----------
  celulas(r, fn) {
    const c0 = Math.floor(r.x) - 1, c1 = Math.floor(r.x + r.w) + 1;
    const l0 = Math.floor(r.y) - 1, l1 = Math.floor(r.y + r.h) + 1;
    for (let l = Math.max(0, l0); l <= Math.min(this.mapa.length - 1, l1); l++) {
      const linha = this.mapa[l];
      for (let c = Math.max(0, c0); c <= Math.min(linha.length - 1, c1); c++) fn(linha[c], c, l);
    }
  }
  solidos(r) {
    const out = [];
    this.celulas(r, (t, c, l) => {
      if (t === '#') out.push({ x: c, y: l, w: 1, h: 1 });
      else if (t in COR_DA_POCA) out.push({ x: c, y: l + 0.5, w: 1, h: 0.5 });
    });
    for (const p of this.plataformas) out.push({ x: p.px, y: p.py, w: p.w, h: p.h, plat: p.id });
    return out;
  }
  ret(p) { return { x: p.x - LARG / 2, y: p.y - ALT, w: LARG, h: ALT }; }

  // ---------- passo ----------
  passo(dt, entradas) {
    this.tempo += dt;
    this.eventos = [];
    if (this.resultado) return;

    this.atualizaMecanismos(dt);
    for (const p of this.personagens) {
      if (p.morto) { this.talvezRenascer(p); continue; }
      const ent = entradas[p.id] || {};
      this.movePersonagem(p, ent, dt);
      if (ent.acaoBorda) this.acao(p);
    }
    this.verificaContatos();
  }

  ativo(id) { return !!(this.botoes[id]?.pressionado ?? this.alavancas[id]?.ligada); }

  atualizaMecanismos(dt) {
    for (const b of Object.values(this.botoes)) {
      const antes = b.pressionado;
      b.pressionado = this.personagens.some(p => !p.morto && p.noChao && (!b.cor || b.cor === p.cor) &&
                                                 Math.abs(p.x - b.x) < 0.6 && Math.abs(p.y - b.y) < 0.05);
      if (b.pressionado !== antes) this.eventos.push({ e: 'botao', id: b.id, on: b.pressionado });
    }
    for (const pl of this.plataformas) {
      let alvoX, alvoY, esperando = false;
      if (pl.modo === 'auto') {
        if (pl.espera > 0) { pl.espera -= dt; alvoX = pl.px; alvoY = pl.py; esperando = true; }
        else { alvoX = pl.indo ? pl.x2 : pl.x; alvoY = pl.indo ? pl.y2 : pl.y; }
      } else {
        const ativos = (pl.gatilhos || []).map(id => this.ativo(id));
        const on = pl.modo === 'e' ? ativos.every(Boolean)
                 : pl.modo === 'xor' ? ativos.filter(Boolean).length % 2 === 1
                 : ativos.some(Boolean);
        alvoX = on ? pl.x2 : pl.x; alvoY = on ? pl.y2 : pl.y;
      }
      const vx = alvoX - pl.px, vy = alvoY - pl.py, dist = Math.hypot(vx, vy);
      const passo = Math.min(dist, (pl.vel ?? 3) * dt);
      const dx = dist ? (vx / dist) * passo : 0, dy = dist ? (vy / dist) * passo : 0;
      pl.px += dx; pl.py += dy; pl.dx = dx; pl.dy = dy;
      if (pl.modo === 'auto' && !esperando && dist <= passo) { pl.indo = !pl.indo; pl.espera = pl.pausa ?? 0.7; }
      for (const p of this.personagens) if (p.sobre === pl.id && !p.morto) { p.x += dx; p.y += dy; }
    }
  }

  movePersonagem(p, ent, dt) {
    const dirIn = (ent.dir ? 1 : 0) - (ent.esq ? 1 : 0);
    const acel = p.noChao ? ACEL_CHAO : ACEL_AR;
    const alvo = dirIn * CORRIDA;
    if (p.vx < alvo) p.vx = Math.min(alvo, p.vx + acel * dt);
    else if (p.vx > alvo) p.vx = Math.max(alvo, p.vx - acel * dt);
    if (dirIn) p.dir = dirIn;

    p.coyote = p.noChao ? COYOTE : Math.max(0, p.coyote - dt);
    p.buffer = ent.puloBorda ? BUFFER_PULO : Math.max(0, p.buffer - dt);
    if (p.buffer > 0 && p.coyote > 0) {
      p.vy = -PULO * (p.mola ? MOLA : 1); p.buffer = 0; p.coyote = 0; p.noChao = false; p.sobre = null;
      this.eventos.push({ e: 'pulo', id: p.id });
    }
    if (!ent.pulo && p.vy < -PULO * 0.45) p.vy = -PULO * 0.45; // pulo curto ao soltar cedo

    p.vy = Math.min(QUEDA_MAX, p.vy + GRAV * dt);

    // Planador: segurar pulo enquanto cai
    p.planando = !!(p.planador && !p.noChao && ent.pulo && p.vy > 0);
    if (p.planando) p.vy = Math.min(p.vy, PLANADOR_QUEDA);

    // Eixo X
    p.x += p.vx * dt;
    let r = this.ret(p);
    p.empurrando = false;
    for (const s of this.solidos(r)) {
      if (!sobrepoe(r, s)) continue;
      // Degrau baixo (ex.: borda de poça): sobe sozinho se houver espaço em cima.
      const degrau = p.y - s.y;
      if (p.noChao && degrau > 0 && degrau <= 0.55) {
        const acima = { ...r, y: s.y - ALT - 1e-4 };
        if (!this.solidos(acima).some(o => sobrepoe(acima, o))) { p.y = s.y - 1e-4; r = this.ret(p); continue; }
      }
      if (p.vx > 0 || (p.vx === 0 && r.x + r.w / 2 < s.x + s.w / 2)) p.x = s.x - LARG / 2 - 1e-4;
      else p.x = s.x + s.w + LARG / 2 + 1e-4;
      if (dirIn && p.noChao) p.empurrando = true;
      p.vx = 0;
      r = this.ret(p);
    }

    // Eixo Y
    const estavaNoChao = p.noChao;
    p.y += p.vy * dt;
    r = this.ret(p);
    p.noChao = false;
    p.sobre = null;
    for (const s of this.solidos(r)) {
      if (!sobrepoe(r, s)) continue;
      if (p.vy >= 0) { p.y = s.y; p.noChao = true; p.sobre = s.plat ?? null; }
      else p.y = s.y + s.h + ALT;
      p.vy = 0;
      r = this.ret(p);
    }
    if (!p.noChao && p.vy >= 0) {
      const pe = { x: r.x, y: p.y, w: r.w, h: 0.02 };
      for (const s of this.solidos(pe)) if (sobrepoe(pe, s)) { p.noChao = true; p.sobre = s.plat ?? null; }
    }
    if (p.noChao && !estavaNoChao) this.eventos.push({ e: 'pouso', id: p.id });

    // Último lugar seguro (bloco firme sob os dois pés) para renascer.
    if (p.noChao && !p.sobre) {
      const l = Math.round(p.y);
      if (Math.abs(p.y - l) < 0.02 && this.mapa[l]?.[Math.floor(p.x - 0.36)] === '#' && this.mapa[l]?.[Math.floor(p.x + 0.36)] === '#')
        p.seguro = { x: p.x, y: l };
    }
  }

  acao(p) {
    for (const a of Object.values(this.alavancas)) {
      if (Math.abs(p.x - a.x) < 1 && Math.abs(p.y - a.y) < 0.6) {
        if (a.cor && a.cor !== p.cor) { this.eventos.push({ e: 'negado', id: p.id, cor: a.cor, x: a.x, y: a.y }); return; }
        a.ligada = !a.ligada;
        this.eventos.push({ e: 'alavanca', id: a.id, on: a.ligada });
        return;
      }
    }
  }

  morrer(p, motivo) {
    const c = this.coracoes[p.cor];
    c.n = Math.max(0, c.n - 1);
    p.morto = true; p.vx = 0; p.vy = 0; p.noPortal = false;
    p.renascerEm = c.n > 0 ? this.tempo + RENASCER : null;
    this.eventos.push({ e: 'morte', id: p.id, x: p.x, y: p.y, poca: motivo, coracoes: c.n });
  }

  talvezRenascer(p) {
    if (p.renascerEm === null || this.tempo < p.renascerEm) return;
    p.morto = false; p.renascerEm = null;
    p.x = p.seguro.x; p.y = p.seguro.y; p.vx = 0; p.vy = 0; p.noChao = true; p.sobre = null;
    p.invulAte = this.tempo + INVULNERAVEL;
    this.eventos.push({ e: 'renasceu', id: p.id, x: p.x, y: p.y });
  }

  verificaContatos() {
    for (const p of this.personagens) {
      if (p.morto) continue;
      const r = this.ret(p);
      // Poças: só a metade de cima da célula é líquida; os pés precisam entrar nela.
      // (O piscar depois de renascer é só aviso visual: não protege das poças.)
      const corpo = { x: r.x + 0.12, y: r.y, w: r.w - 0.24, h: r.h + 0.02 };
      this.celulas(corpo, (t, c, l) => {
        if (p.morto || !(t in COR_DA_POCA)) return;
        if (sobrepoe(corpo, { x: c, y: l + 0.15, w: 1, h: 0.35 }) && COR_DA_POCA[t] !== p.cor) this.morrer(p, t);
      });
      if (p.morto) continue;
      for (const g of this.gemas) {
        if (g.pega || (g.cor !== 'peca' && g.cor !== p.cor)) continue;
        if (sobrepoe(r, { x: g.x - 0.3, y: g.y - 0.3, w: 0.6, h: 0.6 })) {
          g.pega = true;
          if (g.cor === 'peca') this.pecas++;
          this.eventos.push({ e: g.cor === 'peca' ? 'peca' : 'bandeira', cor: g.cor, x: g.x, y: g.y, i: g.i });
        }
      }
      const portal = this.fase.portais.find(o => o.cor === p.cor);
      const antes = p.noPortal;
      p.noPortal = !!portal && p.noChao && Math.abs(p.x - portal.x) < 0.55 && Math.abs(p.y - portal.y) < 0.1;
      if (p.noPortal && !antes) this.eventos.push({ e: 'portal', id: p.id });
    }

    const semCoracao = this.personagens.some(p => p.morto && p.renascerEm === null);
    if (semCoracao) {
      this.fimEm ??= this.tempo + 1.6;
      if (this.tempo >= this.fimEm) { this.resultado = 'derrota'; this.eventos.push({ e: 'derrota' }); }
    } else if (this.personagens.every(p => p.noPortal)) {
      this.fimEm ??= this.tempo + 1.0;
      if (this.tempo >= this.fimEm) { this.resultado = 'vitoria'; this.eventos.push({ e: 'vitoria' }); }
    } else {
      this.fimEm = null;
    }
  }

  animacao(p) {
    if (p.morto) return 'derrota';
    if (this.resultado === 'vitoria' || (this.fimEm && p.noPortal)) return 'vitoria';
    if (!p.noChao) return p.vy < 0 ? 'pulo' : 'queda';
    if (p.empurrando) return 'empurrar';
    if (Math.abs(p.vx) > 0.4) return 'corrida';
    return 'idle';
  }

  efeitos(p) {
    return (this.tempo < p.invulAte ? FX.INVUL : 0) | (p.planando ? FX.PLANANDO : 0) |
           (p.mola ? FX.TEM_MOLA : 0) | (p.planador ? FX.TEM_PLANADOR : 0);
  }

  estado() {
    const r2 = n => Math.round(n * 1000) / 1000;
    return {
      tempo: r2(this.tempo),
      ch: this.personagens.map(p => [r2(p.x), r2(p.y), p.dir, this.animacao(p), p.noPortal ? 1 : 0, this.efeitos(p)]),
      cor: this.personagens.map(p => [this.coracoes[p.cor].n, this.coracoes[p.cor].max]),
      gemas: this.gemas.map(g => (g.pega ? 1 : 0)),
      alav: Object.values(this.alavancas).map(a => (a.ligada ? 1 : 0)),
      bot: Object.values(this.botoes).map(b => (b.pressionado ? 1 : 0)),
      plat: this.plataformas.map(p => [r2(p.px), r2(p.py)]),
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

// Recorta a fase para os times presentes.
export function filtrarFase(f, ativos) {
  const ids = ativos?.length ? ativos : f.personagens.map(p => p.id);
  const cores = new Set(ids.map(id => COR_DO_PERSONAGEM[id]));
  const livre = o => (o.cor && !cores.has(o.cor) ? { ...o, cor: null } : o);
  return {
    ...f,
    personagens: f.personagens.filter(p => ids.includes(p.id)),
    portais: f.portais.filter(p => cores.has(p.cor)),
    gemas: f.gemas.filter(g => g.cor === 'peca' || cores.has(g.cor)),
    alavancas: (f.alavancas || []).map(livre),
    botoes: (f.botoes || []).map(livre),
  };
}
